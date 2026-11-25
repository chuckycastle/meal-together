/**
 * Family timer board
 */

import { all, first, run } from '../db';
import type { Env, Row } from '../db';
import { HttpError, integer, json, nowIso, oneOf, requiredText } from '../http';
import { route } from '../router';
import type { Ctx } from '../router';
import { MAX_DURATION_SECONDS, addTime, pause, reset, start } from '../timers';
import type { TimerState } from '../timers';

export const MARKER_COLORS = ['red', 'orange', 'brown', 'green', 'tan', 'ink'] as const;
const TIMER_KINDS = ['countdown', 'stopwatch'] as const;
const MAX_TIMERS_PER_FAMILY = 60;

const TIMER_SELECT = `SELECT t.*, r.name AS recipe_name FROM family_timers t LEFT JOIN recipes r ON r.id = t.recipe_id`;

function timerDict(row: Row): Row {
  return {
    id: row.id,
    family_id: row.family_id,
    name: row.name,
    kind: row.kind,
    duration: row.duration,
    color: row.color,
    recipe_id: row.recipe_id,
    recipe_name: row.recipe_name ?? null,
    status: row.status,
    anchor_at: row.anchor_at,
    held_seconds: row.held_seconds,
    created_by_id: row.created_by_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function loadTimer(env: Env, familyId: number, timerId: number): Promise<Row> {
  const row = await first(env, `${TIMER_SELECT} WHERE t.id = ? AND t.family_id = ?`, timerId, familyId);
  if (!row) throw new HttpError(404, 'Timer not found');
  return row;
}

/** A timer with the server clock, so clients can correct for clock drift */
const timerResponse = (row: Row, status = 200) => json({ timer: timerDict(row), server_time: nowIso() }, status);

async function save(ctx: Ctx, timerId: number, state: TimerState): Promise<Response> {
  await run(
    ctx.env,
    'UPDATE family_timers SET status = ?, anchor_at = ?, held_seconds = ?, updated_at = ? WHERE id = ?',
    state.status,
    state.anchor_at,
    state.held_seconds,
    nowIso(),
    timerId
  );
  return timerResponse(await loadTimer(ctx.env, ctx.params.familyId, timerId));
}

route('GET', '/api/families/:familyId/timers', 'member', async (ctx) => {
  const rows = await all(ctx.env, `${TIMER_SELECT} WHERE t.family_id = ? ORDER BY t.id`, ctx.params.familyId);
  return json({ timers: rows.map(timerDict), server_time: nowIso() });
});

route('POST', '/api/families/:familyId/timers', 'member', async (ctx) => {
  const { familyId } = ctx.params;
  const { body, env } = ctx;

  const name = requiredText(body.name, 'name', 255);
  const kind = body.kind === undefined ? 'countdown' : oneOf(body.kind, 'kind', TIMER_KINDS);
  const color = body.color === undefined ? 'ink' : oneOf(body.color, 'color', MARKER_COLORS);
  const duration =
    kind === 'countdown' ? integer(body.duration, 'duration', { min: 1, max: MAX_DURATION_SECONDS }) : 0;

  let recipeId: number | null = null;
  if (body.recipe_id !== undefined && body.recipe_id !== null) {
    recipeId = integer(body.recipe_id, 'recipe_id', { min: 1, max: Number.MAX_SAFE_INTEGER });
    const recipe = await first(env, 'SELECT id FROM recipes WHERE id = ? AND family_id = ?', recipeId, familyId);
    if (!recipe) throw new HttpError(404, 'Recipe not found');
  }

  const count = await first(env, 'SELECT COUNT(*) AS total FROM family_timers WHERE family_id = ?', familyId);
  if ((count?.total ?? 0) >= MAX_TIMERS_PER_FAMILY) {
    throw new HttpError(400, `The board holds up to ${MAX_TIMERS_PER_FAMILY} timers. Remove one first.`);
  }

  let state: TimerState = { kind, duration, status: 'idle', anchor_at: null, held_seconds: duration };
  if (body.start !== false) state = start(state, new Date());

  const now = nowIso();
  const created = await first(
    env,
    `INSERT INTO family_timers (family_id, name, kind, duration, color, recipe_id, status, anchor_at, held_seconds,
                                created_by_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    familyId,
    name,
    kind,
    duration,
    color,
    recipeId,
    state.status,
    state.anchor_at,
    state.held_seconds,
    ctx.userId,
    now,
    now
  );
  return timerResponse(await loadTimer(env, familyId, created!.id), 201);
});

const transitions = { start, pause, reset: (timer: TimerState) => reset(timer) } as const;

for (const action of ['start', 'pause', 'reset'] as const) {
  route('POST', `/api/families/:familyId/timers/:timerId/${action}`, 'member', async (ctx) => {
    const timer = await loadTimer(ctx.env, ctx.params.familyId, ctx.params.timerId);
    return save(ctx, timer.id, transitions[action](timer as unknown as TimerState, new Date()));
  });
}

route('POST', '/api/families/:familyId/timers/:timerId/add', 'member', async (ctx) => {
  const timer = await loadTimer(ctx.env, ctx.params.familyId, ctx.params.timerId);
  if (timer.kind !== 'countdown') throw new HttpError(400, 'Time can only be added to a countdown');
  const seconds = integer(ctx.body.seconds, 'seconds', { min: 1, max: MAX_DURATION_SECONDS });
  return save(ctx, timer.id, addTime(timer as unknown as TimerState, seconds, new Date()));
});

route('DELETE', '/api/families/:familyId/timers/:timerId', 'member', async (ctx) => {
  const timer = await loadTimer(ctx.env, ctx.params.familyId, ctx.params.timerId);
  await run(ctx.env, 'DELETE FROM family_timers WHERE id = ?', timer.id);
  return json({ message: 'Timer removed' });
});
