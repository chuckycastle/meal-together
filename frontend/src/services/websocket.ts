/**
 * WebSocket Service
 * Handles Socket.IO connection and event management
 */

import { io, Socket } from 'socket.io-client';
import { throttle } from 'lodash-es';
import type {
  WebSocketShoppingItemAddedEvent,
  WebSocketShoppingItemUpdatedEvent,
  WebSocketShoppingItemDeletedEvent,
  WebSocketTimerEvent,
  WebSocketUserJoinedEvent,
  WebSocketUserLeftEvent,
  WebSocketTypingEvent,
} from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

export type WebSocketEventHandler<T = any> = (data: T) => void;

export class WebSocketService {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private lastToken: string | null = null;
  private lastFamilyId: number | null = null;
  private wasDisconnected = false;

  constructor() {
    this.connect();
  }

  private connect(): void {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(WS_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      const isReconnection = this.wasDisconnected;
      this.reconnectAttempts = 0;
      this.wasDisconnected = false;
      this.emit('connection_status', { connected: true, isReconnection });

      // Auto-reauth and auto-rejoin on reconnection
      if (isReconnection && this.lastToken) {
        console.log('Auto-authenticating after reconnection');
        this.socket?.emit('authenticate', { token: this.lastToken });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.wasDisconnected = true;
      this.emit('connection_status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      this.emit('connection_error', { error, attempts: this.reconnectAttempts });
    });

    // Server events
    this.socket.on('connected', (data) => {
      console.log('Server confirmed connection:', data);
    });

    this.socket.on('authenticated', (data) => {
      console.log('Authenticated:', data);
      this.emit('authenticated', data);

      // Auto-rejoin family room after authentication
      if (this.lastFamilyId !== null) {
        console.log('Auto-rejoining family after reconnection');
        this.socket?.emit('join_family', { family_id: this.lastFamilyId });
      }
    });

    this.socket.on('joined_family', (data) => {
      console.log('Joined family:', data);
      const isRejoining = data.family_id === this.lastFamilyId;
      this.emit('joined_family', { ...data, isRejoining });
    });

    this.socket.on('error', (data) => {
      console.error('WebSocket error:', data);
      this.emit('error', data);
    });

    // Shopping list events
    this.socket.on('shopping_item_added', (data: WebSocketShoppingItemAddedEvent) => {
      this.emit('shopping_item_added', data);
    });

    this.socket.on('shopping_item_updated', (data: WebSocketShoppingItemUpdatedEvent) => {
      this.emit('shopping_item_updated', data);
    });

    this.socket.on('shopping_item_deleted', (data: WebSocketShoppingItemDeletedEvent) => {
      this.emit('shopping_item_deleted', data);
    });

    this.socket.on('shopping_items_bulk_added', (data) => {
      this.emit('shopping_items_bulk_added', data);
    });

    // Timer events
    this.socket.on('timer_started', (data: WebSocketTimerEvent) => {
      this.emit('timer_started', data);
    });

    this.socket.on('timer_paused', (data: WebSocketTimerEvent) => {
      this.emit('timer_paused', data);
    });

    this.socket.on('timer_resumed', (data: WebSocketTimerEvent) => {
      this.emit('timer_resumed', data);
    });

    this.socket.on('timer_completed', (data: WebSocketTimerEvent) => {
      this.emit('timer_completed', data);
    });

    this.socket.on('timer_cancelled', (data: WebSocketTimerEvent) => {
      this.emit('timer_cancelled', data);
    });

    // User presence events
    this.socket.on('user_joined', (data: WebSocketUserJoinedEvent) => {
      this.emit('user_joined', data);
    });

    this.socket.on('user_left', (data: WebSocketUserLeftEvent) => {
      this.emit('user_left', data);
    });

    this.socket.on('user_typing', (data: WebSocketTypingEvent) => {
      this.emit('user_typing', data);
    });

    // Cooking session events
    this.socket.on('cooking_session_started', (data) => {
      this.emit('cooking_session_started', data);
    });

    this.socket.on('cooking_session_completed', (data) => {
      this.emit('cooking_session_completed', data);
    });

    // Shopping list events
    this.socket.on('shopping_list_created', (data) => {
      this.emit('shopping_list_created', data);
    });

    this.socket.on('shopping_list_updated', (data) => {
      this.emit('shopping_list_updated', data);
    });

    this.socket.on('shopping_list_deleted', (data) => {
      this.emit('shopping_list_deleted', data);
    });
  }

  authenticate(token: string): void {
    if (!this.socket) return;
    this.lastToken = token; // Store for auto-reauth
    this.socket.emit('authenticate', { token });
  }

  joinFamily(familyId: number): void {
    if (!this.socket) return;
    this.lastFamilyId = familyId; // Store for auto-rejoin
    this.socket.emit('join_family', { family_id: familyId });
  }

  leaveFamily(familyId: number): void {
    if (!this.socket) return;
    this.lastFamilyId = null; // Clear stored family ID
    this.socket.emit('leave_family', { family_id: familyId });
  }

  // Throttled typing indicator - max once per 500ms
  sendTyping = throttle((familyId: number, location: string, itemId?: number): void => {
    if (!this.socket) return;
    this.socket.emit('typing', { family_id: familyId, location, item_id: itemId });
  }, 500);

  requestSync(familyId: number): void {
    if (!this.socket) return;
    this.socket.emit('request_sync', { family_id: familyId });
  }

  ping(): void {
    if (!this.socket) return;
    this.socket.emit('ping');
  }

  on<T = any>(event: string, handler: WebSocketEventHandler<T>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)!.add(handler);

    // Return cleanup function
    return () => this.off(event, handler);
  }

  off<T = any>(event: string, handler: WebSocketEventHandler<T>): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private emit<T = any>(event: string, data: T): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  connectSocket(): void {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.connect();
  }

  disconnect(): void {
    this.lastToken = null;
    this.lastFamilyId = null;
    this.socket?.disconnect();
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
