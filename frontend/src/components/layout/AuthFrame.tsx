/**
 * AuthFrame
 * Shared frame for the sign-in and sign-up screens, with a small sample
 * of the schedule sheet the app is built around.
 */

import type { ReactNode } from 'react';
import { Clock } from '../kit';

interface AuthFrameProps {
  title: string;
  children: ReactNode;
  footer: ReactNode;
}

const at = (hours: number, minutes: number) => new Date(2026, 10, 26, hours, minutes);

const SAMPLE = [
  { time: at(11, 30), title: 'Cranberry sauce', color: 'red', done: true },
  { time: at(13, 45), title: 'Ham', color: 'brown', done: true },
  { time: at(14, 45), title: 'Turkey', color: 'brown', done: false },
  { time: at(16, 0), title: 'Stuffing', color: 'orange', done: false },
];

export const AuthFrame = ({ title, children, footer }: AuthFrameProps) => (
  <div className="grid min-h-dvh bg-counter text-ink lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <main className="flex flex-col justify-center px-5 py-10 sm:px-10">
      <div className="mx-auto w-full max-w-sm">
        <p className="marker text-xl">MealTogether</p>
        <h1 className="marker mt-8 text-4xl">{title}</h1>
        <div className="mt-6">{children}</div>
        <p className="mt-6 text-ink-2">{footer}</p>
      </div>
    </main>

    <aside className="hidden items-center justify-center border-l border-line bg-paper-2 px-10 lg:flex" aria-hidden="true">
      <div className="w-full max-w-md">
        <p className="marker mb-3 text-2xl">
          Everything ready at <span className="text-hot">6pm</span>
        </p>
        <div className="sheet">
          {SAMPLE.map((row) => (
            <div key={row.title} className={`sheet-row mk-${row.color} grid grid-cols-[7.5rem_1fr]`}>
              <div className="border-r-2 border-rule px-4 py-3">
                <Clock date={row.time} className={`text-3xl ${row.done ? 'opacity-45' : ''}`} />
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="tick pointer-events-none" aria-checked={row.done}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3.5 9.5l3.6 3.8L14.5 4.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className={`marker text-2xl ${row.done ? 'struck' : ''}`} style={{ color: 'var(--mk)' }}>
                  {row.title}
                </span>
              </div>
            </div>
          ))}
          <div className="sheet-row grid grid-cols-[7.5rem_1fr]">
            <div className="border-r-2 border-rule px-4 py-3">
              <Clock date={at(18, 0)} className="text-3xl text-hot" />
            </div>
            <p className="marker flex items-center px-4 text-2xl text-hot">On the table</p>
          </div>
        </div>
        <p className="mt-4 text-ink-2">
          Plan a meal with your family. Each dish gets a start time, a cook, and its timers.
        </p>
      </div>
    </aside>
  </div>
);

interface PasswordFieldProps {
  id: string;
  label: string;
  autoComplete: string;
  error?: string;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
  visible: boolean;
  onToggle: () => void;
}

export const PasswordField = ({ id, label, autoComplete, error, inputProps, visible, onToggle }: PasswordFieldProps) => (
  <div>
    <div className="flex items-baseline justify-between">
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <button type="button" className="text-sm font-semibold text-ink-2 underline underline-offset-2" onClick={onToggle}>
        {visible ? 'Hide' : 'Show'}
        <span className="sr-only"> {label.toLowerCase()}</span>
      </button>
    </div>
    <input
      {...inputProps}
      id={id}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      className="field"
      aria-invalid={!!error}
      aria-describedby={error ? `${id}-error` : undefined}
    />
    {error && (
      <p id={`${id}-error`} className="mt-1 text-sm text-hot" role="alert">
        {error}
      </p>
    )}
  </div>
);
