/**
 * Shared progress through a recipe's steps.
 *
 * Progress belongs to one cook of the recipe. When no step has been marked
 * for a day, the cook is over and the next one starts with every step open.
 */

export const STEP_PROGRESS_HOURS = 24;

export interface StepMark {
  position: number;
  done_at: string;
}

/** True when the latest mark is older than the progress window */
export function isStale(latestDoneAt: string | null | undefined, now: Date): boolean {
  if (!latestDoneAt) return false;
  const latest = new Date(latestDoneAt).getTime();
  if (Number.isNaN(latest)) return true;
  return now.getTime() - latest > STEP_PROGRESS_HOURS * 60 * 60 * 1000;
}

/**
 * Marks that count now, keyed by place in the recipe. Marks from an earlier
 * cook, and marks past the end of a recipe that lost steps, are left out.
 */
export function currentMarks<Mark extends StepMark>(marks: Mark[], stepCount: number, now: Date): Map<number, Mark> {
  const current = new Map<number, Mark>();
  if (marks.length === 0) return current;

  const latest = marks.reduce((max, mark) => (mark.done_at > max ? mark.done_at : max), marks[0].done_at);
  if (isStale(latest, now)) return current;

  for (const mark of marks) {
    if (mark.position >= 0 && mark.position < stepCount) current.set(mark.position, mark);
  }
  return current;
}
