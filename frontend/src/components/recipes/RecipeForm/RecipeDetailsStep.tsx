/**
 * RecipeDetailsStep Component
 * First step: Basic recipe information
 */

import { useState } from 'react';
import type { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import type { RecipeFormValues } from '../../../schemas/recipeSchema';
import { useImportRecipe } from '../../../hooks/useImportRecipe';
import { featureFlags } from '../../../config/featureFlags';

interface RecipeDetailsStepProps {
  register: UseFormRegister<RecipeFormValues>;
  errors: FieldErrors<RecipeFormValues>;
  setValue?: UseFormSetValue<RecipeFormValues>;
  watch?: UseFormWatch<RecipeFormValues>;
}

export const RecipeDetailsStep = ({ register, errors, setValue, watch }: RecipeDetailsStepProps) => {
  const [importError, setImportError] = useState<string | null>(null);
  const sourceUrl = watch?.('source_url') || '';

  const { importRecipe, isLoading, isSuccess, data, reset: resetImport } = useImportRecipe({
    onSuccess: (response) => {
      if (!setValue) return;

      const recipe = response.recipe;

      // Pre-fill all form fields with imported data
      setValue('name', recipe.name);
      setValue('description', recipe.description);
      setValue('prep_time', recipe.prep_time);
      setValue('cook_time', recipe.cook_time);
      setValue('servings', recipe.servings);
      setValue('image_url', ''); // Not included in import
      // source_url is already set

      // Pre-fill ingredients
      setValue('ingredients', recipe.ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
      })));

      // Pre-fill steps
      setValue('steps', recipe.steps.map(step => ({
        instruction: step.instruction,
        estimated_time: step.estimated_time || undefined,
      })));

      // Pre-fill timers
      setValue('timers', recipe.timers.map(timer => ({
        name: timer.name,
        duration: timer.duration,
        step_order: timer.step_order || undefined,
      })));

      setImportError(null);
    },
    onError: (error) => {
      setImportError(error.message || 'Failed to import recipe');
    },
  });

  const handleImport = () => {
    if (!sourceUrl) {
      setImportError('Please enter a recipe URL first');
      return;
    }

    setImportError(null);
    resetImport();
    importRecipe({ url: sourceUrl });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Recipe Details</h2>

      {/* Recipe Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-800 mb-1">
          Recipe Name *
        </label>
        <input
          {...register('name')}
          type="text"
          id="name"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Chicken Parmesan"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-800 mb-1">
          Description
        </label>
        <textarea
          {...register('description')}
          id="description"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Describe your recipe..."
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        )}
      </div>

      {/* Time Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="prep_time" className="block text-sm font-medium text-gray-800 mb-1">
            Prep Time (minutes) *
          </label>
          <input
            {...register('prep_time', { valueAsNumber: true })}
            type="number"
            id="prep_time"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="15"
          />
          {errors.prep_time && (
            <p className="mt-1 text-sm text-red-600">{errors.prep_time.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="cook_time" className="block text-sm font-medium text-gray-800 mb-1">
            Cook Time (minutes) *
          </label>
          <input
            {...register('cook_time', { valueAsNumber: true })}
            type="number"
            id="cook_time"
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="30"
          />
          {errors.cook_time && (
            <p className="mt-1 text-sm text-red-600">{errors.cook_time.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="servings" className="block text-sm font-medium text-gray-800 mb-1">
            Servings *
          </label>
          <input
            {...register('servings', { valueAsNumber: true })}
            type="number"
            id="servings"
            min="1"
            max="100"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="4"
          />
          {errors.servings && (
            <p className="mt-1 text-sm text-red-600">{errors.servings.message}</p>
          )}
        </div>
      </div>

      {/* Image URL */}
      <div>
        <label htmlFor="image_url" className="block text-sm font-medium text-gray-800 mb-1">
          Image URL
        </label>
        <input
          {...register('image_url')}
          type="url"
          id="image_url"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://example.com/image.jpg"
        />
        {errors.image_url && (
          <p className="mt-1 text-sm text-red-600">{errors.image_url.message}</p>
        )}
      </div>

      {/* Source URL with AI Import */}
      <div>
        <label htmlFor="source_url" className="block text-sm font-medium text-gray-800 mb-1">
          Source URL
        </label>
        <div className="flex gap-2">
          <input
            {...register('source_url')}
            type="url"
            id="source_url"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="https://example.com/recipe"
          />
          {featureFlags.recipe_ai_import && setValue && watch && (
            <button
              type="button"
              onClick={handleImport}
              disabled={isLoading || !sourceUrl}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 whitespace-nowrap"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Importing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Import & Clean with AI
                </>
              )}
            </button>
          )}
        </div>
        {errors.source_url && (
          <p className="mt-1 text-sm text-red-600">{errors.source_url.message}</p>
        )}
        {importError && (
          <p className="mt-1 text-sm text-red-600">{importError}</p>
        )}
        {isSuccess && data && (
          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              Recipe imported successfully! ({data.confidence} confidence, {data.extraction_method} method)
              <br />
              <span className="text-xs">Review and adjust the pre-filled data, then proceed to next step.</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
