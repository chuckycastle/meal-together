/**
 * KitchenPage
 * Home. Everything that is counting down: the meal, the next dishes to
 * start, and the family's board of timers.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, Plus } from 'lucide-react';
import { Layout } from '../../components/layout';
import { BlankSlate, Clock, Notice, Spinner } from '../../components/kit';
import { StepTimer } from '../../components/cook/StepTimer';
import { FirstFamily } from '../../components/plan/FirstFamily';
import { NewTimerDialog } from '../../components/timers/NewTimerDialog';
import { TimerTile } from '../../components/timers/TimerTile';
import { useFamily } from '../../contexts/FamilyContext';
import { byUrgency, useKitchenTimers } from '../../hooks/useKitchenTimers';
import type { KitchenTimers } from '../../hooks/useKitchenTimers';
import { useMeals } from '../../hooks/useMeals';
import { useNow } from '../../hooks/useNow';
import { pickCurrentMeal } from '../../lib/meals';
import { clockLabel, countdownLabel, dayDistanceLabel, durationLabel, isSameDay, longDateLabel } from '../../lib/time';
import type { Meal, MealItem } from '../../types';

const HOUR = 3600;
const DAY = 24 * HOUR;
const QUICK_MINUTES = [1, 5, 10, 15, 30];

/** Large numerals with a small unit, for the meal countdown */
const Segment = ({ value, unit }: { value: number | string; unit: string }) => (
  <span className="inline-flex items-baseline gap-1.5">
    <span className="marker text-[clamp(3rem,11vw,5.5rem)] leading-none tabular-nums">{value}</span>
    <span className="text-lg font-semibold text-ink-2">{unit}</span>
  </span>
);

const MealCountdown = ({ meal }: { meal: Meal }) => {
  const serveAt = new Date(meal.serve_at);
  const coarse = useNow(30000);
  const closeIn = serveAt.getTime() - coarse.getTime() < DAY * 1000;
  // Tick every second only on the day itself
  const now = useNow(closeIn ? 1000 : 30000);
  const left = Math.floor((serveAt.getTime() - now.getTime()) / 1000);

  const dishes = meal.items.filter((item) => item.kind === 'dish');
  const done = dishes.filter((item) => item.done).length;

  let body;
  if (left <= 0) {
    body = <p className="marker text-[clamp(2.4rem,8vw,4rem)] leading-none text-hot">On the table</p>;
  } else if (left >= DAY) {
    const days = Math.floor(left / DAY);
    const hours = Math.floor((left % DAY) / HOUR);
    body = (
      <p className="flex flex-wrap items-baseline gap-x-5 gap-y-1" aria-label={`${days} days ${hours} hours`}>
        <Segment value={days} unit={days === 1 ? 'day' : 'days'} />
        <Segment value={hours} unit="hr" />
      </p>
    );
  } else {
    const hours = Math.floor(left / HOUR);
    const minutes = Math.floor((left % HOUR) / 60);
    const seconds = left % 60;
    body = (
      <p className="flex flex-wrap items-baseline gap-x-5 gap-y-1" role="timer" aria-label={`${hours} hours ${minutes} minutes`}>
        {hours > 0 && <Segment value={hours} unit="hr" />}
        <Segment value={String(minutes).padStart(hours > 0 ? 2 : 1, '0')} unit="min" />
        <Segment value={String(seconds).padStart(2, '0')} unit="sec" />
      </p>
    );
  }

  return (
    <section aria-label={`Countdown to ${meal.name}`} className="sheet px-5 py-5 sm:px-7 sm:py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h1 className="marker text-2xl sm:text-3xl">{meal.name}</h1>
        <p className="text-ink-2">
          {longDateLabel(serveAt)}, on the table at <span className="font-semibold text-hot">{clockLabel(serveAt)}</span>
        </p>
      </div>
      <div className="mt-4">{body}</div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-2">
          {dishes.length === 0
            ? 'No dishes on the menu yet.'
            : `${done} of ${dishes.length} dishes done.`}
        </p>
        <Link to={`/plan?meal=${meal.id}`} className="btn btn-outline btn-sm">
          Open the full schedule
        </Link>
      </div>
    </section>
  );
};

