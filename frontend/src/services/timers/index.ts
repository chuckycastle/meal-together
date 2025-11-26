// @ts-nocheck
/**
 * Unified Timer Service
 * Switches between Flask and Supabase timer implementations based on feature flags
 */

import { isFeatureEnabled } from '../../config/featureFlags';
import { flaskTimerService } from './flaskTimerService';
import { supabaseTimerService } from './supabaseTimerService';

export interface KitchenTimer {
  id: string;
  family_id: string;
  session_id?: string;
  name: string;
  default_seconds: number;
  remaining_seconds: number;
  status: 'idle' | 'running' | 'paused' | 'finished';
  assigned_to?: string;
  started_by?: string;
  end_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTimerData {
  name: string;
  duration: number;
}

export interface TimerService {
  createTimer(familyId: string, sessionId: string | undefined, data: CreateTimerData): Promise<KitchenTimer>;
  startTimer(timerId: string, userId: string): Promise<KitchenTimer>;
  pauseTimer(timerId: string, userId: string): Promise<KitchenTimer>;
  resumeTimer(timerId: string, userId: string): Promise<KitchenTimer>;
  cancelTimer(timerId: string): Promise<void>;
  getTimers(familyId: string): Promise<KitchenTimer[]>;
  deleteTimer(timerId: string): Promise<void>;
}

/**
 * Get the active timer service based on feature flags
 */
function getTimerService() {
  const useSupabaseTimers = isFeatureEnabled('supabase_timers');
  return useSupabaseTimers ? supabaseTimerService : flaskTimerService;
}

/**
 * Unified timer service that delegates to the appropriate implementation
 */
export const timerService = {
  async createTimer(familyId: string, sessionId: string | undefined, data: CreateTimerData): Promise<KitchenTimer> {
    const service = getTimerService();
    
    // Flask service expects numeric IDs
    if (service === flaskTimerService) {
      return (flaskTimerService as any).createTimer(
        parseInt(familyId),
        sessionId ? parseInt(sessionId) : 0,
        data
      );
    }
    
    return service.createTimer(familyId, sessionId, data);
  },

  async startTimer(timerId: string, userId: string): Promise<KitchenTimer> {
    const service = getTimerService();
    
    if (service === flaskTimerService) {
      throw new Error('Flask timers start immediately on creation');
    }
    
    return service.startTimer(timerId, userId);
  },

  async pauseTimer(timerId: string, userId: string): Promise<KitchenTimer> {
    const service = getTimerService();
    
    // Flask service uses familyId and sessionId which we'd need to track
    // For now, throw error for Flask
    if (service === flaskTimerService) {
      throw new Error('Flask pauseTimer requires familyId and sessionId - use via apiClient directly');
    }
    
    return service.pauseTimer(timerId, userId);
  },

  async resumeTimer(timerId: string, userId: string): Promise<KitchenTimer> {
    const service = getTimerService();
    
    if (service === flaskTimerService) {
      throw new Error('Flask resumeTimer requires familyId and sessionId - use via apiClient directly');
    }
    
    return service.resumeTimer(timerId, userId);
  },

  async cancelTimer(timerId: string): Promise<void> {
    return getTimerService().cancelTimer(timerId);
  },

  async getTimers(familyId: string): Promise<KitchenTimer[]> {
    return getTimerService().getTimers(familyId);
  },

  async deleteTimer(timerId: string): Promise<void> {
    return getTimerService().deleteTimer(timerId);
  },

  /**
   * Subscribe to real-time timer updates (Supabase only)
   */
  subscribeToTimers(
    familyId: string,
    callbacks: {
      onInsert?: (timer: KitchenTimer) => void;
      onUpdate?: (timer: KitchenTimer) => void;
      onDelete?: (timerId: string) => void;
    }
  ) {
    const useSupabaseTimers = isFeatureEnabled('supabase_timers');
    
    if (!useSupabaseTimers) {
      console.warn('Real-time timer subscriptions only available with Supabase timers');
      return () => {}; // No-op unsubscribe
    }
    
    return supabaseTimerService.subscribeToTimers(familyId, callbacks);
  },
};

// Export for direct access if needed
export { flaskTimerService, supabaseTimerService };
