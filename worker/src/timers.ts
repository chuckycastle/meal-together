/**
 * Timer state machine.
 *
 * State is stored as timestamps so no background job is needed:
 * - countdown, running: anchor_at is the moment it reaches zero
 * - stopwatch, running: anchor_at is the moment it started counting
 * - idle or paused: held_seconds is the time left (countdown) or elapsed (stopwatch)
 *
 * A running countdown whose anchor_at has passed is finished; the time since
 * then is its overtime.
 */

export const MAX_DURATION_SECONDS = 48 * 60 * 60;

export interface TimerState {
  kind: 'countdown' | 'stopwatch';
  duration: number;
  status: 'idle' | 'running' | 'paused';
  anchor_at: string | null;
  held_seconds: number;
}

const shift = (date: Date, seconds: number): string => new Date(date.getTime() + seconds * 1000).toISOString();

const secondsBetween = (later: Date, earlier: Date): number =>
  Math.max(0, Math.round((later.getTime() - earlier.getTime()) / 1000));

/** Start or resume */
export function start(timer: TimerState, now: Date): TimerState {
  if (timer.status === 'running') return timer;
  const anchor = timer.kind === 'countdown' ? shift(now, timer.held_seconds) : shift(now, -timer.held_seconds);
  return { ...timer, status: 'running', anchor_at: anchor };
}

/** Pause a running timer, keeping its place */
export function pause(timer: TimerState, now: Date): TimerState {
  if (timer.status !== 'running' || !timer.anchor_at) return timer;
  const anchor = new Date(timer.anchor_at);
  const held = timer.kind === 'countdown' ? secondsBetween(anchor, now) : secondsBetween(now, anchor);
  return { ...timer, status: 'paused', anchor_at: null, held_seconds: held };
}

/** Return to the starting position, ready to run again */
export function reset(timer: TimerState): TimerState {
  return {
    ...timer,
    status: 'idle',
    anchor_at: null,
    held_seconds: timer.kind === 'countdown' ? timer.duration : 0,
  };
}

/** Add time to a countdown. A finished countdown restarts with the added time. */
export function addTime(timer: TimerState, seconds: number, now: Date): TimerState {
  if (timer.kind !== 'countdown') return timer;
  if (timer.status === 'running' && timer.anchor_at) {
    const anchor = new Date(timer.anchor_at);
    return { ...timer, anchor_at: shift(anchor > now ? anchor : now, seconds) };
  }
  return { ...timer, held_seconds: Math.min(MAX_DURATION_SECONDS, timer.held_seconds + seconds) };
}