/** "Start now", a live mm:ss inside the last hour, or a rounded distance */
const StartsIn = ({ start }: { start: Date }) => {
  const coarse = useNow(30000);
  const soon = start.getTime() - coarse.getTime() < HOUR * 1000;
  const now = useNow(soon ? 1000 : 30000);
  const left = (start.getTime() - now.getTime()) / 1000;

  if (left <= 0) {
    return <span className="rounded-full bg-hot px-2.5 py-0.5 text-sm font-bold text-on-hot">Start now</span>;
  }
  if (left < HOUR) {
    return (
      <span className="marker text-xl tabular-nums" role="timer">
        in {countdownLabel(left)}
      </span>
    );
  }
  if (left < DAY || isSameDay(start, now)) {
    return <span className="text-sm font-semibold text-ink-2">in {durationLabel(left / 60)}</span>;
  }
  return <span className="text-sm font-semibold text-ink-2">{dayDistanceLabel(start, now)}</span>;
};

const UpNext = ({ meal, board }: { meal: Meal; board: KitchenTimers }) => {
  const now = useNow(30000);

  const upcoming = useMemo(() => {
    const scheduled = meal.items.filter((item): item is MealItem & { start_at: string } => !!item.start_at);
    return scheduled
      .filter((item) => (item.kind === 'dish' ? !item.done : new Date(item.start_at) > now))
      .sort((a, b) => a.start_at.localeCompare(b.start_at));
  }, [meal.items, now]);

  if (upcoming.length === 0) {
    const anyDishes = meal.items.some((item) => item.kind === 'dish');
    return (
      <p className="mt-2 text-ink-2">
        {anyDishes ? 'Every dish is checked off.' : 'Add dishes to the plan and their start times count down here.'}
      </p>
    );
  }

  const shown = upcoming.slice(0, 6);
  const firstDishId = shown.find((item) => item.kind === 'dish')?.id;

  return (
    <>
      <ol className="mt-2 divide-y divide-line">
        {shown.map((item) => {
          const start = new Date(item.start_at);
          const due = start <= now;
          const showPresets = item.recipe && item.recipe.timers.length > 0 && (due || item.id === firstDishId);

          return (
            <li key={item.id} className={`mk-${item.color} py-3`}>
              <div className="flex items-center gap-3">
                <Clock date={start} className="w-[4.6ch] flex-none text-2xl" />
                <div className="min-w-0 flex-1">
                  <p className="marker text-xl leading-tight" style={{ color: 'var(--mk)' }}>
                    {item.title}
                  </p>
                  <StartsIn start={start} />
                </div>
                {item.kind === 'dish' && item.recipe && (
                  <Link
                    to={`/cook/${item.recipe.id}?meal=${meal.id}&item=${item.id}`}
                    className={`btn btn-sm ${due ? 'btn-primary' : 'btn-outline'}`}
                  >
                    <ChefHat size={16} aria-hidden="true" />
                    Cook
                  </Link>
                )}
              </div>
              {showPresets && item.recipe && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.recipe.timers.map((timer) => (
                    <StepTimer
                      key={timer.id}
                      recipeId={item.recipe!.id}
                      recipeName={item.recipe!.name}
                      timer={timer}
                      board={board}
                      color={item.color}
                      compact
                    />
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {upcoming.length > shown.length && (
        <Link
          to={`/plan?meal=${meal.id}`}
          className="mt-2 inline-block text-sm font-semibold underline decoration-rule decoration-2 underline-offset-4"
        >
          {upcoming.length - shown.length} more on the schedule
        </Link>
      )}
    </>
  );
};

const TimerBoard = ({ board }: { board: KitchenTimers }) => {
  const [creating, setCreating] = useState(false);
  const [quickFailed, setQuickFailed] = useState(false);
  const timers = [...board.timers].sort(byUrgency);
  const running = timers.filter((timer) => timer.state !== 'idle').length;

  const quickStart = (minutes: number) => {
    setQuickFailed(false);
    board
      .create({ name: `${minutes} min timer`, duration: minutes * 60, color: 'ink' })
      .catch(() => setQuickFailed(true));
  };

  return (
    <section aria-labelledby="board-heading">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <h2 id="board-heading" className="marker text-3xl">
            Timers
          </h2>
          <p className="text-ink-2">
            {timers.length === 0
              ? 'Shared with everyone in the family, on every device.'
              : `${running} running, ${timers.length - running} ready.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {QUICK_MINUTES.map((minutes) => (
            <button
              key={minutes}
              type="button"
              className="btn btn-outline btn-sm rounded-full"
              onClick={() => quickStart(minutes)}
              aria-label={`Start a ${minutes} minute timer`}
            >
              {minutes} min
            </button>
          ))}
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
            <Plus size={16} aria-hidden="true" />
            New timer
          </button>
        </div>
      </div>

      {quickFailed && (
        <div className="mt-3">
          <Notice>The timer did not start. Check your connection and try again.</Notice>
        </div>
      )}
      {board.isError && (
        <div className="mt-3">
          <Notice>Timers did not load. Check your connection and reload the page.</Notice>
        </div>
      )}

      {timers.length === 0 ? (
        <div className="mt-4">
          <BlankSlate title="Nothing is timing">
            Start one above, or tap a timer on a dish. It shows here and on every other screen until it is cleared.
          </BlankSlate>
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(15.5rem,1fr))] gap-3">
          {timers.map((timer) => (
            <TimerTile key={timer.id} timer={timer} board={board} />
          ))}
        </div>
      )}

      {creating && <NewTimerDialog onClose={() => setCreating(false)} onCreate={board.create} />}
    </section>
  );
};

const Kitchen = ({ familyId }: { familyId: number }) => {
  const board = useKitchenTimers(familyId);
  const { data: meals, isLoading } = useMeals(familyId);
  const [openedAt] = useState(() => new Date());
  const meal = useMemo(() => (meals ? pickCurrentMeal(meals, openedAt) : undefined), [meals, openedAt]);

  if (isLoading || board.isLoading) return <Spinner />;

  return (
    <div className="grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="space-y-8">
        {meal ? (
          <MealCountdown meal={meal} />
        ) : (
          <section className="sheet px-5 py-5 sm:px-7">
            <h1 className="marker text-3xl">No meal planned</h1>
            <p className="mt-1 text-ink-2">
              Plan one and this page counts down to it, dish by dish.
            </p>
            <Link to="/plan" className="btn btn-primary mt-4">
              <Plus size={18} aria-hidden="true" />
              Plan a meal
            </Link>
          </section>
        )}
        <TimerBoard board={board} />
      </div>

      {meal && (
        <aside aria-labelledby="next-heading">
          <h2 id="next-heading" className="marker text-3xl">
            Up next
          </h2>
          <UpNext meal={meal} board={board} />
        </aside>
      )}
    </div>
  );
};

export const KitchenPage = () => {
  const { activeFamily, families, isLoading, error } = useFamily();

  let content;
  if (isLoading) {
    content = <Spinner />;
  } else if (error) {
    content = <Notice>Your family did not load. Check your connection and reload the page.</Notice>;
  } else if (families.length === 0) {
    content = <FirstFamily />;
  } else if (!activeFamily) {
    content = <Spinner />;
  } else {
    content = <Kitchen key={activeFamily.id} familyId={activeFamily.id} />;
  }

  return (
    <Layout wide dock={false}>
      {content}
    </Layout>
  );
};

export default KitchenPage;
