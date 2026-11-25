import { describe, expect, it } from 'vitest';
import { addTime, pause, reset, start } from '../src/timers';
import type { TimerState } from '../src/timers';

const NOW = new Date('2026-11-26T20:00:00.000Z');
const later = (seconds: number) => new Date(NOW.getTime() + seconds * 1000);

const countdown = (seconds = 600): TimerState => ({
  kind: 'countdown',
  duration: seconds,
  status: 'idle',
  anchor_at: null,
  held_seconds: seconds,
});

const stopwatch = (): TimerState => ({ kind: 'stopwatch', duration: 0, status: 'idle', anchor_at: null, held_seconds: 0 });

describe('countdown', () => {
  it('start sets the finish time', () => {
    const timer = start(countdown(600), NOW);
    expect(timer.status).toBe('running');
    expect(timer.anchor_at).toBe(later(600).toISOString());
  });

  it('pause keeps the time left and resume continues from it', () => {
    const paused = pause(start(countdown(600), NOW), later(150));
    expect(paused).toMatchObject({ status: 'paused', held_seconds: 450, anchor_at: null });
    expect(start(paused, later(3600)).anchor_at).toBe(later(3600 + 450).toISOString());
  });

  it('pause after the finish holds zero', () => {
    expect(pause(start(countdown(60), NOW), later(300)).held_seconds).toBe(0);
  });

  it('add time extends a running timer', () => {
    expect(addTime(start(countdown(600), NOW), 60, later(10)).anchor_at).toBe(later(660).toISOString());
  });

  it('add time restarts a finished timer from now', () => {
    const timer = addTime(start(countdown(60), NOW), 300, later(200));
    expect(timer.status).toBe('running');
    expect(timer.anchor_at).toBe(later(500).toISOString());
  });

  it('add time to a paused timer', () => {
    expect(addTime(pause(start(countdown(600), NOW), later(100)), 60, later(100)).held_seconds).toBe(560);
  });

  it('reset returns to the full duration', () => {
    const timer = reset(addTime(start(countdown(600), NOW), 120, NOW));
    expect(timer).toMatchObject({ status: 'idle', held_seconds: 600, anchor_at: null });
  });

  it('start twice does not move the finish time', () => {
    const running = start(countdown(600), NOW);
    expect(start(running, later(30)).anchor_at).toBe(running.anchor_at);
  });
});

describe('stopwatch', () => {
  it('counts up across a pause', () => {
    const paused = pause(start(stopwatch(), NOW), later(90));
    expect(paused.held_seconds).toBe(90);
    expect(start(paused, later(600)).anchor_at).toBe(later(600 - 90).toISOString());
  });

  it('ignores add time and resets to zero', () => {
    const running = start(stopwatch(), NOW);
    expect(addTime(running, 60, NOW)).toEqual(running);
    expect(reset(pause(running, later(90)))).toMatchObject({ status: 'idle', held_seconds: 0 });
  });
});
