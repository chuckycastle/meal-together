/**
 * ItemDialog
 * Edit one line of the sheet: what it is, when it starts, who cooks it,
 * which recipe it follows, and which marker it is written in.
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { FamilyMember, Meal, MealItem, MealItemInput, MealItemKind, Recipe } from '../../types';
import { Dialog, Notice } from '../kit';
import { MARKER_COLORS } from '../../lib/markers';
import { clockLabel, durationLabel, fromInputs, toDateInput, toTimeInput } from '../../lib/time';

interface ItemDialogProps {
  meal: Meal;
  item?: MealItem;
  kind: MealItemKind;
  recipes: Recipe[];
  members: FamilyMember[];
  onClose: () => void;
  onSave: (data: MealItemInput) => Promise<unknown>;
  onDelete?: () => Promise<unknown>;
}

export const ItemDialog = ({ meal, item, kind, recipes, members, onClose, onSave, onDelete }: ItemDialogProps) => {
  const serveAt = new Date(meal.serve_at);
  const initialStart = item?.start_at ? new Date(item.start_at) : null;

  const [title, setTitle] = useState(item?.title ?? '');
  const [date, setDate] = useState(toDateInput(initialStart ?? serveAt));
  const [time, setTime] = useState(initialStart ? toTimeInput(initialStart) : '');
  const [color, setColor] = useState(item?.color ?? 'ink');
  const [recipeId, setRecipeId] = useState<number | null>(item?.recipe_id ?? null);
  const [assignedToId, setAssignedToId] = useState<number | null>(item?.assigned_to_id ?? null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const isEvent = kind === 'event';
  const recipe = recipes.find((candidate) => candidate.id === recipeId);
  const suggested = recipe
    ? new Date(serveAt.getTime() - (recipe.prep_time + recipe.cook_time) * 60000)
    : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return setError(isEvent ? 'Say what is happening.' : 'Name the dish.');
    const start = time ? fromInputs(date, time) : null;
    if (isEvent && !start) return setError('Pick a time.');

    setSaving(true);
    setError('');
    try {
      await onSave({
        kind,
        title: title.trim(),
        start_at: start ? start.toISOString() : null,
        color,
        recipe_id: isEvent ? null : recipeId,
        assigned_to_id: isEvent ? null : assignedToId,
      });
      onClose();
    } catch {
      setError('The change was not saved. Check your connection and try again.');
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!onDelete) return;
    setSaving(true);
    try {
      await onDelete();
      onClose();
    } catch {
      setError('The item was not removed. Try again.');
      setSaving(false);
    }
  };

  const heading = item ? `Edit ${item.title}` : isEvent ? 'Add something else that day' : 'Add a dish';

  return (
    <Dialog
      open
      onClose={onClose}
      title={heading}
      footer={
        <>
          {item && onDelete && (
            <button type="button" className="btn btn-danger mr-auto" onClick={remove} disabled={saving}>
              Remove from meal
            </button>
          )}
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="item-form" className="btn btn-primary" disabled={saving}>
            {item ? 'Save changes' : 'Add to meal'}
          </button>
        </>
      }
    >
      <form id="item-form" onSubmit={submit} className="space-y-4">
        {error && <Notice>{error}</Notice>}

        <div>
          <label className="label" htmlFor="item-title">
            {isEvent ? 'What is happening?' : 'Name on the sheet'}
          </label>
          <input
            id="item-title"
            className="field"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={isEvent ? 'Parade' : 'Rolls'}
            maxLength={255}
            autoFocus={!item}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="item-date">
              Day
            </label>
            <input
              id="item-date"
              type="date"
              className="field"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="item-time">
              {isEvent ? 'Time' : 'Start at'}
            </label>
            <input
              id="item-time"
              type="time"
              className="field"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </div>
        </div>

        {!isEvent && suggested && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-2">
            <span>
              {recipe!.name} takes {durationLabel(recipe!.prep_time + recipe!.cook_time)}. Starting at{' '}
              {clockLabel(suggested)} finishes it at serving time.
            </span>
            <button
              type="button"
              className="font-semibold text-ink underline decoration-rule decoration-2 underline-offset-4"
              onClick={() => {
                setDate(toDateInput(suggested));
                setTime(toTimeInput(suggested));
              }}
            >
              Use {clockLabel(suggested)}
            </button>
          </p>
        )}

        {!isEvent && (
          <>
            <div>
              <label className="label" htmlFor="item-recipe">
                Recipe
              </label>
              <select
                id="item-recipe"
                className="field"
                value={recipeId ?? ''}
                onChange={(event) => setRecipeId(event.target.value ? Number(event.target.value) : null)}
              >
                <option value="">No recipe</option>
                {recipes.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="item-cook">
                Who is cooking it?
              </label>
              <select
                id="item-cook"
                className="field"
                value={assignedToId ?? ''}
                onChange={(event) => setAssignedToId(event.target.value ? Number(event.target.value) : null)}
              >
                <option value="">Nobody yet</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.user ? `${member.user.first_name} ${member.user.last_name}` : `Member ${member.user_id}`}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className="label">Marker</legend>
              <div className="flex flex-wrap gap-2">
                {MARKER_COLORS.map((option) => (
                  <label
                    key={option.value}
                    className={`mk-${option.value} flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-3 py-1.5 text-sm font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-rule ${
                      color === option.value ? 'border-ink bg-paper-2' : 'border-line'
                    }`}
                  >
                    <input
                      type="radio"
                      name="item-color"
                      className="sr-only"
                      value={option.value}
                      checked={color === option.value}
                      onChange={() => setColor(option.value)}
                    />
                    <span className="h-4 w-4 rounded-full" style={{ background: 'var(--mk)' }} aria-hidden="true" />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        )}
      </form>
    </Dialog>
  );
};
