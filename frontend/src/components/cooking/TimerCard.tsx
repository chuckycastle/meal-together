/**
 * TimerCard Component
 * Individual timer display with controls
 */

import { useState, useEffect, memo } from 'react';
import type { ActiveTimer } from '../../types';

interface TimerCardProps {
  timer: ActiveTimer;
  onStart: (timerId: number) => void;
  onPause: (timerId: number) => void;
  onResume: (timerId: number) => void;
  onCancel: (timerId: number) => void;
  isUpdating?: boolean;
}

export const TimerCard = memo(({
  timer,
  onStart,
  onPause,
  onResume,
  onCancel,
  isUpdating,
}: TimerCardProps) => {
  const [localRemaining, setLocalRemaining] = useState(timer.remaining_time);

  // Update local countdown
  useEffect(() => {
    if (!timer.is_running) {
      setLocalRemaining(timer.remaining_time);
      return;
    }

    const interval = setInterval(() => {
      setLocalRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.is_running, timer.remaining_time]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return ((timer.duration - localRemaining) / timer.duration) * 100;
  };

  const isCompleted = timer.is_completed;
  const isRunning = timer.is_running;
  const isPaused = timer.is_paused;

  return (
    <div
      className={`bg-white rounded-lg border-2 p-4 transition-all ${
        isCompleted
          ? 'border-green-500 bg-green-50'
          : isRunning
          ? 'border-blue-500'
          : isPaused
          ? 'border-yellow-500'
          : 'border-gray-200'
      }`}
    >
      {/* Timer Name */}
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div
          className={`text-5xl font-bold ${
            isCompleted
              ? 'text-green-600'
              : localRemaining < 60
              ? 'text-red-600'
              : 'text-gray-900'
          }`}
        >
          {formatTime(localRemaining)}
        </div>
        <div className="text-sm text-gray-800 mt-1">
          of {formatTime(timer.duration)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full transition-all duration-1000 ${
            isCompleted
              ? 'bg-green-600'
              : localRemaining < 60
              ? 'bg-red-600'
              : 'bg-blue-600'
          }`}
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>

      {/* Status */}
      <div className="text-sm text-center mb-4">
        {isCompleted && (
          <span className="inline-flex items-center gap-1 text-green-600 font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Completed!
          </span>
        )}
        {!isCompleted && isRunning && (
          <span className="text-blue-600 font-medium">Running...</span>
        )}
        {!isCompleted && isPaused && (
          <span className="text-yellow-600 font-medium">Paused</span>
        )}
        {!isCompleted && !isRunning && !isPaused && (
          <span className="text-gray-800">Ready to start</span>
        )}
      </div>

      {/* Controls */}
      {!isCompleted && (
        <div className="flex items-center gap-2">
          {!isRunning && !isPaused && (
            <button
              onClick={() => onStart(timer.id)}
              disabled={isUpdating}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

          {isRunning && (
            <button
              onClick={() => onPause(timer.id)}
              disabled={isUpdating}
              className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
              </svg>
              Pause
            </button>
          )}

          {isPaused && (
            <button
              onClick={() => onResume(timer.id)}
              disabled={isUpdating}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

          <button
            onClick={() => onCancel(timer.id)}
            disabled={isUpdating}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            aria-label="Cancel timer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
});

TimerCard.displayName = 'TimerCard';
