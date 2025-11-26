/**
 * EnhancedTimerCard Component
 * Timer display with turkey-inspired precision timing and three-state system
 *
 * Features:
 * - Three-state system: idle → running → paused → finished
 * - Precision timing with end_at timestamps
 * - Automatic tick updates every second
 * - Audio notification on completion
 * - Real-time sync via state manager
 * - Dark mode support
 */

import { useEffect, useState, memo } from 'react';
import { TimerStateManager } from '../../state/TimerStateManager';
import { useTimerCompletion } from '../../hooks/state/useTimerState';
import { playChimeIfEnabled } from '../../utils/audio/audioNotification';
import type { TimerState, TimerStatus } from '../../state/types';

interface EnhancedTimerCardProps {
  timer: TimerState;
  onStart?: (id: string, startedBy: string) => void;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
  onReset?: (id: string) => void;
  currentUserId: string;
  isUpdating?: boolean;
}

export const EnhancedTimerCard = memo(({
  timer,
  onStart,
  onPause,
  onResume,
  onReset,
  currentUserId,
  isUpdating,
}: EnhancedTimerCardProps) => {
  const [displayTime, setDisplayTime] = useState(timer.remainingSeconds);

  // Update display time when timer changes
  useEffect(() => {
    setDisplayTime(timer.remainingSeconds);
  }, [timer.remainingSeconds]);

  // Play audio when timer completes
  useTimerCompletion((completedTimer) => {
    if (completedTimer.id === timer.id) {
      playChimeIfEnabled();
    }
  });

  const formatTime = (seconds: number) => {
    return TimerStateManager.formatTime(seconds);
  };

  const getProgressPercentage = () => {
    return ((timer.defaultSeconds - displayTime) / timer.defaultSeconds) * 100;
  };

  const getStatusColor = (status: TimerStatus) => {
    switch (status) {
      case 'finished':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'running':
        return 'border-blue-500 bg-white dark:bg-gray-800';
      case 'paused':
        return 'border-yellow-500 bg-white dark:bg-gray-800';
      case 'idle':
      default:
        return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800';
    }
  };

  const getTimeColor = () => {
    if (timer.status === 'finished') {
      return 'text-green-600 dark:text-green-400';
    }
    if (displayTime < 60) {
      return 'text-red-600 dark:text-red-400';
    }
    return 'text-gray-900 dark:text-white';
  };

  const getProgressBarColor = () => {
    if (timer.status === 'finished') {
      return 'bg-green-600';
    }
    if (displayTime < 60) {
      return 'bg-red-600';
    }
    return 'bg-blue-600';
  };

  return (
    <div
      className={`rounded-lg border-2 p-4 transition-all ${getStatusColor(timer.status)}`}
    >
      {/* Timer Name */}
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <svg
          className="w-5 h-5 text-blue-600 dark:text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        {timer.name}
      </h3>

      {/* Time Display */}
      <div className="text-center mb-4">
        <div className={`text-5xl font-bold ${getTimeColor()}`}>
          {formatTime(displayTime)}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          of {formatTime(timer.defaultSeconds)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full transition-all duration-1000 ${getProgressBarColor()}`}
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>

      {/* Status */}
      <div className="text-sm text-center mb-4">
        {timer.status === 'finished' && (
          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Completed!
          </span>
        )}
        {timer.status === 'running' && (
          <span className="text-blue-600 dark:text-blue-400 font-medium">Running...</span>
        )}
        {timer.status === 'paused' && (
          <span className="text-yellow-600 dark:text-yellow-400 font-medium">Paused</span>
        )}
        {timer.status === 'idle' && (
          <span className="text-gray-600 dark:text-gray-400">Ready to start</span>
        )}
      </div>

      {/* Started By Info */}
      {timer.startedBy && timer.status !== 'idle' && (
        <div className="text-xs text-gray-500 dark:text-gray-500 text-center mb-3">
          Started by {timer.startedBy === currentUserId ? 'you' : 'someone'}
        </div>
      )}

      {/* Controls */}
      {timer.status !== 'finished' && (
        <div className="flex items-center gap-2">
          {timer.status === 'idle' && onStart && (
            <button
              onClick={() => onStart(timer.id, currentUserId)}
              disabled={isUpdating}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Start
            </button>
          )}

          {timer.status === 'running' && onPause && (
            <button
              onClick={() => onPause(timer.id)}
              disabled={isUpdating}
              className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
              </svg>
              Pause
            </button>
          )}

          {timer.status === 'paused' && onResume && (
            <button
              onClick={() => onResume(timer.id)}
              disabled={isUpdating}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
              </svg>
              Resume
            </button>
          )}

          {onReset && (
            <button
              onClick={() => onReset(timer.id)}
              disabled={isUpdating}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors disabled:opacity-50"
              aria-label="Reset timer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Precision Timing Info (for debugging) */}
      {timer.endAt && timer.status === 'running' && (
        <div className="text-xs text-gray-400 dark:text-gray-600 text-center mt-2">
          Ends at: {new Date(timer.endAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
});

EnhancedTimerCard.displayName = 'EnhancedTimerCard';
