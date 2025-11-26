/**
 * useAudioNotification - React Hook for Audio Notifications
 * Port of turkey project's audio notification pattern
 *
 * Features:
 * - Automatic chime on timer completion
 * - User preference management
 * - Test playback for settings UI
 */

import { useState, useEffect, useCallback } from 'react';
import {
  playChimeIfEnabled,
  testAudioNotification,
  isAudioEnabled,
  setAudioEnabled,
} from '../../utils/audio/audioNotification';
import type { TimerState } from '../../state/types';

export interface UseAudioNotificationResult {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  playTestChime: () => Promise<void>;
}

/**
 * Hook for managing audio notification preferences
 * @returns Audio state and controls
 */
export function useAudioNotification(): UseAudioNotificationResult {
  const [enabled, setEnabledState] = useState<boolean>(() => isAudioEnabled());

  // Update preference and localStorage
  const setEnabled = useCallback((newEnabled: boolean) => {
    setEnabledState(newEnabled);
    setAudioEnabled(newEnabled);
  }, []);

  // Play test chime (for settings UI)
  const playTestChime = useCallback(async () => {
    await testAudioNotification();
  }, []);

  return {
    enabled,
    setEnabled,
    playTestChime,
  };
}

/**
 * Hook to play chime when timer completes
 * @param timer - Timer state to monitor
 */
export function useTimerCompletionChime(timer: TimerState | null): void {
  useEffect(() => {
    if (timer && timer.status === 'finished') {
      playChimeIfEnabled();
    }
  }, [timer?.status]);
}

/**
 * Hook to play chime when any timer in a list completes
 * @param timers - Array of timers to monitor
 */
export function useTimerListCompletionChime(timers: TimerState[]): void {
  useEffect(() => {
    const finishedTimers = timers.filter(t => t.status === 'finished');

    if (finishedTimers.length > 0) {
      // Play chime once for all finished timers
      playChimeIfEnabled();
    }
  }, [timers.map(t => t.status).join(',')]);
}
