/**
 * React Query hooks for families
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import type { CreateFamilyRequest, AddMemberRequest } from '../types';

export const useFamilies = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['families'],
    queryFn: () => apiClient.getFamilies(),
    enabled,
  });
};

export const useFamily = (familyId: number | undefined) => {
  return useQuery({
    queryKey: ['families', familyId],
    queryFn: () => apiClient.getFamily(familyId!),
    enabled: !!familyId,
  });
};

export const useCreateFamily = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFamilyRequest) => apiClient.createFamily(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });
};

export const useUpdateFamily = (familyId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<CreateFamilyRequest>) => apiClient.updateFamily(familyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
    },
  });
};

export const useDeleteFamily = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (familyId: number) => apiClient.deleteFamily(familyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });
};

export const useAddMember = (familyId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddMemberRequest) => apiClient.addFamilyMember(familyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
    },
  });
};

export const useRemoveMember = (familyId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: number) => apiClient.removeFamilyMember(familyId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families', familyId] });
    },
  });
};

export const useLeaveFamily = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (familyId: number) => apiClient.leaveFamily(familyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
    },
  });
};
