/**
 * React Query hooks for recipes
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import type { CreateRecipeRequest, Recipe } from '../types';

export const useRecipes = (familyId: number | undefined) => {
  return useQuery({
    queryKey: ['recipes', familyId],
    queryFn: () => apiClient.getRecipes(familyId!),
    enabled: !!familyId,
  });
};

/** Step progress is shared, so screens that show it refetch on this interval */
export const STEP_SYNC_MS = 5000;

export const useRecipe = (
  familyId: number | undefined,
  recipeId: number | undefined,
  options: { refetchInterval?: number } = {}
) => {
  return useQuery({
    queryKey: ['recipes', familyId, recipeId],
    queryFn: () => apiClient.getRecipe(familyId!, recipeId!),
    enabled: !!familyId && !!recipeId,
    refetchInterval: options.refetchInterval,
  });
};

/**
 * Mark a recipe's steps done for the whole family. The change shows at once
 * and is replaced by the server's copy when the request returns.
 */
export const useStepProgress = (familyId: number, recipeId: number) => {
  const queryClient = useQueryClient();
  const queryKey = ['recipes', familyId, recipeId];

  const setDone = useMutation({
    mutationFn: ({ stepId, done }: { stepId: number; done: boolean }) =>
      apiClient.setStepDone(familyId, recipeId, stepId, done),
    onMutate: async ({ stepId, done }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<Recipe>(queryKey);
      if (previous) {
        queryClient.setQueryData<Recipe>(queryKey, {
          ...previous,
          steps: previous.steps?.map((step) => (step.id === stepId ? { ...step, done } : step)),
        });
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSuccess: (recipe) => queryClient.setQueryData(queryKey, recipe),
  });

  const reset = useMutation({
    mutationFn: () => apiClient.resetSteps(familyId, recipeId),
    onSuccess: (recipe) => queryClient.setQueryData(queryKey, recipe),
  });

  return { setDone, reset };
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
    /** null removes the cook */
    mutationFn: (userId: number | null) => apiClient.assignRecipe(familyId, recipeId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', familyId] });
      queryClient.invalidateQueries({ queryKey: ['recipes', familyId, recipeId] });
      // Dishes without their own cook follow the recipe
      queryClient.invalidateQueries({ queryKey: ['meals', familyId] });
    },
  });
};
