/**
 * Flask Timer Service
 * Original timer API implementation using Flask backend and Socket.IO
 */

import { apiClient } from '../api';

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

export const flaskTimerService = {
  async createTimer(familyId: number, sessionId: number, data: { name: string; duration: number }): Promise<KitchenTimer> {
    const response = await apiClient.startTimer(familyId, sessionId, data);
    
    // Map Flask ActiveTimer to KitchenTimer format
    return {
      id: response.id.toString(),
      family_id: familyId.toString(),
      session_id: sessionId.toString(),
      name: response.name,
      default_seconds: response.duration,
      remaining_seconds: response.remaining_time,
      status: response.is_running ? 'running' : response.is_paused ? 'paused' : response.is_completed ? 'finished' : 'idle',
      started_by: undefined, // Flask doesn't track this
      end_at: response.started_at,
      created_at: response.created_at,
      updated_at: response.updated_at,
    };
  },

  async startTimer(timerId: string, familyId: number, sessionId: number): Promise<KitchenTimer> {
    // Flask timers start immediately on creation
    // This is a no-op for Flask, but needed for interface compatibility
    throw new Error('Flask timers start immediately on creation');
  },

  async pauseTimer(timerId: string, familyId: number, sessionId: number): Promise<KitchenTimer> {
    const response = await apiClient.pauseTimer(familyId, sessionId, parseInt(timerId));
    
    return {
      id: response.id.toString(),
      family_id: familyId.toString(),
      session_id: sessionId.toString(),
      name: response.name,
      default_seconds: response.duration,
      remaining_seconds: response.remaining_time,
      status: 'paused',
      end_at: undefined,
      created_at: response.created_at,
      updated_at: response.updated_at,
    };
  },

  async resumeTimer(timerId: string, familyId: number, sessionId: number): Promise<KitchenTimer> {
    const response = await apiClient.resumeTimer(familyId, sessionId, parseInt(timerId));
    
    return {
      id: response.id.toString(),
      family_id: familyId.toString(),
      session_id: sessionId.toString(),
      name: response.name,
      default_seconds: response.duration,
      remaining_seconds: response.remaining_time,
      status: 'running',
      end_at: response.started_at,
      created_at: response.created_at,
      updated_at: response.updated_at,
    };
  },

  async cancelTimer(timerId: string, familyId: number, sessionId: number): Promise<void> {
    await apiClient.cancelTimer(familyId, sessionId, parseInt(timerId));
  },

  async getTimers(familyId: string): Promise<KitchenTimer[]> {
    // Flask doesn't have a direct API for listing timers by family
    // Timers are typically fetched as part of cooking session data
    return [];
  },

  async deleteTimer(timerId: string): Promise<void> {
    // Flask uses cancelTimer instead of delete
    throw new Error('Use cancelTimer for Flask timers');
  },
};
