/**
 * RecipeDetailPage Component
 * Displays full recipe details with ingredients and steps
 */

import { useParams, useNavigate, Link } from 'react-router-dom';
import { useFamily } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import { useRecipe, useDeleteRecipe } from '../../hooks/useRecipes';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { IngredientList } from '../../components/recipes/IngredientList';
import { CookingStepList } from '../../components/recipes/CookingStepList';
import { Layout } from '../../components/layout/Layout';

export const RecipeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeFamily } = useFamily();
  const { user } = useAuth();

  const recipeId = id ? parseInt(id, 10) : undefined;

  // Fetch recipe details
  const {
    data: recipe,
    isLoading,
    error,
  } = useRecipe(activeFamily?.id, recipeId);

  // Delete mutation
  const deleteRecipe = useDeleteRecipe(activeFamily?.id || 0);

  const handleDelete = async () => {
    if (!recipeId || !window.confirm('Are you sure you want to delete this recipe?')) {
      return;
    }

    try {
      await deleteRecipe.mutateAsync(recipeId);
      navigate('/recipes');
    } catch (err) {
      console.error('Failed to delete recipe:', err);
    }
  };

  const handleStartCooking = () => {
    navigate(`/cooking?recipe=${recipeId}`);
  };

  if (!activeFamily) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">
            Please select a family to view recipe details
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

  if (error || !recipe) {
    return (
      <div className="p-6">
        <ErrorMessage
          message={error?.message || 'Recipe not found'}
        />
        <Link
          to="/recipes"
          className="inline-block mt-4 text-blue-600 hover:text-blue-700"
        >
          ← Back to Recipes
        </Link>
      </div>
    );
  }

  // Check if current user is the recipe owner
  const isOwner = user?.id === recipe.assigned_to_id;

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/recipes"
          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-4"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Recipes
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {recipe.name}
            </h1>
            {recipe.description && (
              <p className="text-lg text-gray-800">{recipe.description}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-4">
            {isOwner && (
              <>
                <Link
                  to={`/recipes/${recipe.id}/edit`}
                  className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleteRecipe.isPending}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Recipe Image */}
      {recipe.image_url && (
        <div className="mb-6">
          <img
            src={recipe.image_url}
            alt={recipe.name}
            className="w-full h-96 object-cover rounded-lg shadow-lg"
          />
        </div>
      )}

      {/* Recipe Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <p className="text-sm text-gray-800 mb-1">Prep Time</p>
          <p className="text-2xl font-bold text-gray-900">{recipe.prep_time} min</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <p className="text-sm text-gray-800 mb-1">Cook Time</p>
          <p className="text-2xl font-bold text-gray-900">{recipe.cook_time} min</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <p className="text-sm text-gray-800 mb-1">Total Time</p>
          <p className="text-2xl font-bold text-gray-900">{recipe.total_time} min</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <p className="text-sm text-gray-800 mb-1">Servings</p>
          <p className="text-2xl font-bold text-gray-900">{recipe.servings}</p>
        </div>
      </div>

      {/* Start Cooking Button */}
      <div className="mb-8">
        <button
          onClick={handleStartCooking}
          className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-lg font-semibold"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Start Cooking
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ingredients */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            Ingredients
          </h2>
          <IngredientList ingredients={recipe.ingredients || []} />
        </div>

        {/* Timers */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg
              className="w-6 h-6 text-blue-600"
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
            Timers
          </h2>
          {recipe.timers && recipe.timers.length > 0 ? (
            <ul className="space-y-3">
              {recipe.timers.map((timer) => (
                <li
                  key={timer.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="font-medium text-gray-900">{timer.name}</span>
                  <span className="text-gray-800">
                    {Math.floor(timer.duration / 60)}:
                    {String(timer.duration % 60).padStart(2, '0')}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-800 italic">No timers defined</p>
          )}
        </div>
      </div>

      {/* Cooking Steps */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Instructions
        </h2>
        <CookingStepList steps={recipe.steps || []} />
      </div>

      {/* Additional Info */}
      <div className="mt-8 text-sm text-gray-800">
        {recipe.assigned_to && (
          <p>Assigned to: {recipe.assigned_to.full_name}</p>
        )}
        {recipe.source_url && (
          <p className="mt-1">
            Source:{' '}
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700"
            >
              {recipe.source_url}
            </a>
          </p>
        )}
      </div>
    </div>
    </Layout>
  );
};
