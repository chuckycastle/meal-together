/**
 * WebSocketErrorNotification Component
 * Displays user-facing errors for WebSocket connection issues
 */

import { useEffect, useState } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';

export const WebSocketErrorNotification = () => {
  const { error, clearError, isConnected } = useWebSocket();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [error]);

  if (!isVisible || !error) {
    return null;
  }

  const handleDismiss = () => {
    clearError();
    setIsVisible(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
              Connection Error
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">
              {error.message}
            </p>

            {error.reconnectAttempts !== undefined && error.reconnectAttempts > 0 && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Reconnect attempt {error.reconnectAttempts}/5
              </p>
            )}

            {!isConnected && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                Some features may not work while disconnected
              </p>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WebSocketErrorNotification;
