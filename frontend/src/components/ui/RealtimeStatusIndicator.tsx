/**
 * RealtimeStatusIndicator Component
 * Displays connection status for Supabase Realtime
 */

import { useEffect, useState } from 'react';
import { useRealtime } from '../../contexts/RealtimeContext';
import { isFeatureEnabled } from '../../config/featureFlags';

export const RealtimeStatusIndicator = () => {
  const { connectionInfo } = useRealtime();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Only show if Supabase Realtime features are enabled
  const hasRealtimeFeatures =
    isFeatureEnabled('supabase_timers') || isFeatureEnabled('supabase_shopping');

  useEffect(() => {
    if (!hasRealtimeFeatures) {
      setIsVisible(false);
      return;
    }

    // Show indicator for errors or when disconnected
    if (
      (connectionInfo.status === 'error' || connectionInfo.status === 'disconnected') &&
      !isDismissed
    ) {
      setIsVisible(true);
    } else if (connectionInfo.status === 'connected') {
      setIsVisible(false);
      setIsDismissed(false); // Reset dismiss state when reconnected
    }
  }, [connectionInfo.status, isDismissed, hasRealtimeFeatures]);

  // Don't render if feature is disabled
  if (!hasRealtimeFeatures) {
    return null;
  }

  if (!isVisible) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
  };

  const getStatusColor = () => {
    switch (connectionInfo.status) {
      case 'connecting':
        return 'yellow';
      case 'connected':
        return 'green';
      case 'error':
        return 'red';
      case 'disconnected':
        return 'gray';
      default:
        return 'gray';
    }
  };

  const getStatusMessage = () => {
    switch (connectionInfo.status) {
      case 'connecting':
        return 'Connecting to real-time updates...';
      case 'error':
        return connectionInfo.error?.message || 'Failed to connect to real-time updates';
      case 'disconnected':
        return 'Disconnected from real-time updates';
      default:
        return 'Connection status unknown';
    }
  };

  const color = getStatusColor();
  const message = getStatusMessage();

  // Color classes based on status
  const colorClasses = {
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/30',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: 'text-yellow-600 dark:text-yellow-400',
      title: 'text-yellow-800 dark:text-yellow-200',
      text: 'text-yellow-700 dark:text-yellow-300',
      subtext: 'text-yellow-600 dark:text-yellow-400',
      button: 'text-yellow-500 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300',
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/30',
      border: 'border-red-200 dark:border-red-800',
      icon: 'text-red-600 dark:text-red-400',
      title: 'text-red-800 dark:text-red-200',
      text: 'text-red-700 dark:text-red-300',
      subtext: 'text-red-600 dark:text-red-400',
      button: 'text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300',
    },
    gray: {
      bg: 'bg-gray-50 dark:bg-gray-900/30',
      border: 'border-gray-200 dark:border-gray-800',
      icon: 'text-gray-600 dark:text-gray-400',
      title: 'text-gray-800 dark:text-gray-200',
      text: 'text-gray-700 dark:text-gray-300',
      subtext: 'text-gray-600 dark:text-gray-400',
      button: 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/30',
      border: 'border-green-200 dark:border-green-800',
      icon: 'text-green-600 dark:text-green-400',
      title: 'text-green-800 dark:text-green-200',
      text: 'text-green-700 dark:text-green-300',
      subtext: 'text-green-600 dark:text-green-400',
      button: 'text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300',
    },
  };

  const classes = colorClasses[color];

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-md">
      <div className={`${classes.bg} border ${classes.border} rounded-lg p-4 shadow-lg`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            {connectionInfo.status === 'error' ? (
              <svg
                className={`w-5 h-5 ${classes.icon}`}
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
            ) : connectionInfo.status === 'connecting' ? (
              <svg
                className={`w-5 h-5 ${classes.icon} animate-spin`}
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className={`w-5 h-5 ${classes.icon}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>

          <div className="flex-1">
            <h3 className={`text-sm font-medium ${classes.title} mb-1`}>
              Real-time Connection
            </h3>
            <p className={`text-sm ${classes.text}`}>{message}</p>

            {connectionInfo.reconnectAttempts !== undefined &&
              connectionInfo.reconnectAttempts > 0 && (
                <p className={`text-xs ${classes.subtext} mt-1`}>
                  Reconnect attempt {connectionInfo.reconnectAttempts}
                </p>
              )}

            {connectionInfo.status !== 'connected' && (
              <p className={`text-xs ${classes.subtext} mt-2`}>
                Real-time features may not work while disconnected
              </p>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className={`flex-shrink-0 ${classes.button}`}
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RealtimeStatusIndicator;
