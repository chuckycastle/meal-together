/**
 * ShoppingListPage Component
 * Collaborative shopping list with real-time updates
 */

import { useState, useEffect, useMemo } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { useWebSocket } from '../../contexts/WebSocketContext';
import {
  useShoppingLists,
  useShoppingList,
  useCreateShoppingList,
  useAddItem,
  useUpdateItem,
  useDeleteItem,
} from '../../hooks/useShoppingLists';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ShoppingItemForm, CategorySection } from '../../components/shopping';
import { Layout } from '../../components/layout/Layout';
import type { ShoppingListItem, ShoppingItemFormData } from '../../types';

export const ShoppingListPage = () => {
  const { activeFamily } = useFamily();
  const { on, isConnected } = useWebSocket();
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());

  // Get active shopping lists
  const { data: shoppingLists = [], isLoading: isLoadingLists } = useShoppingLists(
    activeFamily?.id,
    true
  );

  // Use the first active list (or create one if needed)
  const activeList = shoppingLists[0];

  // Get full shopping list with items
  const {
    data: shoppingList,
    isLoading: isLoadingItems,
    refetch,
  } = useShoppingList(activeFamily?.id, activeList?.id);

  // Mutations
  const createShoppingList = useCreateShoppingList(activeFamily?.id || 0);
  const addItem = useAddItem(activeFamily?.id || 0, activeList?.id || 0);
  const updateItem = useUpdateItem(activeFamily?.id || 0, activeList?.id || 0);
  const deleteItem = useDeleteItem(activeFamily?.id || 0, activeList?.id || 0);

  // WebSocket event handlers
  useEffect(() => {
    if (!isConnected || !activeList) return;

    const handleItemAdded = () => {
      refetch();
    };

    const handleItemUpdated = () => {
      refetch();
    };

    const handleItemDeleted = () => {
      refetch();
    };

    const unsubscribeAdded = on('shopping_item_added', handleItemAdded);
    const unsubscribeUpdated = on('shopping_item_updated', handleItemUpdated);
    const unsubscribeDeleted = on('shopping_item_deleted', handleItemDeleted);

    return () => {
      unsubscribeAdded();
      unsubscribeUpdated();
      unsubscribeDeleted();
    };
  }, [on, isConnected, activeList, refetch]);

  const handleCreateShoppingList = async () => {
    if (!activeFamily) return;

    await createShoppingList.mutateAsync({
      name: `${activeFamily.name} Shopping List`,
    });
  };

  const handleAddItem = async (data: ShoppingItemFormData) => {
    await addItem.mutateAsync(data);
  };

  const handleToggleItem = async (itemId: number, checked: boolean) => {
    setUpdatingItems((prev) => new Set(prev).add(itemId));
    try {
      await updateItem.mutateAsync({ itemId, data: { checked } });
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemId);
        return next;
      });
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    await deleteItem.mutateAsync(itemId);
  };

  const handleClearCompleted = async () => {
    if (!shoppingList?.items) return;

    const completedItems = shoppingList.items.filter((item) => item.checked);
    if (completedItems.length === 0) {
      alert('No completed items to clear');
      return;
    }

    if (!window.confirm(`Remove ${completedItems.length} completed item(s)?`)) {
      return;
    }

    await Promise.all(
      completedItems.map((item) => deleteItem.mutateAsync(item.id))
    );
  };

  if (!activeFamily) {
    return (
      <Layout>
        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              Please select a family to view shopping list
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoadingLists || isLoadingItems) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  if (!activeList) {
    return (
      <Layout>
        <div className="p-6">
          <EmptyState
            title="No shopping list"
            description="Create a shopping list to get started"
            action={{
              label: 'Create Shopping List',
              onClick: handleCreateShoppingList,
            }}
          />
        </div>
      </Layout>
    );
  }

  const items = shoppingList?.items || [];

  // Group items by category
  const itemsByCategory = useMemo(() =>
    items.reduce((acc, item) => {
      const category = item.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, ShoppingListItem[]>),
    [items]
  );

  const categories = useMemo(() => Object.keys(itemsByCategory).sort(), [itemsByCategory]);
  const completedCount = useMemo(() => items.filter((item) => item.checked).length, [items]);
  const totalCount = items.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shopping List</h1>
              <p className="text-gray-800 dark:text-gray-300 mt-1">{activeFamily.name}</p>
            </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span className="text-sm text-gray-800">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        {totalCount > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-800 dark:text-gray-300 mb-2">
              <span>
                {completedCount} of {totalCount} items completed
              </span>
              <span>{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        {completedCount > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearCompleted}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Clear Completed ({completedCount})
            </button>
          </div>
        )}
      </div>

      {/* Add Item Form */}
      <div className="mb-6">
        <ShoppingItemForm
          onAdd={handleAddItem}
          isAdding={addItem.isPending}
        />
      </div>

      {/* Shopping Items */}
      {items.length === 0 ? (
        <EmptyState
          title="No items yet"
          description="Add items to your shopping list to get started"
        />
      ) : (
        <div>
          {categories.map((category) => (
            <CategorySection
              key={category}
              category={category}
              items={itemsByCategory[category]}
              onToggle={handleToggleItem}
              onDelete={handleDeleteItem}
              updatingItems={updatingItems}
            />
          ))}
        </div>
      )}

      {/* Info Box */}
      {isConnected && items.length > 0 && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Real-time collaboration active</p>
              <p>Changes made by other family members will appear automatically.</p>
            </div>
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
};

export default ShoppingListPage;
