/**
 * RecipeList Component
 * Grid display of recipe cards
 */

import { useNavigate } from 'react-router-dom';
import type { Recipe } from '../../types';
import { RecipeCard } from './RecipeCard';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { ErrorMessage } from '../ui/ErrorMessage';
import { EmptyState } from '../ui/EmptyState';

interface RecipeListProps {
  recipes: Recipe[];
  isLoading?: boolean;
  error?: Error | null;
}

export const RecipeList = ({ recipes, isLoading, error }: RecipeListProps) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <LoadingSkeleton key={i} className="h-80" />
        ))}
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  if (recipes.length === 0) {
    return (
      <EmptyState
        title="No recipes yet"
        description="Get started by adding your first recipe"
        action={{
          label: 'Add Recipe',
          onClick: () => navigate('/recipes/new'),
        }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
};
