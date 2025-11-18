/**
 * RecipeFormPage Component
 * Multi-step form for creating and editing recipes
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFamily } from '../../contexts/FamilyContext';
import { useRecipe, useCreateRecipe, useUpdateRecipe } from '../../hooks/useRecipes';
import { recipeSchema, type RecipeFormValues } from '../../schemas/recipeSchema';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import {
  RecipeDetailsStep,
  IngredientsStep,
  CookingStepsStep,
  TimersStep,
} from '../../components/recipes/RecipeForm';

type FormStep = 'details' | 'ingredients' | 'steps' | 'timers';

const STEPS: { id: FormStep; title: string; number: number }[] = [
  { id: 'details', title: 'Recipe Details', number: 1 },
  { id: 'ingredients', title: 'Ingredients', number: 2 },
  { id: 'steps', title: 'Cooking Steps', number: 3 },
  { id: 'timers', title: 'Timers', number: 4 },
];

export const RecipeFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeFamily } = useFamily();
  const [currentStep, setCurrentStep] = useState<FormStep>('details');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isEditing = Boolean(id);
  const recipeId = id ? parseInt(id, 10) : undefined;

  // Fetch existing recipe if editing
  const { data: existingRecipe, isLoading: isLoadingRecipe } = useRecipe(
    activeFamily?.id,
    recipeId
  );

  // Mutations
  const createRecipe = useCreateRecipe(activeFamily?.id || 0);
  const updateRecipe = useUpdateRecipe(activeFamily?.id || 0, recipeId || 0);

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    trigger,
  } = useForm({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      name: '',
      description: '',
      prep_time: 0,
      cook_time: 0,
      servings: 4,
      image_url: '',
      source_url: '',
      ingredients: [{ name: '', quantity: '' }],
      steps: [{ instruction: '', estimated_time: undefined }],
      timers: [],
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (existingRecipe && isEditing) {
      reset({
        name: existingRecipe.name,
        description: existingRecipe.description || '',
        prep_time: existingRecipe.prep_time,
        cook_time: existingRecipe.cook_time,
        servings: existingRecipe.servings,
        image_url: existingRecipe.image_url || '',
        source_url: existingRecipe.source_url || '',
        ingredients: existingRecipe.ingredients?.map((ing) => ({
          name: ing.name,
          quantity: ing.quantity || '',
        })) || [{ name: '', quantity: '' }],
        steps: existingRecipe.steps?.map((step) => ({
          instruction: step.instruction,
          estimated_time: step.estimated_time,
        })) || [{ instruction: '', estimated_time: undefined }],
        timers: existingRecipe.timers?.map((timer) => ({
          name: timer.name,
          duration: timer.duration,
          step_order: timer.step_order,
        })) || [],
      });
    }
  }, [existingRecipe, isEditing, reset]);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const goToNextStep = async () => {
    // Validate current step before proceeding
    let fieldsToValidate: (keyof RecipeFormValues)[] = [];

    switch (currentStep) {
      case 'details':
        fieldsToValidate = ['name', 'prep_time', 'cook_time', 'servings'];
        break;
      case 'ingredients':
        fieldsToValidate = ['ingredients'];
        break;
      case 'steps':
        fieldsToValidate = ['steps'];
        break;
      case 'timers':
        fieldsToValidate = ['timers'];
        break;
    }

    const isValid = await trigger(fieldsToValidate);
    if (!isValid) return;

    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1].id);
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  };

  const onSubmit = async (data: RecipeFormValues) => {
    setSubmitError(null);

    try {
      if (isEditing && recipeId) {
        await updateRecipe.mutateAsync(data);
        navigate(`/recipes/${recipeId}`);
      } else {
        await createRecipe.mutateAsync(data);
        navigate('/recipes');
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save recipe');
    }
  };

  if (!activeFamily) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Please select a family to create a recipe
          </p>
        </div>
      </div>
    );
  }

  if (isLoadingRecipe && isEditing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/recipes"
          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Recipes
        </Link>

        <h1 className="text-3xl font-bold text-gray-900">
          {isEditing ? 'Edit Recipe' : 'Create New Recipe'}
        </h1>
        <p className="text-gray-700 mt-2">
          {isEditing ? 'Update your recipe details' : 'Add a new recipe to your family collection'}
        </p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex-1 flex items-center">
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setCurrentStep(step.id)}
                  className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold transition-colors ${
                    currentStep === step.id
                      ? 'bg-blue-600 text-white'
                      : index < currentStepIndex
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </button>
                <span
                  className={`ml-2 font-medium hidden md:inline ${
                    currentStep === step.id ? 'text-blue-600' : 'text-gray-700'
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    index < currentStepIndex ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-6">
          {currentStep === 'details' && (
            <RecipeDetailsStep register={register} errors={errors} />
          )}
          {currentStep === 'ingredients' && (
            <IngredientsStep register={register} control={control} errors={errors} />
          )}
          {currentStep === 'steps' && (
            <CookingStepsStep register={register} control={control} errors={errors} />
          )}
          {currentStep === 'timers' && (
            <TimersStep register={register} control={control} errors={errors} />
          )}
        </div>

        {/* Error Message */}
        {submitError && (
          <div className="mb-6">
            <ErrorMessage message={submitError} />
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={goToPreviousStep}
            disabled={currentStepIndex === 0}
            className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>

          {currentStepIndex < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goToNextStep}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              Next
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {isEditing ? 'Update Recipe' : 'Create Recipe'}
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};
