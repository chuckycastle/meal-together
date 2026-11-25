/**
 * CookPage
 * Cook a recipe one step at a time. Large type for reading from across the
 * counter, preset timers on the step that needs them, and a screen that
 * stays awake.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ListChecks, X } from 'lucide-react';
import { Notice, Spinner, Tick } from '../../components/kit';
import { StepTimer } from '../../components/cook/StepTimer';
import { TimerLine } from '../../components/layout/TimerDock';
import { useFamily } from '../../contexts/FamilyContext';
import { byUrgency, useKitchenTimers } from '../../hooks/useKitchenTimers';
import { useUpdateMealItem } from '../../hooks/useMeals';
import { useRecipe } from '../../hooks/useRecipes';
import { looseTimers, sortedSteps, timersForStep } from '../../lib/recipes';
import type { Recipe } from '../../types';

/** Keep the screen on while cooking, where the browser allows it */
function useWakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) await sentinel.release();
        else lock = sentinel;
      } catch {
        // Denied or unsupported: the screen follows the device setting
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, []);
}

function readStoredStep(recipeId: number, stepCount: number): number {
  const stored = Number(sessionStorage.getItem(`cook-step-${recipeId}`));
  return Number.isInteger(stored) && stored >= 0 && stored < stepCount ? stored : 0;
}

interface CookViewProps {
  recipe: Recipe;
  familyId: number;
  mealId: number | null;
  itemId: number | null;
}

