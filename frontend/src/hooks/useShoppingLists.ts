/**
 * React Query hooks for shopping lists
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../services/api';
import type { CreateShoppingListRequest, AddShoppingListItemRequest, BulkAddItemsRequest } from '../types';

export const useShoppingLists = (familyId: number | undefined, activeOnly: boolean = true) => {
  return useQuery({
    queryKey: ['shoppingLists', familyId, activeOnly],
    queryFn: () => apiClient.getShoppingLists(familyId!, activeOnly),
    enabled: !!familyId,
  });
};

export const useShoppingList = (familyId: number | undefined, listId: number | undefined) => {
  return useQuery({
    queryKey: ['shoppingLists', familyId, listId],
    queryFn: () => apiClient.getShoppingList(familyId!, listId!),
    enabled: !!familyId && !!listId,
  });
};

export const useCreateShoppingList = (familyId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateShoppingListRequest) => apiClient.createShoppingList(familyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppingLists', familyId] });
    },
  });
};

export const useAddItem = (familyId: number, listId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: AddShoppingListItemRequest) => apiClient.addShoppingItem(familyId, listId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppingLists', familyId, listId] });
    },
  });
};

export const useUpdateItem = (familyId: number, listId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: number; data: Partial<AddShoppingListItemRequest> & { checked?: boolean } }) =>
      apiClient.updateShoppingItem(familyId, listId, itemId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppingLists', familyId, listId] });
    },
  });
};

export const useDeleteItem = (familyId: number, listId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) => apiClient.deleteShoppingItem(familyId, listId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppingLists', familyId, listId] });
    },
  });
};

export const useBulkAddItems = (familyId: number, listId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkAddItemsRequest) => apiClient.bulkAddItems(familyId, listId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shoppingLists', familyId, listId] });
    },
  });
};
