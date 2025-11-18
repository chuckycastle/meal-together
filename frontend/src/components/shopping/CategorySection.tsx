/**
 * CategorySection Component
 * Groups shopping items by category
 */

import type { ShoppingListItem } from '../../types';
import { ShoppingItem } from './ShoppingItem';

interface CategorySectionProps {
  category: string;
  items: ShoppingListItem[];
  onToggle: (itemId: number, checked: boolean) => void;
  onDelete: (itemId: number) => void;
  updatingItems: Set<number>;
}

export const CategorySection = ({
  category,
  items,
  onToggle,
  onDelete,
  updatingItems,
}: CategorySectionProps) => {
  const checkedCount = items.filter((item) => item.checked).length;
  const totalCount = items.length;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          {category || 'Uncategorized'}
        </h3>
        <span className="text-sm text-gray-800">
          {checkedCount}/{totalCount} completed
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <ShoppingItem
            key={item.id}
            item={item}
            onToggle={onToggle}
            onDelete={onDelete}
            isUpdating={updatingItems.has(item.id)}
          />
        ))}
      </div>
    </div>
  );
};
