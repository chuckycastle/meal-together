/**
 * AddDishesDialog
 * Pick recipes from the binder, or write in something that needs no recipe.
 * Each dish gets a start time that finishes it at serving time.
 */

import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Meal, MealItemInput, Recipe } from '../../types';
import { Dialog, Notice } from '../kit';
import { guessMarkerColor } from '../../lib/markers';
import { clockLabel, durationLabel } from '../../lib/time';

interface AddDishesDialogProps {
  meal: Meal;
  recipes: Recipe[];
  onClose: () => void;
  onAdd: (data: MealItemInput) => Promise<unknown>;
}

export const AddDishesDialog = ({ meal, recipes, onClose, onAdd }: AddDishesDialogProps) => {
  const [selected, setSelected] = useState<number[]>([]);
  const [writeIn, setWriteIn] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const serveAt = new Date(meal.serve_at);
  const onMenu = useMemo(() => new Set(meal.items.map((item) => item.recipe_id)), [meal.items]);
  const available = recipes.filter(
    (recipe) => !onMenu.has(recipe.id) && recipe.name.toLowerCase().includes(query.trim().toLowerCase())
  );
  const count = selected.length + (writeIn.trim() ? 1 : 0);

  const toggle = (id: number) =>
    setSelected((ids) => (ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (count === 0) return setError('Pick a recipe or write in a dish.');

    setSaving(true);
    setError('');
    try {
      for (const id of selected) {
        const recipe = recipes.find((candidate) => candidate.id === id);
        if (!recipe) continue;
        await onAdd({ kind: 'dish', recipe_id: id, title: recipe.name, color: guessMarkerColor(recipe.name) });
      }
      if (writeIn.trim()) {
        await onAdd({ kind: 'dish', title: writeIn.trim(), color: guessMarkerColor(writeIn) });
      }
      onClose();
    } catch {
      setError('Some dishes were not added. Check your connection and try again.');
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Add dishes"
      footer={
        <>
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="add-dishes-form" className="btn btn-primary" disabled={saving || count === 0}>
            {count > 1 ? `Add ${count} dishes` : 'Add dish'}
          </button>
        </>
      }
    >
      <form id="add-dishes-form" onSubmit={submit} className="space-y-5">
        {error && <Notice>{error}</Notice>}

        <fieldset>
          <legend className="label">From your recipes</legend>
          {recipes.length > 6 && (
            <input
              type="search"
              className="field mb-2"
              placeholder="Find a recipe"
              aria-label="Find a recipe"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          )}
          {available.length === 0 ? (
            <p className="rounded-control bg-paper-2 px-3 py-3 text-sm text-ink-2">
              {recipes.length === 0 ? (
                <>
                  No recipes yet.{' '}
                  <Link to="/recipes/new" className="font-semibold text-ink underline">
                    Add a recipe
                  </Link>
                </>
              ) : query ? (
                'No recipe matches that search.'
              ) : (
                'Every recipe is already on this meal.'
              )}
            </p>
          ) : (
            <ul className="max-h-72 divide-y divide-line overflow-y-auto rounded-control border-[1.5px] border-line">
              {available.map((recipe) => {
                const total = recipe.prep_time + recipe.cook_time;
                const start = new Date(serveAt.getTime() - total * 60000);
                return (
                  <li key={recipe.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-paper-2">
                      <input
                        type="checkbox"
                        className="h-5 w-5 accent-[var(--ink)]"
                        checked={selected.includes(recipe.id)}
                        onChange={() => toggle(recipe.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{recipe.name}</span>
                        <span className="block text-sm text-ink-2">
                          Takes {durationLabel(total)}, so it starts at {clockLabel(start)}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </fieldset>

        <div>
          <label className="label" htmlFor="write-in">
            Or write one in
          </label>
          <input
            id="write-in"
            className="field"
            value={writeIn}
            onChange={(event) => setWriteIn(event.target.value)}
            placeholder="Rolls, store-bought pie, salad"
            maxLength={255}
          />
          <p className="mt-1 text-sm text-ink-2">Set its start time after adding it.</p>
        </div>
      </form>
    </Dialog>
  );
};
