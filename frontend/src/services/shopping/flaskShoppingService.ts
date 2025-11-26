/**
 * Flask Shopping Service
 * Original shopping list API implementation using Flask backend
 */

import { apiClient } from '../api';

export interface ShoppingListItem {
  id: string;
  shopping_list_id: string;
  family_id?: string;
  name: string;
  quantity?: string;
  category?: string;
  checked: boolean;
  checked_by?: string;
  added_by?: string;
  position?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateShoppingItemRequest {
  name: string;
  quantity?: string;
  category?: string;
}

export const flaskShoppingService = {
  async getItems(familyId: number, listId: number): Promise<ShoppingListItem[]> {
    const response = await apiClient.getShoppingListItems(familyId, listId);
    
    // Map Flask items to unified format
    return response.items.map(item => ({
      id: item.id.toString(),
      shopping_list_id: listId.toString(),
      name: item.name,
      quantity: item.quantity,
      category: item.category,
      checked: item.checked,
      checked_by: item.checked_by?.toString(),
      added_by: item.added_by?.toString(),
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
  },

  async addItem(familyId: number, listId: number, data: CreateShoppingItemRequest): Promise<ShoppingListItem> {
    const response = await apiClient.addShoppingListItem(familyId, listId, data);
    
    return {
      id: response.item.id.toString(),
      shopping_list_id: listId.toString(),
      name: response.item.name,
      quantity: response.item.quantity,
      category: response.item.category,
      checked: response.item.checked,
      added_by: response.item.added_by?.toString(),
      created_at: response.item.created_at,
      updated_at: response.item.updated_at,
    };
  },

  async toggleItem(familyId: number, listId: number, itemId: number): Promise<ShoppingListItem> {
    const response = await apiClient.toggleShoppingItem(familyId, listId, itemId);
    
    return {
      id: response.item.id.toString(),
      shopping_list_id: listId.toString(),
      name: response.item.name,
      quantity: response.item.quantity,
      category: response.item.category,
      checked: response.item.checked,
      checked_by: response.item.checked_by?.toString(),
      created_at: response.item.created_at,
      updated_at: response.item.updated_at,
    };
  },

  async deleteItem(familyId: number, listId: number, itemId: number): Promise<void> {
    await apiClient.deleteShoppingListItem(familyId, listId, itemId);
  },

  async clearCheckedItems(familyId: number, listId: number): Promise<void> {
    await apiClient.clearCheckedItems(familyId, listId);
  },
};
