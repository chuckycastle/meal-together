/**
 * React Query hooks for meals and their scheduled items
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import type { CreateMealRequest, Meal, MealItemInput, UpdateMealRequest } from '../types';

const mealsKey = (familyId: number | undefined) => ['meals', familyId] as const;

export const useMeals = (familyId: number | undefined) => {
  return useQuery({
    queryKey: mealsKey(familyId),
    queryFn: () => apiClient.getMeals(familyId!),
    enabled: !!familyId,
    // Other cooks check dishes off; keep the sheet current
    refetchInterval: 15000,
    staleTime: 5000,
  });
};

/** Replace one meal in the cached list with the server's copy */
const useMealCache = (familyId: number) => {
  const queryClient = useQueryClient();
  return {
    put: (meal: Meal) => {
      queryClient.setQueryData<Meal[]>(mealsKey(familyId), (meals = []) => {
        const next = meals.some((m) => m.id === meal.id)
          ? meals.map((m) => (m.id === meal.id ? meal : m))
          : [...meals, meal];
        return next.sort((a, b) => a.serve_at.localeCompare(b.serve_at));
      });
    },
    invalidate: () => queryClient.invalidateQueries({ queryKey: mealsKey(familyId) }),
    queryClient,
  };
};

export const useCreateMeal = (familyId: number) => {
  const cache = useMealCache(familyId);
  return useMutation({
    mutationFn: (data: CreateMealRequest) => apiClient.createMeal(familyId, data),
    onSuccess: cache.put,
  });
};

export const useUpdateMeal = (familyId: number, mealId: number) => {
  const cache = useMealCache(familyId);
  return useMutation({
    mutationFn: (data: UpdateMealRequest) => apiClient.updateMeal(familyId, mealId, data),
    onSuccess: cache.put,
  });
};

export const useDeleteMeal = (familyId: number) => {
  const cache = useMealCache(familyId);
  return useMutation({
    mutationFn: (mealId: number) => apiClient.deleteMeal(familyId, mealId),
    onSuccess: cache.invalidate,
  });
};

export const useAddMealItem = (familyId: number, mealId: number) => {
  const cache = useMealCache(familyId);
  return useMutation({
    mutationFn: (data: MealItemInput) => apiClient.addMealItem(familyId, mealId, data),
    onSuccess: cache.put,
  });
};

export const useUpdateMealItem = (familyId: number, mealId: number) => {
  const cache = useMealCache(familyId);
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: MealItemInput }) =>
      apiClient.updateMealItem(familyId, mealId, itemId, data),
    // Show a check-off at once; the server copy replaces it on success
    onMutate: async ({ itemId, data }) => {
      if (data.done === undefined) return undefined;
      const key = mealsKey(familyId);
      await cache.queryClient.cancelQueries({ queryKey: key });
      const previous = cache.queryClient.getQueryData<Meal[]>(key);
      cache.queryClient.setQueryData<Meal[]>(key, (meals = []) =>
        meals.map((meal) =>
          meal.id !== mealId
            ? meal
            : {
                ...meal,
                items: meal.items.map((item) =>
                  item.id === itemId ? { ...item, done: data.done! } : item
                ),
              }
        )
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        cache.queryClient.setQueryData(mealsKey(familyId), context.previous);
      }
    },
    onSuccess: cache.put,
  });
};

export const useDeleteMealItem = (familyId: number, mealId: number) => {
  const cache = useMealCache(familyId);
  return useMutation({
    mutationFn: (itemId: number) => apiClient.deleteMealItem(familyId, mealId, itemId),
    onSuccess: cache.put,
  });
};

export const useAddMealToShoppingList = (familyId: number, mealId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.addMealToShoppingList(familyId, mealId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppingLists', familyId] });
    },
  });
};
