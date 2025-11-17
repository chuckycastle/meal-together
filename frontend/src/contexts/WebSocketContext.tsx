/**
 * WebSocket Context
 * Provides WebSocket connection and methods to components
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { websocketService } from '../services/websocket';
import type { WebSocketEventHandler } from '../services/websocket';

interface WebSocketContextValue {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  authenticate: (token: string) => void;
  joinFamily: (familyId: number) => void;
  leaveFamily: (familyId: number) => void;
  on: <T = any>(event: string, handler: WebSocketEventHandler<T>) => () => void;
  off: <T = any>(event: string, handler: WebSocketEventHandler<T>) => void;
  sendTyping: (familyId: number, location: string, itemId?: number) => void;
  requestSync: (familyId: number) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(websocketService.isConnected());

  useEffect(() => {
    // Listen for connection status changes
    const unsubscribeStatus = websocketService.on('connection_status', (data: { connected: boolean }) => {
      setIsConnected(data.connected);
    });

    // Auto-connect on mount
    if (!websocketService.isConnected()) {
      websocketService.connectSocket();
    }

    // Cleanup on unmount
    return () => {
      unsubscribeStatus();
    };
  }, []);

  const value: WebSocketContextValue = {
    isConnected,
    connect: () => websocketService.connectSocket(),
    disconnect: () => websocketService.disconnect(),
    authenticate: (token: string) => websocketService.authenticate(token),
    joinFamily: (familyId: number) => websocketService.joinFamily(familyId),
    leaveFamily: (familyId: number) => websocketService.leaveFamily(familyId),
    on: <T = any>(event: string, handler: WebSocketEventHandler<T>) => websocketService.on(event, handler),
    off: <T = any>(event: string, handler: WebSocketEventHandler<T>) => websocketService.off(event, handler),
    sendTyping: (familyId: number, location: string, itemId?: number) =>
      websocketService.sendTyping(familyId, location, itemId),
    requestSync: (familyId: number) => websocketService.requestSync(familyId),
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export const useWebSocket = (): WebSocketContextValue => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};

export default WebSocketContext;
