/**
 * TimerDemoPage - Demonstration of Enhanced Timer System
 * Showcases turkey-inspired three-state timer system with precision timing
 *
 * Features:
 * - Client-side timer state management
 * - Precision timing with end_at timestamps
 * - Audio notifications
 * - Three-state system (idle → running → paused → finished)
 * - Auto-tick updates every second
 */

import { useState, useEffect } from 'react';
import { Layout } from '../../components/layout/Layout';
import { EnhancedTimerCard } from '../../components/cooking/EnhancedTimerCard';
import { useTimerState } from '../../hooks/state/useTimerState';
import type { TimerState } from '../../state/types';
import { useAuth } from '../../contexts/AuthContext';

export const TimerDemoPage = () => {
  const { user } = useAuth();
  const {
    getAllTimers,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    addTimer,
    removeTimer,
  } = useTimerState();

  const [timers, setTimers] = useState<TimerState[]>([]);
  const [newTimerName, setNewTimerName] = useState('');
  const [newTimerMinutes, setNewTimerMinutes] = useState(5);

  // Subscribe to timer state changes
  useEffect(() => {
    const updateTimers = () => {
      setTimers(getAllTimers());
    };

    // Initial load
    updateTimers();

    // Update every second to refresh display
    const interval = setInterval(updateTimers, 100);

    return () => clearInterval(interval);
  }, [getAllTimers]);

  const handleAddTimer = () => {
    if (!newTimerName.trim()) return;

    const newTimer: TimerState = {
      id: `timer-${Date.now()}`,
      cookingSessionId: 'demo-session',
      name: newTimerName,
      defaultSeconds: newTimerMinutes * 60,
      remainingSeconds: newTimerMinutes * 60,
      status: 'idle',
      endAt: null,
      startedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addTimer(newTimer);
    setNewTimerName('');
    setNewTimerMinutes(5);
  };

  const handleStartTimer = (id: string, startedBy: string) => {
    startTimer(id, startedBy);
  };

  const handlePauseTimer = (id: string) => {
    pauseTimer(id);
  };

  const handleResumeTimer = (id: string) => {
    resumeTimer(id);
  };

  const handleResetTimer = (id: string) => {
    resetTimer(id);
  };

  const handleRemoveTimer = (id: string) => {
    if (window.confirm('Remove this timer?')) {
      removeTimer(id);
    }
  };

  const runningCount = timers.filter(t => t.status === 'running').length;
  const pausedCount = timers.filter(t => t.status === 'paused').length;
  const finishedCount = timers.filter(t => t.status === 'finished').length;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-8 px-4 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Enhanced Timer System Demo
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Demonstration of turkey-inspired precision timer system with three-state management
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {timers.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Timers</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-900 p-4">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {runningCount}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Running</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-900 p-4">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {pausedCount}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Paused</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-900 p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {finishedCount}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Finished</div>
          </div>
        </div>

        {/* Add Timer Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Add New Timer
          </h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={newTimerName}
              onChange={(e) => setNewTimerName(e.target.value)}
              placeholder="Timer name (e.g., Boil pasta)"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddTimer();
                }
              }}
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={newTimerMinutes}
                onChange={(e) => setNewTimerMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="120"
                className="w-20 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <span className="text-gray-600 dark:text-gray-400 text-sm whitespace-nowrap">
                minutes
              </span>
            </div>
            <button
              onClick={handleAddTimer}
              disabled={!newTimerName.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Add Timer
            </button>
          </div>
        </div>

        {/* Timer Grid */}
        {timers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4"
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Timers Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Add a timer above to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {timers.map((timer) => (
              <div key={timer.id} className="relative">
                <EnhancedTimerCard
                  timer={timer}
                  onStart={handleStartTimer}
                  onPause={handlePauseTimer}
                  onResume={handleResumeTimer}
                  onReset={handleResetTimer}
                  currentUserId={user?.id.toString() || 'demo-user'}
                />
                <button
                  onClick={() => handleRemoveTimer(timer.id)}
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 transition-colors shadow-lg"
                  aria-label="Remove timer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Info Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-400 mb-2">
            About This Demo
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Three-state system: idle → running → paused → finished</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Precision timing using end_at timestamps for accuracy</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Audio notifications when timers complete (check Settings to enable)</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Client-side state management with observer pattern</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Automatic tick updates every second for running timers</span>
            </li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default TimerDemoPage;
