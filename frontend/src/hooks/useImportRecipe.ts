/**
 * React Query hook for AI-powered recipe import
 */

import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { authService } from '../services/auth';
import { useFamily } from '../contexts/FamilyContext';
import type {
  ImportRecipeRequest,
  ImportResponse,
} from '../types/recipe-import';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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

      const token = authService.getAccessToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await axios.post<ImportResponse>(
        `${API_URL}/api/families/${activeFamily.id}/recipes/import`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
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
