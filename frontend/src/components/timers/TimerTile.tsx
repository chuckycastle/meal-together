/**
 * TimerTile
 * One timer on the board: its label in the dish's marker color, the time in
 * large numerals, a bar that drains as it runs, and its controls.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play, RotateCcw, X } from 'lucide-react';
import type { KitchenTimer, KitchenTimers } from '../../hooks/useKitchenTimers';
import { countdownLabel, secondsLabel } from '../../lib/time';

interface TimerTileProps {
  timer: KitchenTimer;
  board: KitchenTimers;
}

export const TimerTile = ({ timer, board }: TimerTileProps) => {
  const [failed, setFailed] = useState(false);
  const done = timer.state === 'done';
  const urgent = timer.state === 'running' && timer.kind === 'countdown' && timer.seconds <= 60;
  const isCountdown = timer.kind === 'countdown';

  const run = (action: () => Promise<unknown>) => {
    setFailed(false);
    action().catch(() => setFailed(true));
  };

  // A finished recipe timer leaves the board; one you made yourself stays for next time
  const clear = () => run(() => (timer.recipeId ? board.remove(timer) : board.reset(timer)));

  const ghost = done ? 'text-on-hot hover:bg-on-hot/15' : 'btn-quiet';

  return (
    <article
      className={`mk-${timer.color} relative flex flex-col overflow-hidden rounded-[10px] border-[2.5px] ${
        done ? 'border-hot bg-hot text-on-hot' : 'bg-paper'
      } ${timer.state === 'idle' ? 'border-dashed' : ''}`}
      style={{
        borderColor: done ? undefined : 'var(--mk)',
        animation: urgent ? 'pulse-hot 1s ease-in-out infinite' : undefined,
      }}
      aria-label={`${timer.name} timer`}
    >
      <div className="flex items-start gap-2 px-4 pt-3">
        <div className="min-w-0 flex-1">
          <h3 className="marker truncate text-xl leading-tight" style={{ color: done ? undefined : 'var(--mk)' }}>
            {timer.name}
          </h3>
          <p className={`truncate text-sm ${done ? 'text-on-hot/85' : 'text-ink-2'}`}>
            {timer.recipeId && timer.recipeName ? (
              <Link to={`/cook/${timer.recipeId}`} className="hover:underline">
                {timer.recipeName}
              </Link>
            ) : isCountdown ? (
              `${secondsLabel(timer.duration)} countdown`
            ) : (
              'Counting up'
            )}
          </p>
        </div>
        <button
          type="button"
          className={`btn btn-icon btn-sm -mr-2 -mt-1 ${ghost}`}
          onClick={() => run(() => board.remove(timer))}
          aria-label={`Remove ${timer.name}`}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="px-4 pb-1 pt-2" aria-live={done ? 'assertive' : 'off'}>
        {done ? (
          <p className="marker text-5xl leading-none">
            Done
            <span className="ml-3 text-xl tabular-nums">over by {countdownLabel(timer.overtime)}</span>
          </p>
        ) : (
          <p className={`marker text-5xl leading-none tabular-nums ${timer.state === 'paused' ? 'opacity-50' : ''}`}>
            {countdownLabel(timer.seconds)}
          </p>
        )}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-1 px-2.5 pb-3 pt-2">
        {timer.state === 'running' && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => run(() => board.pause(timer))}>
            <Pause size={15} aria-hidden="true" />
            Pause
          </button>
        )}
        {(timer.state === 'idle' || timer.state === 'paused') && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => run(() => board.start(timer))}>
            <Play size={15} aria-hidden="true" />
            {timer.state === 'paused' ? 'Resume' : 'Start'}
          </button>
        )}
        {done && (
          <button type="button" className="btn btn-sm bg-on-hot text-hot" onClick={clear}>
            Clear
          </button>
        )}
        {isCountdown && timer.state !== 'idle' && (
          <>
            <button
              type="button"
              className={`btn btn-sm px-2 ${ghost}`}
              onClick={() => run(() => board.addTime(timer, 60))}
              aria-label={`Add 1 minute to ${timer.name}`}
            >
              +1 min
            </button>
            <button
              type="button"
              className={`btn btn-sm px-2 ${ghost}`}
              onClick={() => run(() => board.addTime(timer, 300))}
              aria-label={`Add 5 minutes to ${timer.name}`}
            >
              +5
            </button>
          </>
        )}
        {(timer.state === 'paused' || (timer.state === 'running' && !isCountdown)) && (
          <button
            type="button"
            className={`btn btn-icon btn-sm ml-auto ${ghost}`}
            onClick={() => run(() => board.reset(timer))}
            aria-label={`Reset ${timer.name}`}
          >
            <RotateCcw size={15} aria-hidden="true" />
          </button>
        )}
      </div>

      {failed && (
        <p className="px-4 pb-2 text-sm font-semibold" role="alert">
          That did not go through. Try again.
        </p>
      )}

      {isCountdown && !done && (
        <div className="h-1.5 bg-line" aria-hidden="true">
          <div
            className="h-full transition-[width] duration-1000 ease-linear"
            style={{ width: `${timer.fraction * 100}%`, background: 'var(--mk)' }}
          />
        </div>
      )}
    </article>
  );
};
