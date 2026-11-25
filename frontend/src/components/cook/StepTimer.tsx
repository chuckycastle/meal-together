/**
 * StepTimer
 * A recipe's preset timer. One tap puts it on the family's timer board;
 * while it runs, the countdown shows in place.
 */

import { useState } from 'react';
import { Pause, Play, Timer, X } from 'lucide-react';
import type { MarkerColor } from '../../types';
import type { KitchenTimers } from '../../hooks/useKitchenTimers';
import { guessMarkerColor } from '../../lib/markers';
import { countdownLabel, secondsLabel } from '../../lib/time';

interface StepTimerProps {
  recipeId: number;
  recipeName: string;
  timer: { name: string; duration: number };
  board: KitchenTimers;
  color?: MarkerColor;
  compact?: boolean;
}

export const StepTimer = ({ recipeId, recipeName, timer, board, color, compact = false }: StepTimerProps) => {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const live = board.timers.find(
    (candidate) => candidate.recipeId === recipeId && candidate.name === timer.name && candidate.state !== 'idle'
  );

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setFailed(false);
    try {
      await action();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  if (live) {
    const done = live.state === 'done';
    return (
      <span
        className={`inline-flex items-center gap-2 rounded-full border-2 py-0.5 pl-4 pr-1 ${
          done ? 'border-hot bg-hot text-on-hot' : 'border-ink bg-paper'
        }`}
      >
        <span className="marker text-xl tabular-nums" aria-live={done ? 'assertive' : 'off'}>
          {done ? 'Done' : countdownLabel(live.seconds)}
        </span>
        <span className="text-sm font-semibold">
          {timer.name}
          {live.state === 'paused' && ', paused'}
        </span>
        {live.state === 'running' && (
          <button type="button" className="btn btn-quiet btn-icon btn-sm" onClick={() => run(() => board.pause(live))} aria-label={`Pause ${timer.name}`}>
            <Pause size={16} aria-hidden="true" />
          </button>
        )}
        {live.state === 'paused' && (
          <button type="button" className="btn btn-quiet btn-icon btn-sm" onClick={() => run(() => board.start(live))} aria-label={`Resume ${timer.name}`}>
            <Play size={16} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className={`btn btn-icon btn-sm ${done ? 'text-on-hot hover:bg-on-hot/15' : 'btn-quiet'}`}
          onClick={() => run(() => board.remove(live))}
          aria-label={done ? `Clear ${timer.name}` : `Stop ${timer.name}`}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </span>
    );
  }

  const start = () =>
    run(() =>
      board.create({
        name: timer.name,
        duration: timer.duration,
        recipe_id: recipeId,
        color: color ?? guessMarkerColor(recipeName),
      })
    );

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={`btn btn-outline rounded-full ${compact ? 'btn-sm' : ''}`}
        onClick={start}
        disabled={busy}
        aria-label={`Start ${secondsLabel(timer.duration)} timer: ${timer.name}`}
      >
        <Timer size={compact ? 15 : 18} aria-hidden="true" />
        {compact ? (
          <>
            {timer.name}
            <span className="font-normal text-ink-2">{secondsLabel(timer.duration)}</span>
          </>
        ) : (
          <>
            Start {secondsLabel(timer.duration)} timer
            <span className="font-normal text-ink-2">{timer.name}</span>
          </>
        )}
      </button>
      {failed && (
        <span className="text-sm text-hot" role="alert">
          The timer did not start. Try again.
        </span>
      )}
    </span>
  );
};
