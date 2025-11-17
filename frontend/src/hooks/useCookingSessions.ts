/**
 * React Query hooks for cooking sessions and timers
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import type { StartCookingSessionRequest, CreateTimelineRequest, StartTimerRequest } from '../types';

export const useActiveSessions = (familyId: number | undefined) => {
  return useQuery({
    queryKey: ['cookingSessions', familyId],
    queryFn: () => apiClient.getActiveSessions(familyId!),
    enabled: !!familyId,
    refetchInterval: 5000, // Poll every 5 seconds for active sessions
  });
};

export const useCookingSession = (familyId: number | undefined, sessionId: number | undefined) => {
  return useQuery({
    queryKey: ['cookingSessions', familyId, sessionId],
    queryFn: () => apiClient.getCookingSession(familyId!, sessionId!),
    enabled: !!familyId && !!sessionId,
    refetchInterval: 1000, // Poll every second for timer updates
  });
};

export const useCalculateTimeline = (familyId: number) => {
  return useMutation({
    mutationFn: (data: CreateTimelineRequest) => apiClient.calculateTimeline(familyId, data),
  });
};

export const useStartCookingSession = (familyId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StartCookingSessionRequest) => apiClient.startCookingSession(familyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cookingSessions', familyId] });
    },
  });
};

export const useCompleteCookingSession = (familyId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: number) => apiClient.completeCookingSession(familyId, sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cookingSessions', familyId] });
    },
  });
};

export const useStartTimer = (familyId: number, sessionId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: StartTimerRequest) => apiClient.startTimer(familyId, sessionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cookingSessions', familyId, sessionId] });
    },
  });
};

export const usePauseTimer = (familyId: number, sessionId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (timerId: number) => apiClient.pauseTimer(familyId, sessionId, timerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cookingSessions', familyId, sessionId] });
    },
  });
};

export const useResumeTimer = (familyId: number, sessionId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (timerId: number) => apiClient.resumeTimer(familyId, sessionId, timerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cookingSessions', familyId, sessionId] });
    },
  });
};

export const useCancelTimer = (familyId: number, sessionId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (timerId: number) => apiClient.cancelTimer(familyId, sessionId, timerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cookingSessions', familyId, sessionId] });
    },
  });
};
