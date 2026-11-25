/**
 * TvPage
 * A dashboard for a kitchen TV, shown by mirroring a phone, tablet, or
 * computer over AirPlay. Read from across the room: the clock, the time
 * left until the meal, the whole schedule with cooks, and running timers.
 * It needs no interaction and never scrolls.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Clock, Spinner } from '../../components/kit';
import { useFamily } from '../../contexts/FamilyContext';
import { byUrgency, useKitchenTimers } from '../../hooks/useKitchenTimers';
import type { KitchenTimer } from '../../hooks/useKitchenTimers';
import { useMeals } from '../../hooks/useMeals';
import { useNow } from '../../hooks/useNow';
import { useWakeLock } from '../../hooks/useWakeLock';
import { groupByStart, pickCurrentMeal } from '../../lib/meals';
import type { TimeGroup } from '../../lib/meals';
import { clockLabel, countdownLabel, dayDistanceLabel, durationLabel, secondsLabel } from '../../lib/time';
import {
  isAudioEnabled,
  playFinishChime,
  setAudioEnabled,
  unlockAudio,
} from '../../utils/audio/audioNotification';
import type { Meal, MealItem } from '../../types';
import './tv.css';

const HOUR = 3600;
const DAY = 24 * HOUR;
const MAX_ROWS = 9;
const MAX_TIMERS = 6;
const CONTROLS_VISIBLE_MS = 4000;
const THEME_KEY = 'tv-theme';

type TvTheme = 'dark' | 'light';

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

const canFullscreen = (): boolean => {
  const root = document.documentElement as FullscreenElement;
  return typeof root.requestFullscreen === 'function' || typeof root.webkitRequestFullscreen === 'function';
};

const fullscreenElement = (): Element | null => {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
};

/** Time left until the meal, ticking each second on the day itself */
const TableCountdown = ({ serveAt }: { serveAt: Date }) => {
  const coarse = useNow(30000);
  const close = serveAt.getTime() - coarse.getTime() < DAY * 1000;
  const now = useNow(close ? 1000 : 30000);
  const left = Math.floor((serveAt.getTime() - now.getTime()) / 1000);

  if (left <= 0) {
    return (
      <p className="tv-figure">
        <span className="marker tv-figure-value tv-hot">On the table</span>
      </p>
    );
  }

  let value: string;
  if (left >= DAY) {
    const days = Math.floor(left / DAY);
    const hours = Math.floor((left % DAY) / HOUR);
    value = `${days} ${days === 1 ? 'day' : 'days'} ${hours} hr`;
  } else {
    value = countdownLabel(left);
  }

  return (
    <p className="tv-figure" role="timer" aria-label={`${value} until the meal`}>
      <span className="marker tv-figure-value">{value}</span>
      <span className="tv-figure-label">to go</span>
    </p>
  );
};

const WallClock = () => {
  const now = useNow(5000);
  return (
    <div className="tv-figure">
      <Clock date={now} className="tv-figure-value" />
    </div>
  );
};

/** "Start now", a live countdown inside the last hour, or a rounded distance */
const StartTag = ({ start, due }: { start: Date; due: boolean }) => {
  const coarse = useNow(30000);
  const soon = start.getTime() - coarse.getTime() < HOUR * 1000;
  const now = useNow(soon ? 1000 : 30000);
  const left = (start.getTime() - now.getTime()) / 1000;

  if (due || left <= 0) {
    return due ? (
      <span className="tv-tag" data-kind="due">
        Start now
      </span>
    ) : null;
  }

  const label =
    left < HOUR ? `in ${countdownLabel(left)}` : left < DAY ? `in ${durationLabel(left / 60)}` : dayDistanceLabel(start, now);
  return (
    <span className="tv-tag" data-kind="next">
      {label}
    </span>
  );
};

interface SheetProps {
  meal: Meal;
  now: Date;
}

const isOver = (group: TimeGroup, now: Date): boolean =>
  group.items.every((item) => (item.kind === 'dish' ? item.done : !!group.start && group.start <= now));

