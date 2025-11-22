/**
 * TimelineSchedulerPage Component
 * Plan cooking timeline for multiple recipes
 */

import { useState, useMemo } from 'react';
import { useFamily } from '../../contexts/FamilyContext';
import { useRecipes } from '../../hooks/useRecipes';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { EmptyState } from '../../components/ui/EmptyState';
import { RecipeTimeline, RecipeTimelineItem } from '../../components/timeline';
import type { Recipe } from '../../types';
import { Layout } from '../../components/layout/Layout';

export const TimelineSchedulerPage = () => {
  const { activeFamily } = useFamily();
  const [selectedRecipes, setSelectedRecipes] = useState<Recipe[]>([]);
  const [targetTime, setTargetTime] = useState<string>('');

  // Fetch recipes
  const { data: recipes = [], isLoading, error } = useRecipes(activeFamily?.id);

  // Calculate timeline
  const timeline = useMemo(() => {
    if (selectedRecipes.length === 0 || !targetTime) {
      return [];
    }

    const target = new Date(targetTime);

    // Sort recipes by total time (longest first)
    const sortedRecipes = [...selectedRecipes].sort(
      (a, b) => b.total_time - a.total_time
    );

    // Calculate start times
    const entries = sortedRecipes.map((recipe) => {
      const startTime = new Date(target.getTime() - recipe.total_time * 60000);
      const endTime = new Date(target);
      return { recipe, startTime, endTime };
    });

    return entries;
  }, [selectedRecipes, targetTime]);

  const handleToggleRecipe = (recipe: Recipe) => {
    setSelectedRecipes((prev) => {
      const isSelected = prev.some((r) => r.id === recipe.id);
      if (isSelected) {
        return prev.filter((r) => r.id !== recipe.id);
      } else {
        return [...prev, recipe];
      }
    });
  };

  const handleRemoveRecipe = (recipeId: number) => {
    setSelectedRecipes((prev) => prev.filter((r) => r.id !== recipeId));
  };

  const handleSetTargetTimeNow = () => {
    const now = new Date();
    // Round to next 15 minutes
    const roundedMinutes = Math.ceil(now.getMinutes() / 15) * 15;
    now.setMinutes(roundedMinutes);
    now.setSeconds(0);
    now.setMilliseconds(0);

    // Format for datetime-local input
    const formatted = now.toISOString().slice(0, 16);
    setTargetTime(formatted);
  };

  const handleSetTargetTimeLater = (hours: number) => {
    const later = new Date();
    later.setHours(later.getHours() + hours);
    later.setMinutes(0);
    later.setSeconds(0);
    later.setMilliseconds(0);

    const formatted = later.toISOString().slice(0, 16);
    setTargetTime(formatted);
  };

  const handleExportTimeline = () => {
    if (timeline.length === 0) return;

    const text = timeline
      .map((entry) => {
        const startTime = entry.startTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        return `${startTime} - Start ${entry.recipe.name} (${entry.recipe.total_time} minutes)`;
      })
      .join('\n');

    const target = new Date(targetTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const fullText = `Cooking Timeline\nTarget Time: ${target}\n\n${text}`;

    // Copy to clipboard
    navigator.clipboard.writeText(fullText).then(() => {
      alert('Timeline copied to clipboard!');
    });
  };

  if (!activeFamily) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Please select a family to plan timeline
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorMessage message={error.message} />
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          title="No recipes available"
          description="Add some recipes before creating a timeline"
          action={{
            label: 'Add Recipe',
            onClick: () => window.location.href = '/recipes/new',
          }}
        />
      </div>
    );
  }

  const availableRecipes = recipes.filter(
    (recipe) => !selectedRecipes.some((r) => r.id === recipe.id)
  );

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Timeline Scheduler</h1>
          <p className="text-gray-800 dark:text-gray-300">
            Plan when to start cooking multiple recipes to have them all ready at the same time
          </p>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Recipe Selection */}
        <div className="space-y-6">
          {/* Target Time Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Target Completion Time
            </h2>

            <div className="space-y-3">
              <input
                type="datetime-local"
                value={targetTime}
                onChange={(e) => setTargetTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />

              <div className="flex gap-2">
                <button
                  onClick={handleSetTargetTimeNow}
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  Now
                </button>
                <button
                  onClick={() => handleSetTargetTimeLater(1)}
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  +1 hour
                </button>
                <button
                  onClick={() => handleSetTargetTimeLater(2)}
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  +2 hours
                </button>
                <button
                  onClick={() => handleSetTargetTimeLater(4)}
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  +4 hours
                </button>
              </div>
            </div>
          </div>

          {/* Available Recipes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
              Available Recipes ({availableRecipes.length})
            </h2>

            {availableRecipes.length === 0 ? (
              <p className="text-sm text-gray-800 dark:text-gray-300 italic">
                {selectedRecipes.length > 0
                  ? 'All recipes have been added to the timeline'
                  : 'No recipes available'}
              </p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableRecipes.map((recipe) => (
                  <button
                    key={recipe.id}
                    onClick={() => handleToggleRecipe(recipe)}
                    className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                  >
                    <div className="font-medium text-gray-900 dark:text-white">{recipe.name}</div>
                    <div className="text-sm text-gray-800 dark:text-gray-300 mt-1">
                      {recipe.total_time} minutes
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Timeline */}
        <div className="space-y-6">
          {/* Selected Recipes */}
          {selectedRecipes.length > 0 && targetTime && (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    Schedule ({selectedRecipes.length} recipes)
                  </h2>
                  {timeline.length > 0 && (
                    <button
                      onClick={handleExportTimeline}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy Timeline
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {timeline.map((entry) => (
                    <RecipeTimelineItem
                      key={entry.recipe.id}
                      recipe={entry.recipe}
                      startTime={entry.startTime}
                      targetTime={new Date(targetTime)}
                      onRemove={handleRemoveRecipe}
                    />
                  ))}
                </div>
              </div>

              {/* Visual Timeline */}
              <RecipeTimeline
                entries={timeline.map((entry) => ({
                  recipe: entry.recipe,
                  startTime: entry.startTime,
                  endTime: entry.endTime,
                }))}
                targetTime={new Date(targetTime)}
              />
            </>
          )}

          {/* Empty State */}
          {selectedRecipes.length === 0 && (
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-800"
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
              <p className="text-gray-800 dark:text-gray-300 mb-2">No recipes selected</p>
              <p className="text-sm text-gray-800 dark:text-gray-300">
                Select recipes from the left to create a cooking timeline
              </p>
            </div>
          )}

          {!targetTime && selectedRecipes.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-sm text-yellow-800">
                  Set a target completion time to see the timeline
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </Layout>
  );
};

export default TimelineSchedulerPage;
