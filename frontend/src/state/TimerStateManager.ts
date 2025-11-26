/**
 * TimerStateManager - Timer-Specific State Management
 * Port of turkey project's timer logic with three-state system
 *
 * Key Features (from turkey):
 * - Three-state system: idle → running → paused → finished
 * - Precision timing with end_at timestamps
 * - Automatic tick updates every second
 * - State transition validation
 * - Audio notification on completion
 */

import { TaskStateManager } from './TaskStateManager';
import type { TimerState } from './types';

export class TimerStateManager extends TaskStateManager<TimerState> {
  private tickIntervals: Map<string, number>;
  private completionCallbacks: Set<(timer: TimerState) => void>;

  constructor() {
    super();
    this.tickIntervals = new Map();
    this.completionCallbacks = new Set();
  }

  /**
   * Start a timer (idle → running)
   * Calculates end_at timestamp for precision (turkey pattern)
   * @param id - Timer ID
   * @param startedBy - User ID who started the timer
   */
  startTimer(id: string, startedBy: string): TimerState | null {
    const timer = this.get(id);
    if (!timer) return null;

    // Validate state transition
    if (timer.status !== 'idle' && timer.status !== 'paused') {
      console.warn(`Cannot start timer ${id}: invalid status ${timer.status}`);
      return null;
    }

    // Calculate precise end time (turkey pattern)
    const now = new Date();
    const endAt = new Date(now.getTime() + timer.remainingSeconds * 1000);

    const updatedTimer: TimerState = {
      ...timer,
      status: 'running',
      endAt,
      startedBy,
      updatedAt: now,
    };

    this.set(id, updatedTimer);
    this.startTicking(id);

    return updatedTimer;
  }

  /**
   * Pause a running timer
   * @param id - Timer ID
   */
  pauseTimer(id: string): TimerState | null {
    const timer = this.get(id);
    if (!timer) return null;

    if (timer.status !== 'running') {
      console.warn(`Cannot pause timer ${id}: invalid status ${timer.status}`);
      return null;
    }

    // Calculate remaining seconds from end_at (turkey pattern)
    // Use Math.floor for consistency with tick loop to avoid precision drift
    const now = new Date();
    const remainingMs = timer.endAt ? timer.endAt.getTime() - now.getTime() : 0;
    const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

    const updatedTimer: TimerState = {
      ...timer,
      status: 'paused',
      remainingSeconds,
      endAt: null,
      updatedAt: now,
    };

    this.set(id, updatedTimer);
    this.stopTicking(id);

    return updatedTimer;
  }

  /**
   * Resume a paused timer
   * @param id - Timer ID
   */
  resumeTimer(id: string): TimerState | null {
    const timer = this.get(id);
    if (!timer) return null;

    if (timer.status !== 'paused') {
      console.warn(`Cannot resume timer ${id}: invalid status ${timer.status}`);
      return null;
    }

    // Recalculate end_at from remaining seconds
    const now = new Date();
    const endAt = new Date(now.getTime() + timer.remainingSeconds * 1000);

    const updatedTimer: TimerState = {
      ...timer,
      status: 'running',
      endAt,
      updatedAt: now,
    };

    this.set(id, updatedTimer);
    this.startTicking(id);

    return updatedTimer;
  }

  /**
   * Reset timer to idle state
   * @param id - Timer ID
   */
  resetTimer(id: string): TimerState | null {
    const timer = this.get(id);
    if (!timer) return null;

    const updatedTimer: TimerState = {
      ...timer,
      status: 'idle',
      remainingSeconds: timer.defaultSeconds,
      endAt: null,
      updatedAt: new Date(),
    };

    this.set(id, updatedTimer);
    this.stopTicking(id);

    return updatedTimer;
  }

  /**
   * Mark timer as finished
   * @param id - Timer ID
   * @private
   */
  private finishTimer(id: string): void {
    const timer = this.get(id);
    if (!timer) return;

    const updatedTimer: TimerState = {
      ...timer,
      status: 'finished',
      remainingSeconds: 0,
      endAt: null,
      updatedAt: new Date(),
    };

    this.set(id, updatedTimer);
    this.stopTicking(id);

    // Notify completion callbacks
    this.completionCallbacks.forEach(callback => {
      callback(updatedTimer);
    });
  }

  /**
   * Start tick loop for a timer (turkey pattern)
   * Updates remaining time every second
   * @param id - Timer ID
   * @private
   */
  private startTicking(id: string): void {
    // Clear existing interval if any
    this.stopTicking(id);

    const interval = setInterval(() => {
      const timer = this.get(id);
      if (!timer || timer.status !== 'running' || !timer.endAt) {
        this.stopTicking(id);
        return;
      }

      const now = new Date();
      const remainingMs = timer.endAt.getTime() - now.getTime();
      const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));

      if (remainingSeconds === 0) {
        // Timer completed
        this.finishTimer(id);
      } else {
        // Update remaining time
        const updatedTimer: TimerState = {
          ...timer,
          remainingSeconds,
          updatedAt: now,
        };
        this.set(id, updatedTimer);
      }
    }, 1000); // Tick every second

    this.tickIntervals.set(id, interval);
  }

  /**
   * Stop tick loop for a timer
   * @param id - Timer ID
   * @private
   */
  private stopTicking(id: string): void {
    const interval = this.tickIntervals.get(id);
    if (interval) {
      clearInterval(interval);
      this.tickIntervals.delete(id);
    }
  }

  /**
   * Subscribe to timer completion events
   * @param callback - Function to call when timer finishes
   * @returns Unsubscribe function
   */
  onTimerComplete(callback: (timer: TimerState) => void): () => void {
    this.completionCallbacks.add(callback);
    return () => {
      this.completionCallbacks.delete(callback);
    };
  }

  /**
   * Get all running timers
   * @returns Array of running timers
   */
  getRunningTimers(): TimerState[] {
    return this.filter(timer => timer.status === 'running');
  }

  /**
   * Get all finished timers
   * @returns Array of finished timers
   */
  getFinishedTimers(): TimerState[] {
    return this.filter(timer => timer.status === 'finished');
  }

  /**
   * Get timers for a specific cooking session
   * @param sessionId - Cooking session ID
   * @returns Array of timers for the session
   */
  getTimersBySession(sessionId: string): TimerState[] {
    return this.filter(timer => timer.cookingSessionId === sessionId);
  }

  /**
   * Format remaining time as MM:SS (turkey pattern)
   * @param seconds - Seconds to format
   * @returns Formatted time string
   */
  static formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Cleanup all intervals on destroy
   */
  destroy(): void {
    this.tickIntervals.forEach(interval => clearInterval(interval));
    this.tickIntervals.clear();
    this.completionCallbacks.clear();
    this.clear();
  }
}

// Singleton instance
export const timerStateManager = new TimerStateManager();
