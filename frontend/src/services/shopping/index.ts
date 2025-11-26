// @ts-nocheck
/**
 * Unified Shopping Service
 * Switches between Flask and Supabase shopping implementations based on feature flags
 */

import { isFeatureEnabled } from '../../config/featureFlags';
import { flaskShoppingService } from './flaskShoppingService';
import { supabaseShoppingService } from './supabaseShoppingService';

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

/**
 * Get the active shopping service based on feature flags
 */
function getShoppingService() {
  const useSupabaseShopping = isFeatureEnabled('supabase_shopping');
  return useSupabaseShopping ? supabaseShoppingService : flaskShoppingService;
}

/**
 * Unified shopping service that delegates to the appropriate implementation
 */
export const shoppingService = {
  async getItems(familyId: string, listId: string): Promise<ShoppingListItem[]> {
    const service = getShoppingService();
    
    if (service === flaskShoppingService) {
      return (flaskShoppingService as any).getItems(parseInt(familyId), parseInt(listId));
    }
    
    return service.getItems(familyId, listId);
  },

  async addItem(familyId: string, listId: string, data: CreateShoppingItemRequest, userId: string): Promise<ShoppingListItem> {
    const service = getShoppingService();
    
    if (service === flaskShoppingService) {
      return (flaskShoppingService as any).addItem(parseInt(familyId), parseInt(listId), data);
    }
    
    return service.addItem(familyId, listId, data, userId);
  },

  async toggleItem(familyId: string, listId: string, itemId: string, userId: string): Promise<ShoppingListItem> {
    const service = getShoppingService();
    
    if (service === flaskShoppingService) {
      return (flaskShoppingService as any).toggleItem(
        parseInt(familyId),
        parseInt(listId),
        parseInt(itemId)
      );
    }
    
    return service.toggleItem(itemId, userId);
  },

  async deleteItem(familyId: string, listId: string, itemId: string): Promise<void> {
    const service = getShoppingService();
    
    if (service === flaskShoppingService) {
      return (flaskShoppingService as any).deleteItem(
        parseInt(familyId),
        parseInt(listId),
        parseInt(itemId)
      );
    }
    
    return service.deleteItem(itemId);
  },

  async clearCheckedItems(familyId: string, listId: string): Promise<void> {
    const service = getShoppingService();
    
    if (service === flaskShoppingService) {
      return (flaskShoppingService as any).clearCheckedItems(parseInt(familyId), parseInt(listId));
    }
    
    return service.clearCheckedItems(listId);
  },

  /**
   * Subscribe to real-time shopping list updates (Supabase only)
   */
  subscribeToItems(
    familyId: string,
    callbacks: {
      onInsert?: (item: ShoppingListItem) => void;
      onUpdate?: (item: ShoppingListItem) => void;
      onDelete?: (itemId: string) => void;
    }
  ) {
    const useSupabaseShopping = isFeatureEnabled('supabase_shopping');
    
    if (!useSupabaseShopping) {
      console.warn('Real-time shopping subscriptions only available with Supabase shopping');
      return () => {}; // No-op unsubscribe
    }
    
    return supabaseShoppingService.subscribeToItems(familyId, callbacks);
  },
};

// Export for direct access if needed
export { flaskShoppingService, supabaseShoppingService };
