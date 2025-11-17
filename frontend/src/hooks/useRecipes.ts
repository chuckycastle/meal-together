/**
 * React Query hooks for recipes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import type { Recipe, CreateRecipeRequest } from '../types';

export const useRecipes = (familyId: number | undefined) => {
  return useQuery({
    queryKey: ['recipes', familyId],
    queryFn: () => apiClient.getRecipes(familyId!),
    enabled: !!familyId,
  });
};

export const useRecipe = (familyId: number | undefined, recipeId: number | undefined) => {
  return useQuery({
    queryKey: ['recipes', familyId, recipeId],
    queryFn: () => apiClient.getRecipe(familyId!, recipeId!),
    enabled: !!familyId && !!recipeId,
  });
};

export const useCreateRecipe = (familyId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRecipeRequest) => apiClient.createRecipe(familyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', familyId] });
    },
  });
};

export const useUpdateRecipe = (familyId: number, recipeId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<CreateRecipeRequest>) => apiClient.updateRecipe(familyId, recipeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', familyId] });
      queryClient.invalidateQueries({ queryKey: ['recipes', familyId, recipeId] });
    },
  });
};

export const useDeleteRecipe = (familyId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipeId: number) => apiClient.deleteRecipe(familyId, recipeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', familyId] });
    },
  });
};

export const useAssignRecipe = (familyId: number, recipeId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => apiClient.assignRecipe(familyId, recipeId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', familyId] });
      queryClient.invalidateQueries({ queryKey: ['recipes', familyId, recipeId] });
    },
  });
};
