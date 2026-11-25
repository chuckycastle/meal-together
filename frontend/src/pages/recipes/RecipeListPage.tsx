/**
 * RecipeListPage
 * The family's recipes as an index: name, time, servings, where it came from
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { Layout } from '../../components/layout';
import { BlankSlate, Notice, PageHeader, Spinner } from '../../components/kit';
import { useFamily } from '../../contexts/FamilyContext';
import { useRecipes } from '../../hooks/useRecipes';
import { durationLabel } from '../../lib/time';
import { sourceLabel } from '../../lib/recipes';

export const RecipeListPage = () => {
  const { activeFamily, isLoading: familyLoading } = useFamily();
  const { data: recipes = [], isLoading, isError } = useRecipes(activeFamily?.id);
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return recipes
      .filter((recipe) => recipe.name.toLowerCase().includes(needle))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [recipes, query]);

  let content;
  if (familyLoading || isLoading) {
    content = <Spinner />;
  } else if (!activeFamily) {
    content = (
      <BlankSlate
        title="Recipes belong to a family"
        action={
          <Link to="/" className="btn btn-primary">
            Set up your family
          </Link>
        }
      />
    );
  } else if (isError) {
    content = <Notice>Recipes did not load. Check your connection and reload the page.</Notice>;
  } else if (recipes.length === 0) {
    content = (
      <BlankSlate
        title="No recipes yet"
        action={
          <Link to="/recipes/new" className="btn btn-primary">
            <Plus size={18} aria-hidden="true" />
            Add a recipe
          </Link>
        }
      >
        Paste a link to import one, or type it in. Recipes with timers can be cooked step by step.
      </BlankSlate>
    );
  } else {
    content = (
      <>
        <div className="relative mb-4">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <input
            type="search"
            className="field pl-10"
            placeholder="Find a recipe"
            aria-label="Find a recipe"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        {visible.length === 0 ? (
          <p className="py-8 text-center text-ink-2">No recipe is named like "{query}".</p>
        ) : (
          <ul className="surface divide-y divide-line overflow-hidden">
            {visible.map((recipe) => {
              const source = sourceLabel(recipe.source_url);
              return (
                <li key={recipe.id}>
                  <Link
                    to={`/recipes/${recipe.id}`}
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-4 hover:bg-paper-2 sm:px-5"
                  >
                    <span className="marker min-w-0 flex-1 basis-56 text-xl sm:text-2xl">{recipe.name}</span>
                    <span className="text-sm text-ink-2">
                      {durationLabel(recipe.prep_time + recipe.cook_time)}, serves {recipe.servings}
                      {source && <span className="hidden sm:inline">, from {source}</span>}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </>
    );
  }

  return (
    <Layout>
      <PageHeader
        title="Recipes"
        description={recipes.length > 0 ? `${recipes.length} in the family binder` : undefined}
        actions={
          activeFamily && (
            <Link to="/recipes/new" className="btn btn-primary">
              <Plus size={18} aria-hidden="true" />
              Add recipe
            </Link>
          )
        }
      />
      {content}
    </Layout>
  );
};

export default RecipeListPage;
