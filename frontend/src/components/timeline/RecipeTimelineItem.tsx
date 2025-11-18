/**
 * RecipeTimelineItem Component
 * Displays a recipe on the timeline with start time
 */

import type { Recipe } from '../../types';

interface RecipeTimelineItemProps {
  recipe: Recipe;
  startTime: Date;
  targetTime: Date;
  onRemove: (recipeId: number) => void;
}

export const RecipeTimelineItem = ({
  recipe,
  startTime,
  targetTime,
  onRemove,
}: RecipeTimelineItemProps) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getTimeUntilTarget = () => {
    const diff = targetTime.getTime() - startTime.getTime();
    const minutes = Math.round(diff / 60000);
    return minutes;
  };

  const minutesUntilTarget = getTimeUntilTarget();
  const isLate = minutesUntilTarget < recipe.total_time;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Recipe Name */}
          <h3 className="font-semibold text-gray-900 mb-2">{recipe.name}</h3>

          {/* Time Information */}
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium">Start:</span>
              <span className={isLate ? 'text-red-600 font-medium' : ''}>
                {formatTime(startTime)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-gray-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
              <span className="font-medium">Duration:</span>
              <span>{recipe.total_time} minutes</span>
            </div>

            <div className="flex items-center gap-2 text-gray-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-medium">Complete:</span>
              <span>{formatTime(new Date(startTime.getTime() + recipe.total_time * 60000))}</span>
            </div>
          </div>

          {/* Warning if timing is off */}
          {isLate && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded p-2 text-sm text-red-800">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>This recipe won't be ready by the target time</span>
              </div>
            </div>
          )}
        </div>

        {/* Remove Button */}
        <button
          onClick={() => onRemove(recipe.id)}
          className="flex-shrink-0 text-red-600 hover:text-red-700 p-1"
          aria-label="Remove from timeline"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
