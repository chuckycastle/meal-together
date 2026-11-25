/**
 * FirstFamily
 * First run: name the family that shares recipes, shopping, and the schedule
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Notice } from '../kit';
import { useAuth } from '../../contexts/AuthContext';
import { useCreateFamily } from '../../hooks/useFamilies';

export const FirstFamily = () => {
  const { user } = useAuth();
  const createFamily = useCreateFamily();
  const [name, setName] = useState(user?.last_name ? `${user.last_name} family` : '');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim()) createFamily.mutate({ name: name.trim() });
  };

  return (
    <div className="mx-auto max-w-lg pt-8">
      <h1 className="marker text-4xl">Who are you cooking with?</h1>
      <p className="mt-2 text-ink-2">
        Recipes, shopping, timers, and the cooking schedule are shared with a family. Name yours, then invite the
        others.
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {createFamily.isError && <Notice>The family was not created. Try again.</Notice>}
        <div>
          <label className="label" htmlFor="family-name">
            Family name
          </label>
          <input
            id="family-name"
            className="field"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={255}
            autoFocus
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={createFamily.isPending || !name.trim()}>
          Create family
        </button>
      </form>
    </div>
  );
};
