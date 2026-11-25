/**
 * NewTimerDialog
 * Make a timer: count down from a set time, or count up from zero
 */

import { useState } from 'react';
import type { FormEvent } from 'react';
import type { BoardTimerKind, CreateBoardTimerRequest, MarkerColor } from '../../types';
import { Dialog, Notice } from '../kit';
import { MARKER_COLORS, guessMarkerColor } from '../../lib/markers';

interface NewTimerDialogProps {
  onClose: () => void;
  onCreate: (request: CreateBoardTimerRequest) => Promise<unknown>;
}

const PRESET_MINUTES = [1, 3, 5, 10, 15, 20, 30, 45, 60, 90];

export const NewTimerDialog = ({ onClose, onCreate }: NewTimerDialogProps) => {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<BoardTimerKind>('countdown');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('10');
  const [seconds, setSeconds] = useState('');
  const [color, setColor] = useState<MarkerColor | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const total = (Number(hours) || 0) * 3600 + (Number(minutes) || 0) * 60 + (Number(seconds) || 0);

  const setPreset = (presetMinutes: number) => {
    setHours(presetMinutes >= 60 ? String(Math.floor(presetMinutes / 60)) : '');
    setMinutes(String(presetMinutes % 60));
    setSeconds('');
  };

  const save = async (start: boolean) => {
    const label = name.trim() || (kind === 'countdown' ? 'Timer' : 'Stopwatch');
    if (kind === 'countdown' && (total < 1 || total > 48 * 3600)) {
      return setError('Set a time between 1 second and 48 hours.');
    }

    setSaving(true);
    setError('');
    try {
      await onCreate({
        name: label,
        kind,
        duration: kind === 'countdown' ? total : undefined,
        color: color ?? guessMarkerColor(label),
        start,
      });
      onClose();
    } catch {
      setError('The timer was not saved. Check your connection and try again.');
      setSaving(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void save(true);
  };

  const numberField = (id: string, label: string, value: string, onChange: (value: string) => void, max: number) => (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={0}
        max={max}
        className="field marker text-center text-2xl tabular-nums"
        value={value}
        placeholder="0"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );

  return (
    <Dialog
      open
      onClose={onClose}
      title="New timer"
      footer={
        <>
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-outline" onClick={() => save(false)} disabled={saving}>
            Add without starting
          </button>
          <button type="submit" form="timer-form" className="btn btn-primary" disabled={saving}>
            Start timer
          </button>
        </>
      }
    >
      <form id="timer-form" onSubmit={submit} className="space-y-4">
        {error && <Notice>{error}</Notice>}

        <div>
          <label className="label" htmlFor="timer-name">
            What is it for?
          </label>
          <input
            id="timer-name"
            className="field"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Rolls in the oven"
            maxLength={255}
            autoFocus
          />
        </div>

        <fieldset>
          <legend className="label">Direction</legend>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['countdown', 'Count down', 'Rings when time is up'],
                ['stopwatch', 'Count up', 'Tracks how long it has been'],
              ] as const
            ).map(([value, title, hint]) => (
              <label
                key={value}
                className={`cursor-pointer rounded-control border-[1.5px] px-3 py-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-rule ${
                  kind === value ? 'border-ink bg-paper-2' : 'border-line'
                }`}
              >
                <input
                  type="radio"
                  name="timer-kind"
                  className="sr-only"
                  checked={kind === value}
                  onChange={() => setKind(value)}
                />
                <span className="block font-semibold">{title}</span>
                <span className="block text-sm text-ink-2">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {kind === 'countdown' && (
          <div>
            <div className="grid grid-cols-3 gap-2">
              {numberField('timer-hours', 'Hours', hours, setHours, 48)}
              {numberField('timer-minutes', 'Minutes', minutes, setMinutes, 59)}
              {numberField('timer-seconds', 'Seconds', seconds, setSeconds, 59)}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESET_MINUTES.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className={`btn btn-sm rounded-full ${total === preset * 60 ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setPreset(preset)}
                >
                  {preset < 60 ? `${preset} min` : preset === 60 ? '1 hr' : '1 hr 30'}
                </button>
              ))}
            </div>
          </div>
        )}

        <fieldset>
          <legend className="label">Marker</legend>
          <div className="flex flex-wrap gap-2">
            {MARKER_COLORS.map((option) => {
              const selected = (color ?? guessMarkerColor(name)) === option.value;
              return (
                <label
                  key={option.value}
                  className={`mk-${option.value} flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-3 py-1.5 text-sm font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-rule ${
                    selected ? 'border-ink bg-paper-2' : 'border-line'
                  }`}
                >
                  <input
                    type="radio"
                    name="timer-color"
                    className="sr-only"
                    checked={selected}
                    onChange={() => setColor(option.value)}
                  />
                  <span className="h-4 w-4 rounded-full" style={{ background: 'var(--mk)' }} aria-hidden="true" />
                  {option.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      </form>
    </Dialog>
  );
};
