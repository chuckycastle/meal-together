/**
 * ShoppingItem Component
 * Single shopping list item with checkbox
 */

import { useState } from 'react';
import type { ShoppingListItem } from '../../types';

interface ShoppingItemProps {
  item: ShoppingListItem;
  onToggle: (itemId: number, checked: boolean) => void;
  onDelete: (itemId: number) => void;
  isUpdating?: boolean;
}

export const ShoppingItem = ({ item, onToggle, onDelete, isUpdating }: ShoppingItemProps) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Remove this item from the shopping list?')) {
      return;
    }
    setIsDeleting(true);
    try {
      await onDelete(item.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={`flex items-start gap-3 p-3 bg-white rounded-lg border border-gray-200 transition-opacity ${
        isUpdating || isDeleting ? 'opacity-50' : ''
      }`}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0 pt-0.5">
        <input
          type="checkbox"
          checked={item.checked}
          onChange={(e) => onToggle(item.id, e.target.checked)}
          disabled={isUpdating || isDeleting}
          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
        />
      </div>

      {/* Item Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p
              className={`text-gray-900 font-medium ${
                item.checked ? 'line-through text-gray-800' : ''
              }`}
            >
              {item.name}
              {item.quantity && (
                <span className="ml-2 text-sm text-gray-800 font-normal">
                  ({item.quantity})
                </span>
              )}
            </p>
            {item.notes && (
              <p className="text-sm text-gray-800 mt-1">{item.notes}</p>
            )}
          </div>

          {/* Category Badge */}
          {item.category && (
            <span className="flex-shrink-0 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
              {item.category}
            </span>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-800">
          {item.added_by && (
            <span>Added by {item.added_by.full_name}</span>
          )}
          {item.checked && item.checked_by && (
            <span>Checked by {item.checked_by.full_name}</span>
          )}
        </div>
      </div>

      {/* Delete Button */}
      <button
        onClick={handleDelete}
        disabled={isUpdating || isDeleting}
        className="flex-shrink-0 text-red-600 hover:text-red-700 disabled:opacity-50 p-1"
        aria-label="Delete item"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
