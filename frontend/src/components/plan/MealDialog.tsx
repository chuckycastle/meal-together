/**
 * MealDialog
 * Name a meal and say when it goes on the table
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Meal } from '../../types';
import { Dialog, Notice } from '../kit';
import { fromInputs, toDateInput, toTimeInput } from '../../lib/time';

interface MealDialogProps {
  meal?: Meal;
  onClose: () => void;
  onSave: (data: { name: string; serve_at: string }) => Promise<unknown>;
  onDelete?: () => Promise<unknown>;
}

const defaultServeAt = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(18, 0, 0, 0);
  return date;
};

export const MealDialog = ({ meal, onClose, onSave, onDelete }: MealDialogProps) => {
  const initial = meal ? new Date(meal.serve_at) : defaultServeAt();
  const [name, setName] = useState(meal?.name ?? '');
  const [date, setDate] = useState(toDateInput(initial));
  const [time, setTime] = useState(toTimeInput(initial));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const serveAt = fromInputs(date, time);
    if (!name.trim()) return setError('Give the meal a name.');
    if (!serveAt) return setError('Pick a date and a time.');

    setSaving(true);
    setError('');
    try {
      await onSave({ name: name.trim(), serve_at: serveAt.toISOString() });
      onClose();
    } catch {
      setError('The meal was not saved. Check your connection and try again.');
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!onDelete || !meal) return;
    if (!window.confirm(`Delete ${meal.name} and its schedule? Recipes are kept.`)) return;
    setSaving(true);
    try {
      await onDelete();
      onClose();
    } catch {
      setError('The meal was not deleted. Try again.');
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={meal ? 'Edit meal' : 'Plan a meal'}
      footer={
        <>
          {meal && onDelete && (
            <button type="button" className="btn btn-danger mr-auto" onClick={remove} disabled={saving}>
              Delete meal
            </button>
          )}
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="meal-form" className="btn btn-primary" disabled={saving}>
            {meal ? 'Save meal' : 'Plan meal'}
          </button>
        </>
      }
    >
      <form id="meal-form" onSubmit={submit} className="space-y-4">
        {error && <Notice>{error}</Notice>}
        <div>
          <label className="label" htmlFor="meal-name">
            What is the meal?
          </label>
          <input
            id="meal-name"
            className="field"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Thanksgiving 2026"
            maxLength={255}
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="meal-date">
              Day
            </label>
            <input
              id="meal-date"
              type="date"
              className="field"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="meal-time">
              On the table at
            </label>
            <input
              id="meal-time"
              type="time"
              className="field"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </div>
        </div>
        {meal && meal.items.length > 0 && (
          <p className="text-sm text-ink-2">
            Changing the day or time moves every start time by the same amount.
          </p>
        )}
      </form>
    </Dialog>
  );
};
