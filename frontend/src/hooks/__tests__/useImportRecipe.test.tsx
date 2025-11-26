/**
 * Tests for useImportRecipe hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import axios from 'axios';
import { useImportRecipe } from '../useImportRecipe';

// Mock contexts
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ token: 'mock-token' }),
}));

vi.mock('../../contexts/FamilyContext', () => ({
  useFamily: () => ({ currentFamily: { id: 1, name: 'Test Family' } }),
}));

// Mock axios
vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('useImportRecipe', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should successfully import recipe', async () => {
    const mockResponse = {
      data: {
        recipe: {
          name: 'Test Recipe',
          description: 'A test recipe',
          prep_time: 10,
          cook_time: 20,
          servings: 4,
          source_url: 'https://example.com/recipe',
          ingredients: [
            { name: 'Flour', quantity: '2 cups' },
          ],
          steps: [
            { order: 1, instruction: 'Mix ingredients', estimated_time: 5 },
          ],
          timers: [
            { name: 'Mixing', duration: 300, step_order: 1 },
          ],
        },
        confidence: 'high',
        extraction_method: 'ai',
      },
    };

    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useImportRecipe(), { wrapper });

    result.current.importRecipe({ url: 'https://example.com/recipe' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse.data);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/families/1/recipes/import'),
      { url: 'https://example.com/recipe' },
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token',
        }),
      })
    );
  });

  it('should handle import errors', async () => {
    const errorMessage = 'Failed to parse recipe from URL';
    mockedAxios.post.mockRejectedValueOnce(new Error(errorMessage));

    const onError = vi.fn();
    const { result } = renderHook(() => useImportRecipe({ onError }), { wrapper });

    result.current.importRecipe({ url: 'https://example.com/recipe' });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeTruthy();
    expect(onError).toHaveBeenCalled();
  });

  it('should throw error when no family selected', async () => {
    vi.mock('../../contexts/FamilyContext', () => ({
      useFamily: () => ({ currentFamily: null }),
    }));

    const { result } = renderHook(() => useImportRecipe(), { wrapper });

    result.current.importRecipe({ url: 'https://example.com/recipe' });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('No family selected');
  });

  it('should call onSuccess callback', async () => {
    const mockResponse = {
      data: {
        recipe: {
          name: 'Test Recipe',
          description: '',
          prep_time: 10,
          cook_time: 20,
          servings: 4,
          source_url: 'https://example.com/recipe',
          ingredients: [],
          steps: [],
          timers: [],
        },
        confidence: 'medium',
        extraction_method: 'json-ld',
      },
    };

    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useImportRecipe({ onSuccess }), { wrapper });

    result.current.importRecipe({ url: 'https://example.com/recipe' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(onSuccess).toHaveBeenCalledWith(mockResponse.data);
  });

  it('should have correct loading states', async () => {
    mockedAxios.post.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const { result } = renderHook(() => useImportRecipe(), { wrapper });

    expect(result.current.isLoading).toBe(false);

    result.current.importRecipe({ url: 'https://example.com/recipe' });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('should reset mutation state', async () => {
    const mockResponse = {
      data: {
        recipe: {
          name: 'Test Recipe',
          description: '',
          prep_time: 10,
          cook_time: 20,
          servings: 4,
          source_url: 'https://example.com/recipe',
          ingredients: [],
          steps: [],
          timers: [],
        },
        confidence: 'high',
        extraction_method: 'ai',
      },
    };

    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => useImportRecipe(), { wrapper });

    result.current.importRecipe({ url: 'https://example.com/recipe' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    result.current.reset();

    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});
