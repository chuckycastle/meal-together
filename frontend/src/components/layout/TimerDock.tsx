/**
 * TimerDock
 * Timers that are running stay visible on every screen. The one that needs
 * attention first leads; the rest open in a list above it.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useFamily } from '../../contexts/FamilyContext';
import { byUrgency, useKitchenTimers } from '../../hooks/useKitchenTimers';
import type { KitchenTimer, KitchenTimers } from '../../hooks/useKitchenTimers';
import { countdownLabel } from '../../lib/time';

interface TimerLineProps {
  timer: KitchenTimer;
  board: KitchenTimers;
}

export const TimerLine = ({ timer, board }: TimerLineProps) => {
  const done = timer.state === 'done';
  const urgent = timer.state === 'running' && timer.kind === 'countdown' && timer.seconds <= 60;
  const quiet = (action: Promise<unknown>) => void action.catch(() => undefined);

  return (
    <div
      className={`mk-${timer.color} flex items-center gap-3 rounded-control px-3 py-2 ${done ? 'bg-hot text-on-hot' : ''}`}
      style={urgent ? { animation: 'pulse-hot 1s ease-in-out infinite' } : undefined}
    >
      <span
        className="marker min-w-[4.2ch] flex-none text-right text-2xl tabular-nums"
        aria-live={done ? 'assertive' : 'off'}
      >
        {done ? 'Done' : countdownLabel(timer.seconds)}
      </span>
      <Link to="/" className="min-w-0 flex-1 leading-tight hover:underline">
        <span className="block truncate font-semibold" style={{ color: done ? undefined : 'var(--mk)' }}>
          {timer.name}
        </span>
        <span className={`block truncate text-sm ${done ? 'text-on-hot/85' : 'text-ink-2'}`}>
          {done
            ? `Over by ${countdownLabel(timer.overtime)}`
            : `${timer.recipeName ?? (timer.kind === 'stopwatch' ? 'Counting up' : 'Timer')}${
                timer.state === 'paused' ? ', paused' : ''
              }`}
        </span>
      </Link>
      {timer.state === 'running' && (
        <button type="button" className="btn btn-quiet btn-icon btn-sm" onClick={() => quiet(board.pause(timer))} aria-label={`Pause ${timer.name}`}>
          <Pause size={18} aria-hidden="true" />
        </button>
      )}
      {timer.state === 'paused' && (
        <button type="button" className="btn btn-quiet btn-icon btn-sm" onClick={() => quiet(board.start(timer))} aria-label={`Resume ${timer.name}`}>
          <Play size={18} aria-hidden="true" />
        </button>
      )}
      {done && (
        <button
          type="button"
          className="btn btn-icon btn-sm text-on-hot hover:bg-on-hot/15"
          onClick={() => quiet(timer.recipeId ? board.remove(timer) : board.reset(timer))}
          aria-label={`Clear ${timer.name}`}
        >
          <X size={18} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export const TimerDock = () => {
  const { activeFamily } = useFamily();
  const board = useKitchenTimers(activeFamily?.id);
  const [expanded, setExpanded] = useState(false);

  const active = board.timers.filter((timer) => timer.state !== 'idle').sort(byUrgency);
  if (active.length === 0) return null;

  const visible = expanded ? active : active.slice(0, 1);
  const hidden = active.length - 1;

  return (
    <section
      aria-label="Timers"
      className="fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md rounded-surface border-2 border-ink bg-paper p-1.5 shadow-[var(--shadow-overlay)] md:bottom-5 md:left-auto md:right-5 md:mx-0 md:w-96"
    >
      {visible.map((timer) => (
        <TimerLine key={timer.id} timer={timer} board={board} />
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-center gap-1 rounded-control py-1 text-sm font-semibold text-ink-2 hover:bg-paper-2"
        >
          {expanded ? (
            <>
              <ChevronDown size={16} aria-hidden="true" /> Show one timer
            </>
          ) : (
            <>
              <ChevronUp size={16} aria-hidden="true" /> {hidden} more {hidden === 1 ? 'timer' : 'timers'}
            </>
          )}
        </button>
      )}
    </section>
  );
};