const CookView = ({ recipe, familyId, mealId, itemId }: CookViewProps) => {
  const navigate = useNavigate();
  const kitchen = useKitchenTimers(familyId);
  const updateItem = useUpdateMealItem(familyId, mealId ?? 0);
  useWakeLock();

  const steps = sortedSteps(recipe);
  const ingredients = [...(recipe.ingredients ?? [])].sort((a, b) => a.order - b.order);
  const [stepIndex, setStepIndex] = useState(() => readStoredStep(recipe.id, steps.length));
  const [gathered, setGathered] = useState<Record<number, boolean>>({});
  const [showIngredients, setShowIngredients] = useState(false);
  const [finishError, setFinishError] = useState('');

  const backTo = mealId ? '/plan' : `/recipes/${recipe.id}`;
  const isLast = stepIndex >= steps.length - 1;
  const step = steps[stepIndex];

  const goTo = useCallback(
    (index: number) => {
      const next = Math.min(Math.max(index, 0), steps.length - 1);
      sessionStorage.setItem(`cook-step-${recipe.id}`, String(next));
      setStepIndex(next);
    },
    [recipe.id, steps.length]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable]')) return;
      if (event.key === 'ArrowRight') goTo(stepIndex + 1);
      if (event.key === 'ArrowLeft') goTo(stepIndex - 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [goTo, stepIndex]);

  const finish = async () => {
    setFinishError('');
    try {
      if (mealId && itemId) {
        await updateItem.mutateAsync({ itemId, data: { done: true } });
      }
      sessionStorage.removeItem(`cook-step-${recipe.id}`);
      navigate(backTo);
    } catch {
      setFinishError('The dish was not marked done. Check your connection and try again.');
    }
  };

  const timerProps = { recipeId: recipe.id, recipeName: recipe.name, board: kitchen };
  const activeTimers = kitchen.timers.filter((timer) => timer.state !== 'idle').sort(byUrgency);
  const stepTimers = timersForStep(recipe, stepIndex);
  const extraTimers = looseTimers(recipe);

  const ingredientList = (
    <ul className="divide-y divide-line">
      {ingredients.map((ingredient) => (
        <li key={ingredient.id} className="flex items-start gap-3 py-2.5">
          <Tick
            checked={!!gathered[ingredient.id]}
            onChange={(checked) => setGathered((state) => ({ ...state, [ingredient.id]: checked }))}
            label={`${ingredient.name} is out`}
            className="mt-0.5 !h-6 !w-6"
          />
          <span className={`leading-snug ${gathered[ingredient.id] ? 'struck' : ''}`}>
            <span className="font-semibold">{ingredient.name}</span>
            {ingredient.quantity && <span className="block text-[0.95rem] text-ink-2">{ingredient.quantity}</span>}
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-paper">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-3 sm:px-6">
          <Link to={backTo} className="btn btn-quiet btn-icon btn-sm" aria-label="Stop cooking and go back">
            <X size={20} aria-hidden="true" />
          </Link>
          <p className="marker min-w-0 flex-1 truncate text-lg">{recipe.name}</p>
          {ingredients.length > 0 && (
            <button
              type="button"
              className="btn btn-outline btn-sm lg:hidden"
              aria-expanded={showIngredients}
              onClick={() => setShowIngredients((value) => !value)}
            >
              <ListChecks size={16} aria-hidden="true" />
              Ingredients
            </button>
          )}
        </div>
        {/* One segment per step: the recipe is a sequence */}
        <ol className="mx-auto flex max-w-6xl gap-1 px-3 pb-2 sm:px-6" aria-label="Steps">
          {steps.map((item, index) => (
            <li key={item.id} className="flex-1">
              <button
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Step ${index + 1}`}
                aria-current={index === stepIndex ? 'step' : undefined}
                className={`block h-2 w-full rounded-full ${
                  index < stepIndex ? 'bg-ink' : index === stepIndex ? 'bg-rule' : 'bg-line'
                }`}
              />
            </li>
          ))}
        </ol>
      </header>

      {showIngredients && (
        <section aria-label="Ingredients" className="border-b border-line bg-paper-2 px-4 py-3 lg:hidden">
          {ingredientList}
        </section>
      )}

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 pb-32 pt-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <main>
          {steps.length === 0 ? (
            <Notice tone="info">
              This recipe has no steps.{' '}
              <Link to={`/recipes/${recipe.id}/edit`} className="font-semibold underline">
                Add steps
              </Link>
            </Notice>
          ) : (
            <>
              <p className="text-ink-2" aria-live="polite">
                <span className="marker mr-2 text-4xl text-ink">{stepIndex + 1}</span>
                of {steps.length}
              </p>
              <p className="mt-4 max-w-[34ch] text-[clamp(1.5rem,3.4vw,2.25rem)] leading-[1.35] sm:max-w-[38ch]">
                {step.instruction}
              </p>

              {stepTimers.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-3">
                  {stepTimers.map((timer) => (
                    <StepTimer key={timer.id} timer={timer} {...timerProps} />
                  ))}
                </div>
              )}
              {finishError && (
                <div className="mt-6">
                  <Notice>{finishError}</Notice>
                </div>
              )}
            </>
          )}
        </main>

        <aside className="space-y-8">
          {activeTimers.length > 0 && (
            <section aria-labelledby="cook-timers-heading">
              <h2 id="cook-timers-heading" className="marker text-xl">
                Timers
              </h2>
              <div className="mt-2 space-y-1 rounded-surface border-2 border-ink p-1.5">
                {activeTimers.map((timer) => (
                  <TimerLine key={timer.id} timer={timer} board={kitchen} />
                ))}
              </div>
            </section>
          )}

          {extraTimers.length > 0 && (
            <section aria-labelledby="cook-extra-timers-heading">
              <h2 id="cook-extra-timers-heading" className="marker text-xl">
                Other timers
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {extraTimers.map((timer) => (
                  <StepTimer key={timer.id} timer={timer} {...timerProps} />
                ))}
              </div>
            </section>
          )}

          {ingredients.length > 0 && (
            <section aria-labelledby="cook-ingredients-heading" className="hidden lg:block">
              <h2 id="cook-ingredients-heading" className="marker text-xl">
                You need
              </h2>
              <div className="mt-2">{ingredientList}</div>
            </section>
          )}
        </aside>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-3 sm:px-6">
          <button
            type="button"
            className="btn btn-outline min-h-14 px-5"
            onClick={() => goTo(stepIndex - 1)}
            disabled={stepIndex === 0}
          >
            <ArrowLeft size={20} aria-hidden="true" />
            <span className="hidden sm:inline">Back</span>
            <span className="sr-only sm:hidden">Back</span>
          </button>
          {isLast ? (
            <button
              type="button"
              className="btn btn-primary min-h-14 flex-1 text-lg"
              onClick={finish}
              disabled={updateItem.isPending}
            >
              <Check size={22} aria-hidden="true" />
              {mealId && itemId ? 'Done, check it off' : 'Done cooking'}
            </button>
          ) : (
            <button type="button" className="btn btn-primary min-h-14 flex-1 text-lg" onClick={() => goTo(stepIndex + 1)}>
              Next step
              <ArrowRight size={22} aria-hidden="true" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
};

export const CookPage = () => {
  const { recipeId: recipeParam } = useParams<{ recipeId: string }>();
  const [searchParams] = useSearchParams();
  const { activeFamily } = useFamily();
  const recipeId = recipeParam ? Number.parseInt(recipeParam, 10) : undefined;
  const { data: recipe, isLoading, isError } = useRecipe(activeFamily?.id, recipeId);

  const mealId = Number(searchParams.get('meal')) || null;
  const itemId = Number(searchParams.get('item')) || null;

  if (isLoading || !activeFamily) {
    return (
      <div className="min-h-dvh bg-paper">
        <Spinner />
      </div>
    );
  }

  if (isError || !recipe) {
    return (
      <div className="mx-auto min-h-dvh max-w-xl bg-paper px-4 py-10">
        <Notice>This recipe did not load. It may have been deleted.</Notice>
        <Link to="/" className="btn btn-outline mt-4">
          <ArrowLeft size={18} aria-hidden="true" />
          Back to the kitchen
        </Link>
      </div>
    );
  }

  return <CookView key={recipe.id} recipe={recipe} familyId={activeFamily.id} mealId={mealId} itemId={itemId} />;
};

export default CookPage;
