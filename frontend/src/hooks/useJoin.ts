/**
 * React Query hooks for requests to join a family
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';

/** What the signed-in person can ask to join, and where their requests stand */
export const useJoinStatus = (enabled: boolean, refetchInterval?: number) => {
  return useQuery({
    queryKey: ['join'],
    queryFn: () => apiClient.getJoinStatus(),
    enabled,
    refetchInterval,
    staleTime: 0,
  });
};

export const useRequestToJoin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ familyId, note }: { familyId: number; note?: string }) => apiClient.requestToJoin(familyId, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['join'] }),
  });
};

export const useWithdrawJoinRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: number) => apiClient.withdrawJoinRequest(requestId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['join'] }),
  });
};

/** Open requests for a family. Only owners and organizers may read them. */
export const useJoinRequests = (familyId: number | undefined, canApprove: boolean) => {
  return useQuery({
    queryKey: ['joinRequests', familyId],
    queryFn: () => apiClient.getJoinRequests(familyId!),
    enabled: !!familyId && canApprove,
    refetchInterval: 30000,
    staleTime: 5000,
  });
};

export const useDecideJoinRequest = (familyId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, decision }: { requestId: number; decision: 'member' | 'admin' | 'decline' }) =>
      decision === 'decline'
        ? apiClient.declineJoinRequest(familyId, requestId)
        : apiClient.approveJoinRequest(familyId, requestId, decision),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['joinRequests', familyId] });
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });
};