const Sheet = ({ meal, now }: SheetProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const serveAt = new Date(meal.serve_at);

  let groups = groupByStart(meal.items);
  // When the day is long, drop what is finished from the top
  while (groups.length > MAX_ROWS && isOver(groups[0], now)) groups = groups.slice(1);
  const later = Math.max(0, groups.length - MAX_ROWS);
  groups = groups.slice(0, MAX_ROWS);

  const nextKey = groups.find((group) => group.start && group.start > now)?.key;
  const signature = groups.map((group) => `${group.key}:${group.items.map((item) => item.title).join('|')}`).join(';');

  // Shrink the text until every row fits; the sheet never scrolls
  const fit = useCallback(() => {
    const sheet = ref.current;
    if (!sheet) return;
    let scale = 1;
    sheet.style.setProperty('--fit', '1');
    while (sheet.scrollHeight > sheet.clientHeight + 1 && scale > 0.5) {
      scale -= 0.04;
      sheet.style.setProperty('--fit', scale.toFixed(2));
    }
  }, []);

  useLayoutEffect(() => {
    fit();
  }, [fit, signature]);

  useEffect(() => {
    const sheet = ref.current;
    if (!sheet || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => fit());
    observer.observe(sheet);
    return () => observer.disconnect();
  }, [fit]);

  const dish = (item: MealItem, over: boolean) => (
    <span
      key={item.id}
      className={`tv-dish mk-${item.color}`}
      data-done={item.kind === 'dish' && item.done}
      data-past={item.kind === 'event' && over}
    >
      <span className="marker tv-dish-title">{item.title}</span>
      {item.kind === 'dish' && !item.done && (
        <span className={`tv-dish-cook ${item.cook ? '' : 'tv-hot'}`}>
          {item.cook ? item.cook.first_name : 'needs a cook'}
        </span>
      )}
    </span>
  );

  return (
    <div className="tv-sheet" ref={ref}>
      {groups.map((group) => {
        const over = isOver(group, now);
        const near = !!group.start && Math.abs(group.start.getTime() - now.getTime()) < DAY * 1000;
        const due = !over && near && !!group.start && group.start <= now && group.items.some((item) => item.kind === 'dish');
        const state = over ? 'done' : due ? 'due' : 'ahead';

        return (
          <div key={group.key} className="tv-row" data-state={state}>
            <div className="tv-time-cell">
              {group.start ? (
                <Clock date={group.start} className="tv-time" />
              ) : (
                <span className="tv-dish-cook">no time</span>
              )}
            </div>
            <div className="tv-dishes">
              {group.items.map((item) => dish(item, over))}
              {group.start && (due || group.key === nextKey) && <StartTag start={group.start} due={due} />}
            </div>
          </div>
        );
      })}

      {later > 0 && (
        <div className="tv-row">
          <div className="tv-time-cell" />
          <div className="tv-dishes">
            <span className="tv-dish-cook">
              {later} more {later === 1 ? 'time' : 'times'} later
            </span>
          </div>
        </div>
      )}

      <div className="tv-row">
        <div className="tv-time-cell">
          <Clock date={serveAt} className="tv-time tv-hot" />
        </div>
        <div className="tv-dishes">
          <span className="marker tv-dish-title tv-hot">On the table</span>
        </div>
      </div>
    </div>
  );
};

const TimerPanel = ({ timer }: { timer: KitchenTimer }) => {
  const done = timer.state === 'done';
  const urgent = timer.state === 'running' && timer.kind === 'countdown' && timer.seconds <= 60;

  let sub: string;
  if (done) sub = `over by ${countdownLabel(timer.overtime)}`;
  else if (timer.state === 'paused') sub = timer.recipeName ? `${timer.recipeName}, paused` : 'paused';
  else if (timer.recipeName) sub = timer.recipeName;
  else sub = timer.kind === 'stopwatch' ? 'counting up' : `${secondsLabel(timer.duration)} timer`;

  return (
    <div
      className={`tv-timer mk-${timer.color}`}
      data-state={timer.state}
      data-urgent={urgent}
      data-long={!done && timer.seconds >= HOUR}
    >
      <p className="marker tv-timer-name">{timer.name}</p>
      <p className="marker tv-timer-time" aria-live={done ? 'assertive' : 'off'}>
        {done ? 'Done' : countdownLabel(timer.seconds)}
      </p>
      <p className="tv-timer-sub">{sub}</p>
      {timer.kind === 'countdown' && !done && (
        <span className="tv-timer-bar" style={{ width: `${timer.fraction * 100}%` }} aria-hidden="true" />
      )}
    </div>
  );
};

