/**
 * RecipeDetailPage
 * One recipe: what you need, what to do, and its timers
 */

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChefHat, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Layout } from '../../components/layout';
import { Notice, Spinner } from '../../components/kit';
import { StepTimer } from '../../components/cook/StepTimer';
import { useAuth } from '../../contexts/AuthContext';
import { useFamily } from '../../contexts/FamilyContext';
import { useKitchenTimers } from '../../hooks/useKitchenTimers';
import { useAssignRecipe, useDeleteRecipe, useRecipe } from '../../hooks/useRecipes';
import { looseTimers, safeHttpUrl, sortedSteps, sourceLabel, timersForStep } from '../../lib/recipes';
import { durationLabel } from '../../lib/time';

export const RecipeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const recipeId = id ? Number.parseInt(id, 10) : undefined;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeFamily } = useFamily();
  const { data: recipe, isLoading, isError } = useRecipe(activeFamily?.id, recipeId);
  const deleteRecipe = useDeleteRecipe(activeFamily?.id ?? 0);
  const assignRecipe = useAssignRecipe(activeFamily?.id ?? 0, recipeId ?? 0);
  const kitchen = useKitchenTimers(activeFamily?.id);
  const [deleteError, setDeleteError] = useState('');

  if (isLoading || !activeFamily) {
    return (
      <Layout>
        <Spinner />
      </Layout>
    );
  }

  if (isError || !recipe) {
    return (
      <Layout>
        <Notice>This recipe did not load. It may have been deleted.</Notice>
        <Link to="/recipes" className="btn btn-outline mt-4">
          <ArrowLeft size={18} aria-hidden="true" />
          All recipes
        </Link>
      </Layout>
    );
  }

  const membership = activeFamily.members?.find((member) => member.user_id === user?.id);
  const canDelete =
    user?.id === recipe.assigned_to_id || membership?.role === 'owner' || membership?.role === 'admin';

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${recipe.name}? Meals that use it keep the dish without a recipe.`)) return;
    setDeleteError('');
    try {
      await deleteRecipe.mutateAsync(recipe.id);
      navigate('/recipes');
    } catch (error) {
      const message = (error as { error?: string })?.error;
      setDeleteError(message || 'The recipe was not deleted. Try again.');
    }
  };

  const steps = sortedSteps(recipe);
  const ingredients = [...(recipe.ingredients ?? [])].sort((a, b) => a.order - b.order);
  const extraTimers = looseTimers(recipe);
  const sourceUrl = safeHttpUrl(recipe.source_url);
  const source = sourceLabel(recipe.source_url);
  const timerProps = { recipeId: recipe.id, recipeName: recipe.name, board: kitchen };

  return (
    <Layout wide>
      <Link to="/recipes" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-ink-2 hover:text-ink">
        <ArrowLeft size={16} aria-hidden="true" />
        All recipes
      </Link>

      <header className="mb-8 max-w-3xl">
        <h1 className="marker text-[clamp(2.2rem,6vw,3.5rem)] leading-[1.05]">{recipe.name}</h1>
        {recipe.description && <p className="mt-3 text-lg text-ink-2">{recipe.description}</p>}
        <p className="mt-3 text-ink-2">
          Prep {durationLabel(recipe.prep_time)}, cook {durationLabel(recipe.cook_time)}, serves {recipe.servings}.
          {sourceUrl && source && (
            <>
              {' '}
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4"
              >
                From {source}
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </>
          )}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          <label className="font-semibold" htmlFor="recipe-cook">
            Who cooks this?
          </label>
          <select
            id="recipe-cook"
            className="field w-auto min-w-44"
            value={recipe.assigned_to_id ?? ''}
            disabled={assignRecipe.isPending}
            onChange={(event) => assignRecipe.mutate(event.target.value ? Number(event.target.value) : null)}
          >
            <option value="">Nobody yet</option>
            {(activeFamily.members ?? []).map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.user_id === user?.id
                  ? `You (${member.user?.first_name})`
                  : `${member.user?.first_name} ${member.user?.last_name}`}
              </option>
            ))}
          </select>
          {assignRecipe.isError && (
            <span className="text-sm text-hot" role="alert">
              The cook was not saved. Try again.
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-2">
          Meals that include this recipe show this person as the cook, unless a dish is given to someone else.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {steps.length > 0 && (
            <Link to={`/cook/${recipe.id}`} className="btn btn-primary">
              <ChefHat size={18} aria-hidden="true" />
              Cook step by step
            </Link>
          )}
          <Link to={`/recipes/${recipe.id}/edit`} className="btn btn-outline">
            <Pencil size={16} aria-hidden="true" />
            Edit
          </Link>
          {canDelete && (
            <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleteRecipe.isPending}>
              <Trash2 size={16} aria-hidden="true" />
              Delete
            </button>
          )}
        </div>
        {deleteError && (
          <div className="mt-3">
            <Notice>{deleteError}</Notice>
          </div>
        )}
      </header>

      {recipe.image_url && safeHttpUrl(recipe.image_url) && (
        <img
          src={safeHttpUrl(recipe.image_url)!}
          alt=""
          loading="lazy"
          className="mb-8 max-h-96 w-full rounded-surface object-cover"
        />
      )}

      <div className="grid gap-10 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <section aria-labelledby="ingredients-heading" className="lg:sticky lg:top-24 lg:self-start">
          <h2 id="ingredients-heading" className="marker text-2xl">
            You need
          </h2>
          {ingredients.length === 0 ? (
            <p className="mt-2 text-ink-2">No ingredients listed.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {ingredients.map((ingredient) => (
                <li key={ingredient.id} className="py-2.5 leading-snug">
                  <span className="font-semibold">{ingredient.name}</span>
                  {ingredient.quantity && <span className="block text-[0.95rem] text-ink-2">{ingredient.quantity}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="steps-heading">
          <h2 id="steps-heading" className="marker text-2xl">
            What to do
          </h2>
          {steps.length === 0 ? (
            <p className="mt-2 text-ink-2">No steps listed.</p>
          ) : (
            <ol className="mt-3 space-y-6">
              {steps.map((step, index) => {
                const timers = timersForStep(recipe, index);
                return (
                  <li key={step.id} className="grid grid-cols-[2.5rem_1fr] gap-x-3">
                    <span className="marker text-3xl leading-none text-ink-3" aria-hidden="true">
                      {index + 1}
                    </span>
                    <div>
                      <p className="max-w-[65ch] text-lg leading-relaxed">{step.instruction}</p>
                      {timers.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {timers.map((timer) => (
                            <StepTimer key={timer.id} timer={timer} {...timerProps} />
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {extraTimers.length > 0 && (
            <div className="mt-8">
              <h3 className="label">Other timers</h3>
              <div className="flex flex-wrap gap-2">
                {extraTimers.map((timer) => (
                  <StepTimer key={timer.id} timer={timer} {...timerProps} />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
};

export default RecipeDetailPage;
