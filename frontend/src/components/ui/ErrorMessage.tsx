/**
 * ErrorMessage Component
 * Displays error messages with retry option
 */

import { XCircle } from 'lucide-react';
import type { ApiError } from '../../types';

interface ErrorMessageProps {
  error?: Error | ApiError | string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  message,
  onRetry,
  className = '',
}) => {
  const getErrorMessage = (): string => {
    if (message) return message;
    if (typeof error === 'string') return error;
    if (error && 'error' in error) return error.error;
    if (error && 'message' in error) return error.message;
    return 'An error occurred';
  };

  return (
    <div
      className={`rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <XCircle className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
        <div className="flex-1">
          <p className="text-sm font-medium text-red-800 dark:text-red-200">
            {getErrorMessage()}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-sm font-medium text-red-600 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;
