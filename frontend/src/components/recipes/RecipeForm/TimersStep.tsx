/**
 * TimersStep Component
 * Fourth step: Configure recipe timers
 */

import { useFieldArray } from 'react-hook-form';
import type { UseFormRegister, FieldErrors, Control } from 'react-hook-form';
import type { RecipeFormValues } from '../../../schemas/recipeSchema';

interface TimersStepProps {
  register: UseFormRegister<RecipeFormValues>;
  control: Control<RecipeFormValues>;
  errors: FieldErrors<RecipeFormValues>;
}

export const TimersStep = ({ register, control, errors }: TimersStepProps) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'timers',
  });

  const addTimer = () => {
    append({ name: '', duration: 0, step_order: undefined });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Timers</h2>
          <p className="text-sm text-gray-800 dark:text-gray-300 mt-1">Optional: Add timers for cooking steps</p>
        </div>
        <button
          type="button"
          onClick={addTimer}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Timer
        </button>
      </div>

      {errors.timers?.message && (
        <p className="text-sm text-red-600 mb-4">{errors.timers.message}</p>
      )}

      {fields.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-800 dark:text-gray-300 mb-4">No timers added yet</p>
          <p className="text-sm text-gray-800 dark:text-gray-300 mb-4">Timers are optional but helpful for cooking steps that require precise timing</p>
          <button
            type="button"
            onClick={addTimer}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add First Timer
          </button>
        </div>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-2">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-1">
                    Timer Name *
                  </label>
                  <input
                    {...register(`timers.${index}.name`)}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="e.g., Bake chicken"
                  />
                  {errors.timers?.[index]?.name && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.timers[index]?.name?.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-1">
                    Duration (minutes) *
                  </label>
                  <input
                    {...register(`timers.${index}.duration`, {
                      valueAsNumber: true,
                      setValueAs: (v) => v * 60 // Convert minutes to seconds for storage
                    })}
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="5"
                    defaultValue={field.duration ? Math.round(field.duration / 60) : undefined}
                  />
                  {errors.timers?.[index]?.duration && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.timers[index]?.duration?.message}
                    </p>
                  )}
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-300 mb-1">
                    Associated Step (optional)
                  </label>
                  <input
                    {...register(`timers.${index}.step_order`, { valueAsNumber: true })}
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Step number"
                  />
                  <p className="mt-1 text-xs text-gray-800 dark:text-gray-300">
                    Link this timer to a specific cooking step number
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => remove(index)}
                className="flex-shrink-0 mt-2 text-red-600 hover:text-red-700 p-1"
                aria-label="Remove timer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {fields.length > 0 && (
        <button
          type="button"
          onClick={addTimer}
          className="w-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Another Timer
        </button>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Timer Tips:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Enter duration in minutes (e.g., 5 for 5 minutes)</li>
              <li>Timers will be available during cooking mode</li>
              <li>Link timers to steps for better organization</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
