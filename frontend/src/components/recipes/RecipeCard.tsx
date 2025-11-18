/**
 * RecipeCard Component
 * Displays recipe summary in card format
 */

import { Link } from 'react-router-dom';
import type { Recipe } from '../../types';

interface RecipeCardProps {
  recipe: Recipe;
}

export const RecipeCard = ({ recipe }: RecipeCardProps) => {
  return (
    <Link
      to={`/recipes/${recipe.id}`}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 border border-gray-200"
    >
      {/* Recipe Image */}
      {recipe.image_url ? (
        <img
          src={recipe.image_url}
          alt={recipe.name}
          className="w-full h-48 object-cover rounded-md mb-3"
        />
      ) : (
        <div className="w-full h-48 bg-gray-200 rounded-md mb-3 flex items-center justify-center">
          <svg
            className="w-16 h-16 text-gray-800"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </div>
      )}

      {/* Recipe Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {recipe.name}
        </h3>

        {recipe.description && (
          <p className="text-sm text-gray-800 mb-3 line-clamp-2">
            {recipe.description}
          </p>
        )}

        {/* Time and Servings Info */}
        <div className="flex items-center gap-4 text-sm text-gray-800">
          <div className="flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{recipe.total_time} min</span>
          </div>

          <div className="flex items-center gap-1">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
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
};
