/**
 * Supabase Shopping Service
 * New shopping list implementation using Supabase and Realtime
 */

import { supabase } from '../../lib/supabase';
import { userService } from '../user/userService';

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

export const supabaseShoppingService = {
  async getItems(familyId: string, listId: string): Promise<ShoppingListItem[]> {
    const { data, error } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('shopping_list_id', listId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ShoppingListItem[];
  },

  async addItem(familyId: string, listId: string, data: CreateShoppingItemRequest, userId: string): Promise<ShoppingListItem> {
    // Ensure we're using internal user ID
    const internalUserId = await userService.getInternalUserId();

    // Get max position for new item
    const { data: items } = await supabase
      .from('shopping_list_items')
      .select('position')
      .eq('shopping_list_id', listId)
      .order('position', { ascending: false })
      .limit(1);

    const maxPosition = items && items.length > 0 ? items[0].position || 0 : 0;

    const { data: item, error } = await supabase
      .from('shopping_list_items')
      .insert({
        shopping_list_id: listId,
        family_id: familyId,
        name: data.name,
        quantity: data.quantity,
        category: data.category,
        checked: false,
        added_by: internalUserId,
        position: maxPosition + 1,
      })
      .select()
      .single();

    if (error) throw error;
    return item as ShoppingListItem;
  },

  async toggleItem(itemId: string, userId: string): Promise<ShoppingListItem> {
    // Ensure we're using internal user ID
    const internalUserId = await userService.getInternalUserId();

    // Get current state
    const { data: currentItem } = await supabase
      .from('shopping_list_items')
      .select('checked')
      .eq('id', itemId)
      .single();

    const newCheckedState = !currentItem?.checked;

    const { data: item, error } = await supabase
      .from('shopping_list_items')
      .update({
        checked: newCheckedState,
        checked_by: newCheckedState ? internalUserId : null,
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return item as ShoppingListItem;
  },

  async updateItem(itemId: string, updates: Partial<ShoppingListItem>): Promise<ShoppingListItem> {
    const { data: item, error } = await supabase
      .from('shopping_list_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return item as ShoppingListItem;
  },

  async deleteItem(itemId: string): Promise<void> {
    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  },

  async clearCheckedItems(listId: string): Promise<void> {
    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('shopping_list_id', listId)
      .eq('checked', true);

    if (error) throw error;
  },

  async reorderItems(listId: string, itemPositions: Array<{ id: string; position: number }>): Promise<void> {
    // Update positions in batch
    const updates = itemPositions.map(({ id, position }) =>
      supabase
        .from('shopping_list_items')
        .update({ position })
        .eq('id', id)
    );

    await Promise.all(updates);
  },

  /**
   * Subscribe to shopping list item changes
   */
  subscribeToItems(
    familyId: string,
    callbacks: {
      onInsert?: (item: ShoppingListItem) => void;
      onUpdate?: (item: ShoppingListItem) => void;
      onDelete?: (itemId: string) => void;
    }
  ) {
    const channel = supabase
      .channel(`shopping_items:${familyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'shopping_list_items',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          if (callbacks.onInsert) {
            callbacks.onInsert(payload.new as ShoppingListItem);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shopping_list_items',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          if (callbacks.onUpdate) {
            callbacks.onUpdate(payload.new as ShoppingListItem);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'shopping_list_items',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          if (callbacks.onDelete && payload.old) {
            callbacks.onDelete((payload.old as ShoppingListItem).id);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  },
};
