// @ts-nocheck
/**
 * Supabase Timer Service
 * New timer implementation using Supabase kitchen_timers table and Realtime
 */

import { supabase } from '../../lib/supabase';
import { userService } from '../user/userService';

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

export interface CreateTimerRequest {
  family_id: string;
  session_id?: string;
  name: string;
  default_seconds: number;
}

export const supabaseTimerService = {
  async createTimer(familyId: string, sessionId: string | undefined, data: { name: string; duration: number }): Promise<KitchenTimer> {
    const { data: timer, error } = await supabase
      .from('kitchen_timers')
      .insert({
        family_id: familyId,
        session_id: sessionId,
        name: data.name,
        default_seconds: data.duration,
        remaining_seconds: data.duration,
        status: 'idle',
      })
      .select()
      .single();

    if (error) throw error;
    return timer as KitchenTimer;
  },

  async startTimer(timerId: string, userId: string): Promise<KitchenTimer> {
    // Ensure we're using the internal user ID from public.users table
    // The userId should already be the internal ID if auth service is configured correctly,
    // but we fetch it again to be defensive against any auth UUID being passed
    const internalUserId = await userService.getInternalUserId();

    // Use the transition_timer_state function for safe state transitions
    const { data, error } = await supabase.rpc('transition_timer_state', {
      timer_id: timerId,
      new_status: 'running',
      user_id: internalUserId, // Use validated internal ID
    });

    if (error) throw error;
    return data as KitchenTimer;
  },

  async pauseTimer(timerId: string, userId: string): Promise<KitchenTimer> {
    const internalUserId = await userService.getInternalUserId();

    const { data, error } = await supabase.rpc('transition_timer_state', {
      timer_id: timerId,
      new_status: 'paused',
      user_id: internalUserId,
    });

    if (error) throw error;
    return data as KitchenTimer;
  },

  async resumeTimer(timerId: string, userId: string): Promise<KitchenTimer> {
    const internalUserId = await userService.getInternalUserId();

    const { data, error } = await supabase.rpc('transition_timer_state', {
      timer_id: timerId,
      new_status: 'running',
      user_id: internalUserId,
    });

    if (error) throw error;
    return data as KitchenTimer;
  },

  async resetTimer(timerId: string, userId: string): Promise<KitchenTimer> {
    const internalUserId = await userService.getInternalUserId();

    const { data, error } = await supabase.rpc('transition_timer_state', {
      timer_id: timerId,
      new_status: 'idle',
      user_id: internalUserId,
    });

    if (error) throw error;
    return data as KitchenTimer;
  },

  async cancelTimer(timerId: string): Promise<void> {
    const { error } = await supabase
      .from('kitchen_timers')
      .delete()
      .eq('id', timerId);

    if (error) throw error;
  },

  async getTimers(familyId: string): Promise<KitchenTimer[]> {
    const { data, error } = await supabase
      .from('kitchen_timers')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as KitchenTimer[];
  },

  async getTimer(timerId: string): Promise<KitchenTimer> {
    const { data, error } = await supabase
      .from('kitchen_timers')
      .select('*')
      .eq('id', timerId)
      .single();

    if (error) throw error;
    return data as KitchenTimer;
  },

  async deleteTimer(timerId: string): Promise<void> {
    const { error } = await supabase
      .from('kitchen_timers')
      .delete()
      .eq('id', timerId);

    if (error) throw error;
  },

  /**
   * Subscribe to timer changes for a family using Supabase Realtime
   */
  subscribeToTimers(
    familyId: string,
    callbacks: {
      onInsert?: (timer: KitchenTimer) => void;
      onUpdate?: (timer: KitchenTimer) => void;
      onDelete?: (timerId: string) => void;
    }
  ) {
    const channel = supabase
      .channel(`kitchen_timers:${familyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kitchen_timers',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          if (callbacks.onInsert) {
            callbacks.onInsert(payload.new as KitchenTimer);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kitchen_timers',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          if (callbacks.onUpdate) {
            callbacks.onUpdate(payload.new as KitchenTimer);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'kitchen_timers',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          if (callbacks.onDelete && payload.old) {
            callbacks.onDelete((payload.old as KitchenTimer).id);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  },
};
