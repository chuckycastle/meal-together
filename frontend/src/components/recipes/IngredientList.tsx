/**
 * IngredientList Component
 * Displays list of recipe ingredients
 */

import type { Ingredient } from '../../types';

interface IngredientListProps {
  ingredients: Ingredient[];
}

export const IngredientList = ({ ingredients }: IngredientListProps) => {
  if (ingredients.length === 0) {
    return (
      <p className="text-gray-800 dark:text-gray-300 italic">No ingredients listed</p>
    );
  }

  // Sort by order
  const sortedIngredients = [...ingredients].sort((a, b) => a.order - b.order);

  return (
    <ul className="space-y-2">
      {sortedIngredients.map((ingredient) => (
        <li key={ingredient.id} className="flex items-start gap-3">
          <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
          <div className="flex-1">
            {ingredient.quantity && (
              <span className="font-medium text-gray-900 dark:text-white">
                {ingredient.quantity}{' '}
              </span>
            )}
            <span className="text-gray-800 dark:text-gray-300">{ingredient.name}</span>
          </div>
        </li>
      ))}
    </ul>
  );
};