const TvScreen = ({ familyId }: { familyId: number }) => {
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const { data: meals, isLoading } = useMeals(familyId);
  const board = useKitchenTimers(familyId);
  const now = useNow(15000);
  useWakeLock();

  const [openedAt] = useState(() => new Date());
  const [theme, setTheme] = useState<TvTheme>(() => (localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'));
  const [sound, setSound] = useState(() => isAudioEnabled());
  const [idle, setIdle] = useState(false);
  const [fullscreen, setFullscreen] = useState(() => !!fullscreenElement());

  const meal = meals ? pickCurrentMeal(meals, openedAt) : undefined;
  const active = board.timers.filter((timer) => timer.state !== 'idle').sort(byUrgency);
  const shown = active.slice(0, MAX_TIMERS);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  const toggleSound = useCallback(() => {
    setSound((current) => {
      setAudioEnabled(!current);
      // The chime confirms the choice and unlocks audio for later timers
      if (!current) void playFinishChime();
      return !current;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    const doc = document as FullscreenDocument;
    const element = document.documentElement as FullscreenElement;
    if (fullscreenElement()) {
      void (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
    } else {
      void (element.requestFullscreen?.() ?? element.webkitRequestFullscreen?.());
    }
  }, []);

  // Controls show on any activity and hide again after a few seconds
  useEffect(() => {
    let timeout = window.setTimeout(() => setIdle(true), CONTROLS_VISIBLE_MS);
    const wake = () => {
      unlockAudio();
      setIdle(false);
      window.clearTimeout(timeout);
      timeout = window.setTimeout(() => setIdle(true), CONTROLS_VISIBLE_MS);
    };
    const onKey = (event: KeyboardEvent) => {
      wake();
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'f') toggleFullscreen();
      if (key === 't') toggleTheme();
      if (key === 's') toggleSound();
      if (key === 'escape' && !fullscreenElement()) navigate('/');
    };
    const onFullscreen = () => setFullscreen(!!fullscreenElement());

    window.addEventListener('pointermove', wake);
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('webkitfullscreenchange', onFullscreen);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('webkitfullscreenchange', onFullscreen);
    };
  }, [navigate, toggleFullscreen, toggleSound, toggleTheme]);

  // Move the picture a few pixels each minute so nothing stays lit in one place
  useEffect(() => {
    const offsets = [
      [0, 0],
      [0.25, 0.15],
      [-0.2, 0.25],
      [0.15, -0.2],
      [-0.25, -0.1],
    ];
    let step = 0;
    const id = window.setInterval(() => {
      step = (step + 1) % offsets.length;
      const [x, y] = offsets[step];
      root.current?.style.setProperty('--shift-x', `calc(var(--u) * ${x})`);
      root.current?.style.setProperty('--shift-y', `calc(var(--u) * ${y})`);
    }, 60000);
    return () => window.clearInterval(id);
  }, []);

  if (isLoading || board.isLoading) {
    return (
      <div className={`tv ${theme}`}>
        <Spinner />
      </div>
    );
  }

  const serveAt = meal ? new Date(meal.serve_at) : null;

  return (
    <div ref={root} className={`tv ${theme}`} data-idle={idle}>
      <header className="tv-head">
        <div className="tv-meal">
          <h1 className="marker tv-meal-name">{meal ? meal.name : 'MealTogether'}</h1>
          <p className="tv-meal-serve">
            {serveAt ? (
              <>
                {serveAt.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}, on the
                table at <span className="tv-hot">{clockLabel(serveAt)}</span>
              </>
            ) : (
              'No meal is planned yet. Plan one from the app and it shows here.'
            )}
          </p>
        </div>
        {serveAt && <TableCountdown serveAt={serveAt} />}
        <WallClock />
      </header>

      <main className="tv-main">
        {meal ? (
          <Sheet meal={meal} now={now} />
        ) : (
          <div className="tv-quiet">The schedule shows here once a meal has dishes.</div>
        )}

        <section className="tv-side" aria-label="Timers">
          <h2 className="marker tv-side-title">
            Timers
            {active.length > shown.length && (
              <span className="tv-side-note">{active.length - shown.length} more running</span>
            )}
          </h2>
          {shown.length === 0 ? (
            <p className="tv-quiet">Nothing is timing. Start a timer from any phone and it shows here.</p>
          ) : (
            <div className="tv-timers" data-count={shown.length}>
              {shown.map((timer) => (
                <TimerPanel key={timer.id} timer={timer} />
              ))}
            </div>
          )}
        </section>
      </main>

      <div className="tv-controls">
        <p className="tv-controls-tip">
          Mirror this screen to the TV with AirPlay, then go full screen. These controls hide after a few seconds.
        </p>
        <Link to="/" className="btn btn-outline btn-sm">
          Back to the app
        </Link>
        {canFullscreen() && (
          <button type="button" className="btn btn-primary btn-sm" onClick={toggleFullscreen}>
            {fullscreen ? 'Leave full screen' : 'Full screen'}
          </button>
        )}
        <button type="button" className="btn btn-outline btn-sm" onClick={toggleSound} aria-pressed={sound}>
          {sound ? 'Timer sound is on' : 'Timer sound is off'}
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={toggleTheme}>
          {theme === 'dark' ? 'Use light colors' : 'Use dark colors'}
        </button>
      </div>
    </div>
  );
};

export const TvPage = () => {
  const { activeFamily, families, isLoading } = useFamily();

  if (isLoading) return <Spinner />;
  // An account without a family starts at the kitchen page, which handles joining
  if (families.length === 0) return <Navigate to="/" replace />;
  if (!activeFamily) return <Spinner />;

  return <TvScreen key={activeFamily.id} familyId={activeFamily.id} />;
};

export default TvPage;
