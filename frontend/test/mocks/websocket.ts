/**
 * Mock WebSocket service for testing
 */

import { vi } from 'vitest';

export const mockWebSocketService = {
  connectSocket: vi.fn(),
  disconnect: vi.fn(),
  authenticate: vi.fn(),
  joinFamily: vi.fn(),
  leaveFamily: vi.fn(),
  on: vi.fn((event, handler) => {
    // Return an unsubscribe function
    return vi.fn();
  }),
  off: vi.fn(),
  emit: vi.fn(),
  sendTyping: vi.fn(),
  requestSync: vi.fn(),
  isConnected: vi.fn().mockReturnValue(true),
};

// Mock the WebSocket service module
vi.mock('../../src/services/websocket', () => ({
  websocketService: mockWebSocketService,
  WebSocketEventHandler: vi.fn(),
}));
