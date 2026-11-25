/**
 * MealSheet
 * The day's schedule as a ruled sheet: start time on the left, the dishes
 * that start then on the right, a box to tick when each one is done.
 */

import { Link } from 'react-router-dom';
import { Pencil, ChefHat } from 'lucide-react';
import type { Meal, MealItem } from '../../types';
import { Avatar, Clock, Tick } from '../kit';
import { groupByStart } from '../../lib/meals';
import { durationLabel } from '../../lib/time';

interface MealSheetProps {
  meal: Meal;
  now: Date;
  /** The signed-in person, to mark their dishes */
  meId: number;
  /** Show only the signed-in person's dishes */
  mineOnly?: boolean;
  onToggle: (item: MealItem, done: boolean) => void;
  onEdit: (item: MealItem) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const MealSheet = ({ meal, now, meId, mineOnly = false, onToggle, onEdit }: MealSheetProps) => {
  const serveAt = new Date(meal.serve_at);
  const dishes = meal.items.filter(
    (item) => item.kind === 'dish' && (!mineOnly || item.cook?.id === meId)
  );
  const groups = groupByStart(dishes);
  const nextGroup = groups.find((group) => group.start && group.start > now);

  return (
    <div className="sheet">
      {groups.map((group) => {
        const allDone = group.items.every((item) => item.done);
        const near = group.start && Math.abs(group.start.getTime() - now.getTime()) < DAY_MS;
        const due = !!group.start && !allDone && group.start <= now && near;
        const minutesAway = group.start ? (group.start.getTime() - now.getTime()) / 60000 : 0;
        const isNext = group === nextGroup && near;

        return (
          <div
            key={group.key}
            className={`sheet-row grid grid-cols-[5.25rem_minmax(0,1fr)] sm:grid-cols-[8.75rem_minmax(0,1fr)] ${due ? 'bg-rule-soft/50' : ''}`}
          >
            <div className="flex flex-col items-start gap-1 border-r-2 border-rule px-2 py-4 sm:px-5">
              {group.start ? (
                <Clock date={group.start} className={`text-[1.4rem] sm:text-4xl ${allDone ? 'opacity-45' : ''}`} />
              ) : (
                <span className="text-sm font-semibold text-ink-2">No start time</span>
              )}
              {due && <span className="rounded-full bg-hot px-2 py-0.5 text-xs font-bold text-on-hot">Start now</span>}
              {isNext && !due && (
                <span className="text-xs font-semibold text-ink-2">in {durationLabel(minutesAway)}</span>
              )}
            </div>

            <ul className="divide-y divide-line">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className={`mk-${item.color} flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-3 sm:flex-nowrap sm:px-4`}
                >
                  <Tick
                    checked={item.done}
                    onChange={(done) => onToggle(item, done)}
                    label={`${item.title} done`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`marker text-xl leading-tight sm:text-2xl ${item.done ? 'struck' : ''}`}
                      style={{ color: 'var(--mk)' }}
                    >
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-2">
                      {item.recipe ? `Takes ${durationLabel(item.recipe.total_time)}` : 'No recipe attached'}
                    </p>
                  </div>
                  <div className="flex w-full items-center gap-2 pl-11 sm:w-auto sm:pl-0">
                    {item.cook ? (
                      <button
                        type="button"
                        className="rounded-full"
                        onClick={() => onEdit(item)}
                        aria-label={`${item.title} is cooked by ${item.cook.first_name}. Change cook`}
                      >
                        <Avatar user={item.cook} size="sm" filled={item.cook.id === meId} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rounded-full border-[1.5px] border-dashed border-ink-3 px-2.5 py-0.5 text-xs font-semibold text-ink-2 hover:border-ink hover:text-ink"
                        onClick={() => onEdit(item)}
                      >
                        Needs a cook
                      </button>
                    )}
                    {item.recipe && !item.done && (
                      <Link
                        to={`/cook/${item.recipe.id}?meal=${meal.id}&item=${item.id}`}
                        className={`btn btn-sm ${due ? 'btn-primary' : 'btn-outline'}`}
                      >
                        <ChefHat size={16} aria-hidden="true" />
                        Cook
                      </Link>
                    )}
                    <button
                      type="button"
                      className="btn btn-quiet btn-icon btn-sm ml-auto sm:ml-0"
                      onClick={() => onEdit(item)}
                      aria-label={`Edit ${item.title}`}
                    >
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      {groups.length === 0 && (
        <p className="sheet-row px-5 py-6 text-ink-2">
          {mineOnly ? 'No dishes are assigned to you for this meal.' : 'No dishes yet.'}
        </p>
      )}

      <div className="sheet-row grid grid-cols-[5.25rem_minmax(0,1fr)] sm:grid-cols-[8.75rem_minmax(0,1fr)]">
        <div className="border-r-2 border-rule px-2 py-4 sm:px-5">
          <Clock date={serveAt} className="text-3xl text-hot sm:text-4xl" />
        </div>
        <p className="marker flex items-center px-4 text-xl text-hot sm:text-2xl">On the table</p>
      </div>
    </div>
  );
};
