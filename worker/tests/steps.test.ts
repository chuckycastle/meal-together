import { describe, expect, it } from 'vitest';
import { STEP_PROGRESS_HOURS, currentMarks, isStale } from '../src/steps';

const now = new Date('2026-11-26T18:00:00.000Z');
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3600 * 1000).toISOString();

describe('step progress', () => {
  it('is not stale with no marks or a recent mark', () => {
    expect(isStale(null, now)).toBe(false);
    expect(isStale(hoursAgo(1), now)).toBe(false);
    expect(isStale(hoursAgo(STEP_PROGRESS_HOURS - 0.1), now)).toBe(false);
  });

  it('is stale a day after the latest mark, or when the time cannot be read', () => {
    expect(isStale(hoursAgo(STEP_PROGRESS_HOURS + 0.1), now)).toBe(true);
    expect(isStale('not a date', now)).toBe(true);
  });

  it('keeps every mark while the latest one is recent', () => {
    const marks = [
      { position: 0, done_at: hoursAgo(30) },
      { position: 1, done_at: hoursAgo(2) },
    ];
    expect([...currentMarks(marks, 5, now).keys()]).toEqual([0, 1]);
  });

  it('drops every mark from an earlier cook', () => {
    const marks = [
      { position: 0, done_at: hoursAgo(80) },
      { position: 1, done_at: hoursAgo(70) },
    ];
    expect(currentMarks(marks, 5, now).size).toBe(0);
  });

  it('drops marks past the end of the recipe', () => {
    const marks = [
      { position: 1, done_at: hoursAgo(1) },
      { position: 4, done_at: hoursAgo(1) },
      { position: -1, done_at: hoursAgo(1) },
    ];
    expect([...currentMarks(marks, 3, now).keys()]).toEqual([1]);
  });

  it('handles a recipe with no marks', () => {
    expect(currentMarks([], 3, now).size).toBe(0);
  });
});
