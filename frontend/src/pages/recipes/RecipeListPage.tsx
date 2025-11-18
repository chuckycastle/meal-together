/**
 * RecipeListPage Component
 * Browse and search family recipes
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFamily } from '../../contexts/FamilyContext';
import { useRecipes } from '../../hooks/useRecipes';
import { RecipeList } from '../../components/recipes';
import { Layout } from '../../components/layout/Layout';

export const RecipeListPage = () => {
  const { activeFamily } = useFamily();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch recipes for active family
  const { data: recipes = [], isLoading, error } = useRecipes(
    activeFamily?.id
  );

  // Filter recipes by search query
  const filteredRecipes = recipes.filter((recipe) =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!activeFamily) {
    return (
      <Layout>
        <div className="p-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800">
              Please select a family to view recipes
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Recipes</h1>
          <Link
            to="/recipes/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Recipe
          </Link>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="w-5 h-5 text-gray-800 absolute left-3 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Results count */}
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-800">
            Found {filteredRecipes.length} recipe(s)
          </p>
        )}
      </div>

      {/* Recipe Grid */}
      <RecipeList
        recipes={filteredRecipes}
        isLoading={isLoading}
        error={error}
      />
    </div>
    </Layout>
  );
};
