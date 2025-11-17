/**
 * RecipeDetailsStep Component
 * First step: Basic recipe information
 */

import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { RecipeFormValues } from '../../../schemas/recipeSchema';

interface RecipeDetailsStepProps {
  register: UseFormRegister<RecipeFormValues>;
  errors: FieldErrors<RecipeFormValues>;
}

export const RecipeDetailsStep = ({ register, errors }: RecipeDetailsStepProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Recipe Details</h2>

      {/* Recipe Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
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
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
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
          <label htmlFor="prep_time" className="block text-sm font-medium text-gray-700 mb-1">
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
          <label htmlFor="cook_time" className="block text-sm font-medium text-gray-700 mb-1">
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
          <label htmlFor="servings" className="block text-sm font-medium text-gray-700 mb-1">
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
        <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 mb-1">
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

      {/* Source URL */}
      <div>
        <label htmlFor="source_url" className="block text-sm font-medium text-gray-700 mb-1">
          Source URL
        </label>
        <input
          {...register('source_url')}
          type="url"
          id="source_url"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="https://example.com/recipe"
        />
        {errors.source_url && (
          <p className="mt-1 text-sm text-red-600">{errors.source_url.message}</p>
        )}
      </div>
    </div>
  );
};
