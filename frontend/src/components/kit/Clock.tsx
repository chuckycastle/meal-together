/**
 * Clock
 * A time written the way the family's schedule sheet writes it:
 * the hour large, minutes raised, am/pm small. On the hour, no minutes.
 */

import { clockLabel, clockParts } from '../../lib/time';

interface ClockProps {
  date: Date;
  className?: string;
}

export const Clock = ({ date, className = '' }: ClockProps) => {
  const { hour, minutes, period } = clockParts(date);

  return (
    <time
      dateTime={date.toISOString()}
      aria-label={clockLabel(date)}
      className={`marker inline-flex items-start whitespace-nowrap leading-none tabular-nums ${className}`}
    >
      <span aria-hidden="true">{hour}</span>
      {minutes && (
        <span aria-hidden="true" className="ml-[0.06em] mt-[0.08em] text-[0.5em] underline decoration-[0.09em] underline-offset-[0.2em]">
          {minutes}
        </span>
      )}
      <span aria-hidden="true" className="ml-[0.12em] self-end text-[0.55em] font-medium">
        {period}
      </span>
    </time>
  );
};
