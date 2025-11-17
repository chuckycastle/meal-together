/**
 * CookingStepsStep Component
 * Third step: Manage cooking instructions
 */

import { useFieldArray } from 'react-hook-form';
import type { UseFormRegister, FieldErrors, Control } from 'react-hook-form';
import type { RecipeFormValues } from '../../../schemas/recipeSchema';

interface CookingStepsStepProps {
  register: UseFormRegister<RecipeFormValues>;
  control: Control<RecipeFormValues>;
  errors: FieldErrors<RecipeFormValues>;
}

export const CookingStepsStep = ({ register, control, errors }: CookingStepsStepProps) => {
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'steps',
  });

  const addStep = () => {
    append({ instruction: '', estimated_time: undefined });
  };

  const moveUp = (index: number) => {
    if (index > 0) {
      move(index, index - 1);
    }
  };

  const moveDown = (index: number) => {
    if (index < fields.length - 1) {
      move(index, index + 1);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Cooking Steps</h2>
        <button
          type="button"
          onClick={addStep}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Step
        </button>
      </div>

      {errors.steps?.message && (
        <p className="text-sm text-red-600 mb-4">{errors.steps.message}</p>
      )}

      {fields.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-4">No cooking steps added yet</p>
          <button
            type="button"
            onClick={addStep}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add First Step
          </button>
        </div>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-2">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white font-semibold text-sm">
                  {index + 1}
                </span>
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instruction *
                  </label>
                  <textarea
                    {...register(`steps.${index}.instruction`)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe this cooking step in detail..."
                  />
                  {errors.steps?.[index]?.instruction && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.steps[index]?.instruction?.message}
                    </p>
                  )}
                </div>

                <div className="w-full md:w-1/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimated Time (minutes)
                  </label>
                  <input
                    {...register(`steps.${index}.estimated_time`, { valueAsNumber: true })}
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="5"
                  />
                </div>
              </div>

              <div className="flex-shrink-0 flex flex-col gap-1 mt-2">
                <button
                  type="button"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="text-gray-600 hover:text-gray-700 disabled:text-gray-300 p-1"
                  aria-label="Move step up"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(index)}
                  disabled={index === fields.length - 1}
                  className="text-gray-600 hover:text-gray-700 disabled:text-gray-300 p-1"
                  aria-label="Move step down"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-red-600 hover:text-red-700 p-1"
                  aria-label="Remove step"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {fields.length > 0 && (
        <button
          type="button"
          onClick={addStep}
          className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Another Step
        </button>
      )}
    </div>
  );
};
