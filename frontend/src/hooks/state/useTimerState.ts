/**
 * useTimerState - React Hook for Timer State Management
 * Port of turkey project's timer state with React integration
 *
 * Features:
 * - Automatic re-rendering on state changes
 * - Cleanup on unmount
 * - Timer completion notifications
 * - Helper methods for timer operations
 */

import { useState, useEffect, useCallback } from 'react';
import { timerStateManager, TimerStateManager } from '../../state/TimerStateManager';
import type { TimerState } from '../../state/types';

export interface UseTimerStateResult {
  timers: Map<string, TimerState>;
  getTimer: (id: string) => TimerState | undefined;
  getAllTimers: () => TimerState[];
  getRunningTimers: () => TimerState[];
  getFinishedTimers: () => TimerState[];
  getTimersBySession: (sessionId: string) => TimerState[];
  startTimer: (id: string, startedBy: string) => TimerState | null;
  pauseTimer: (id: string) => TimerState | null;
  resumeTimer: (id: string) => TimerState | null;
  resetTimer: (id: string) => TimerState | null;
  addTimer: (timer: TimerState) => void;
  removeTimer: (id: string) => void;
  formatTime: (seconds: number) => string;
}

export function useTimerState(): UseTimerStateResult {
  // Local state synchronized with state manager
  const [timers, setTimers] = useState<Map<string, TimerState>>(
    timerStateManager.getAllAsMap()
  );

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = timerStateManager.subscribe((newState) => {
      setTimers(new Map(newState));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Timer operations
  const getTimer = useCallback((id: string) => {
    return timerStateManager.get(id);
  }, []);

  const getAllTimers = useCallback(() => {
    return timerStateManager.getAll();
  }, []);

  const getRunningTimers = useCallback(() => {
    return timerStateManager.getRunningTimers();
  }, []);

  const getFinishedTimers = useCallback(() => {
    return timerStateManager.getFinishedTimers();
  }, []);

  const getTimersBySession = useCallback((sessionId: string) => {
    return timerStateManager.getTimersBySession(sessionId);
  }, []);

  const startTimer = useCallback((id: string, startedBy: string) => {
    return timerStateManager.startTimer(id, startedBy);
  }, []);

  const pauseTimer = useCallback((id: string) => {
    return timerStateManager.pauseTimer(id);
  }, []);

  const resumeTimer = useCallback((id: string) => {
    return timerStateManager.resumeTimer(id);
  }, []);

  const resetTimer = useCallback((id: string) => {
    return timerStateManager.resetTimer(id);
  }, []);

  const addTimer = useCallback((timer: TimerState) => {
    timerStateManager.set(timer.id, timer);
  }, []);

  const removeTimer = useCallback((id: string) => {
    timerStateManager.delete(id);
  }, []);

  const formatTime = useCallback((seconds: number) => {
    return TimerStateManager.formatTime(seconds);
  }, []);

  return {
    timers,
    getTimer,
    getAllTimers,
    getRunningTimers,
    getFinishedTimers,
    getTimersBySession,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    addTimer,
    removeTimer,
    formatTime,
  };
}

/**
 * useTimerCompletion - Hook for timer completion events
 * @param callback - Function to call when timer finishes
 */
export function useTimerCompletion(
  callback: (timer: TimerState) => void
): void {
  useEffect(() => {
    const unsubscribe = timerStateManager.onTimerComplete(callback);
    return () => {
      unsubscribe();
    };
  }, [callback]);
}
