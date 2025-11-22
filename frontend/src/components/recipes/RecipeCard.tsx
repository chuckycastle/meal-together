/**
 * RecipeCard Component
 * Displays recipe summary in card format
 */

import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, Clock, Users } from 'lucide-react';
import type { Recipe } from '../../types';

interface RecipeCardProps {
  recipe: Recipe;
}

export const RecipeCard = memo(({ recipe }: RecipeCardProps) => {
  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow p-4 border border-gray-200 dark:border-gray-700"
    >
      {/* Recipe Image */}
      {recipe.image_url ? (
        <img
          src={recipe.image_url}
          alt={recipe.name}
          className="w-full h-48 object-cover rounded-md mb-3"
        />
      ) : (
        <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-md mb-3 flex items-center justify-center">
          <ChefHat className="w-16 h-16 text-gray-400 dark:text-gray-500" />
        </div>
      )}

      {/* Recipe Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {recipe.name}
        </h3>

        {recipe.description && (
          <p className="text-sm text-gray-800 dark:text-gray-300 mb-3 line-clamp-2">
            {recipe.description}
          </p>
        )}

        {/* Time and Servings Info */}
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{recipe.total_time} min</span>
          </div>

          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{recipe.servings} servings</span>
          </div>
        </div>

        {/* Assigned To */}
        {recipe.assigned_to && (
          <div className="mt-2 text-sm text-gray-800">
            Assigned to: {recipe.assigned_to.full_name}
          </div>
        )}
      </div>
    </Link>
  );
});

RecipeCard.displayName = 'RecipeCard';
