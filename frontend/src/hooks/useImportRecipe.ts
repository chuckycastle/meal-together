/**
 * React Query hook for AI-powered recipe import
 */

import { useMutation } from '@tanstack/react-query';
import apiClient from '../services/api';
import { useFamily } from '../contexts/FamilyContext';
import type {
  ImportRecipeRequest,
  ImportResponse,
} from '../types/recipe-import';

interface UseImportRecipeOptions {
  onSuccess?: (data: ImportResponse) => void;
  onError?: (error: Error) => void;
}

export function useImportRecipe(options?: UseImportRecipeOptions) {
  const { activeFamily } = useFamily();

  const mutation = useMutation<
    ImportResponse,
    Error,
    ImportRecipeRequest
  >({
    mutationFn: async (request: ImportRecipeRequest) => {
      if (!activeFamily) {
        throw new Error('No family selected');
      }

      // Use API client's axios instance - auth handled by interceptor
      const response = await (apiClient as any).client.post<ImportResponse>(
        `/api/families/${activeFamily.id}/recipes/import`,
        request,
        {
          timeout: 30000, // 30 second timeout for LLM processing
        }
      );

      return response.data;
    },
    onSuccess: options?.onSuccess,
    onError: (error: Error) => {
      console.error('Recipe import failed:', error);
      options?.onError?.(error);
    },
  });

  return {
    importRecipe: mutation.mutate,
    importRecipeAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}
