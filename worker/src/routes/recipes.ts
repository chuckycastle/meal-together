/**
 * Recipes with ingredients, steps, and preset timers
 */

import { all, batch, first, run, stmt, userColumns, userDict } from '../db';
import type { Env, Row } from '../db';
import { HttpError, httpUrl, integer, json, list, nowIso, optionalInteger, requiredText, text } from '../http';
import type { Body } from '../http';
import { route } from '../router';
import type { Ctx } from '../router';
import { currentMarks, isStale } from '../steps';

const MAX_MINUTES = 7 * 24 * 60;
const MAX_TIMER_SECONDS = 48 * 60 * 60;

function recipeDict(row: Row): Row {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    prep_time: row.prep_time,
    cook_time: row.cook_time,
    total_time: row.prep_time + row.cook_time,
    servings: row.servings,
    image_url: row.image_url,
    source_url: row.source_url,
    family_id: row.family_id,
    assigned_to_id: row.assigned_to_id,
    assigned_to: userDict(row, 'u'),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const RECIPE_SELECT = `SELECT r.*, ${userColumns('u', 'u')} FROM recipes r LEFT JOIN users u ON u.id = r.assigned_to_id`;

async function loadRecipe(env: Env, familyId: number, recipeId: number, details: boolean): Promise<Row> {
  const row = await first(env, `${RECIPE_SELECT} WHERE r.id = ? AND r.family_id = ?`, recipeId, familyId);
  if (!row) throw new HttpError(404, 'Recipe not found');
  const recipe = recipeDict(row);
  if (!details) return recipe;

  const [ingredients, steps, timers, marks] = await Promise.all([
    all(env, 'SELECT * FROM ingredients WHERE recipe_id = ? ORDER BY position, id', recipeId),
    all(env, 'SELECT * FROM cooking_steps WHERE recipe_id = ? ORDER BY position, id', recipeId),
    all(env, 'SELECT * FROM recipe_timers WHERE recipe_id = ? ORDER BY id', recipeId),
    all(
      env,
      `SELECT p.position, p.done_at, ${userColumns('u', 'by')} FROM recipe_step_progress p
       LEFT JOIN users u ON u.id = p.done_by_id WHERE p.recipe_id = ?`,
      recipeId
    ),
  ]);
  // Steps marked done during this cook, by place in the ordered list
  const done = currentMarks(marks as Array<Row & { position: number; done_at: string }>, steps.length, new Date());

  recipe.ingredients = ingredients.map((item) => ({
    id: item.id,
    recipe_id: item.recipe_id,
    name: item.name,
    quantity: item.quantity,
    order: item.position,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));
  recipe.steps = steps.map((item, index) => ({
    id: item.id,
    recipe_id: item.recipe_id,
    instruction: item.instruction,
    order: item.position,
    estimated_time: item.estimated_time,
    done: done.has(index),
    done_at: done.get(index)?.done_at ?? null,
    done_by: done.has(index) ? userDict(done.get(index)!, 'by') : null,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));
  recipe.timers = timers.map((item) => ({
    id: item.id,
    recipe_id: item.recipe_id,
    name: item.name,
    duration: item.duration,
    step_order: item.step_order,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));
  return recipe;
}

async function requireMember(env: Env, familyId: number, userId: number): Promise<void> {
  const member = await first(env, 'SELECT id FROM family_members WHERE family_id = ? AND user_id = ?', familyId, userId);
  if (!member) throw new HttpError(404, 'Assigned user is not a member of this family');
}

function childStatements(env: Env, recipeId: number, body: Body, now: string): D1PreparedStatement[] {
  const statements: D1PreparedStatement[] = [];

  if ('ingredients' in body) {
    statements.push(stmt(env, 'DELETE FROM ingredients WHERE recipe_id = ?', recipeId));
    list(body.ingredients, 'ingredients', 100).forEach((item, position) => {
      statements.push(
        stmt(
          env,
          'INSERT INTO ingredients (recipe_id, name, quantity, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
          recipeId,
          requiredText(item.name, 'ingredient name', 255),
          text(item.quantity, 'ingredient quantity', { max: 255 }),
          position,
          now,
          now
        )
      );
    });
  }

  if ('steps' in body) {
    statements.push(stmt(env, 'DELETE FROM cooking_steps WHERE recipe_id = ?', recipeId));
    list(body.steps, 'steps', 100).forEach((item, position) => {
      statements.push(
        stmt(
          env,
          `INSERT INTO cooking_steps (recipe_id, instruction, position, estimated_time, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          recipeId,
          requiredText(item.instruction, 'step instruction', 5000),
          position,
          optionalInteger(item.estimated_time, 'step time', { min: 0, max: MAX_MINUTES }),
          now,
          now
        )
      );
    });
  }

  if ('timers' in body) {
    statements.push(stmt(env, 'DELETE FROM recipe_timers WHERE recipe_id = ?', recipeId));
    for (const item of list(body.timers, 'timers', 50)) {
      statements.push(
        stmt(
          env,
          `INSERT INTO recipe_timers (recipe_id, name, duration, step_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          recipeId,
          requiredText(item.name, 'timer name', 255),
          integer(item.duration, 'timer duration', { min: 1, max: MAX_TIMER_SECONDS }),
          optionalInteger(item.step_order, 'timer step', { min: 0, max: 1000 }),
          now,
          now
        )
      );
    }
  }

  return statements;
}

route('GET', '/api/families/:familyId/recipes', 'member', async (ctx) => {
  const { familyId } = ctx.params;
  const page = Math.max(1, Number.parseInt(ctx.url.searchParams.get('page') ?? '1', 10) || 1);
  const perPage = Math.min(100, Math.max(1, Number.parseInt(ctx.url.searchParams.get('per_page') ?? '50', 10) || 50));

  const count = await first(ctx.env, 'SELECT COUNT(*) AS total FROM recipes WHERE family_id = ?', familyId);
  const total = (count?.total as number) ?? 0;
  const rows = await all(
    ctx.env,
    `${RECIPE_SELECT} WHERE r.family_id = ? ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`,
    familyId,
    perPage,
    (page - 1) * perPage
  );
  const totalPages = Math.ceil(total / perPage);

  return json({
    recipes: rows.map(recipeDict),
    pagination: {
      page,
      per_page: perPage,
      total,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  });
});

route('POST', '/api/families/:familyId/recipes', 'member', async (ctx) => {
  const { familyId } = ctx.params;
  const { body, env } = ctx;

  const assignedTo =
    body.assigned_to_id === undefined || body.assigned_to_id === null
      ? ctx.userId
      : integer(body.assigned_to_id, 'assigned_to_id', { min: 1, max: Number.MAX_SAFE_INTEGER });
  if (assignedTo !== ctx.userId) await requireMember(env, familyId, assignedTo);

  const now = nowIso();
  const values = [
    familyId,
    requiredText(body.name, 'name', 255),
    text(body.description, 'description', { max: 5000 }),
    integer(body.prep_time, 'prep_time', { min: 0, max: MAX_MINUTES }),
    integer(body.cook_time, 'cook_time', { min: 0, max: MAX_MINUTES }),
    body.servings === undefined ? 4 : integer(body.servings, 'servings', { min: 1, max: 1000 }),
    httpUrl(body.image_url, 'image_url'),
    httpUrl(body.source_url, 'source_url'),
    assignedTo,
    now,
    now,
  ];
  // Validate children before anything is written
  const children = (recipeId: number) => childStatements(env, recipeId, body, now);
  children(0);

  const created = await first(
    env,
    `INSERT INTO recipes (family_id, name, description, prep_time, cook_time, servings, image_url, source_url,
                          assigned_to_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    ...values
  );
  const recipeId = created!.id as number;

  try {
    await batch(env, children(recipeId));
  } catch (error) {
    await run(env, 'DELETE FROM recipes WHERE id = ?', recipeId);
    throw error;
  }

  return json(
    { message: 'Recipe created successfully', recipe: await loadRecipe(env, familyId, recipeId, true) },
    201
  );
});

route('GET', '/api/families/:familyId/recipes/:recipeId', 'member', async (ctx) =>
  json({ recipe: await loadRecipe(ctx.env, ctx.params.familyId, ctx.params.recipeId, true) })
);

route('PUT', '/api/families/:familyId/recipes/:recipeId', 'member', async (ctx) => {
  const { familyId, recipeId } = ctx.params;
  const { body, env } = ctx;
  const existing = await loadRecipe(env, familyId, recipeId, false);

  let assignedTo = existing.assigned_to_id as number | null;
  if ('assigned_to_id' in body) {
    assignedTo =
      body.assigned_to_id === null
        ? null
        : integer(body.assigned_to_id, 'assigned_to_id', { min: 1, max: Number.MAX_SAFE_INTEGER });
    if (assignedTo !== null) await requireMember(env, familyId, assignedTo);
  }

  const now = nowIso();
  const update = stmt(
    env,
    `UPDATE recipes SET name = ?, description = ?, prep_time = ?, cook_time = ?, servings = ?, image_url = ?,
                        source_url = ?, assigned_to_id = ?, updated_at = ? WHERE id = ?`,
    'name' in body ? requiredText(body.name, 'name', 255) : existing.name,
    'description' in body ? text(body.description, 'description', { max: 5000 }) : existing.description,
    'prep_time' in body ? integer(body.prep_time, 'prep_time', { min: 0, max: MAX_MINUTES }) : existing.prep_time,
    'cook_time' in body ? integer(body.cook_time, 'cook_time', { min: 0, max: MAX_MINUTES }) : existing.cook_time,
    'servings' in body ? integer(body.servings, 'servings', { min: 1, max: 1000 }) : existing.servings,
    'image_url' in body ? httpUrl(body.image_url, 'image_url') : existing.image_url,
    'source_url' in body ? httpUrl(body.source_url, 'source_url') : existing.source_url,
    assignedTo,
    now,
    recipeId
  );

  await batch(env, [update, ...childStatements(env, recipeId, body, now)]);
  return json({ message: 'Recipe updated successfully', recipe: await loadRecipe(env, familyId, recipeId, true) });
});

async function canDelete(ctx: Ctx, recipe: Row): Promise<boolean> {
  return recipe.assigned_to_id === ctx.userId || ctx.role === 'owner' || ctx.role === 'admin';
}

route('DELETE', '/api/families/:familyId/recipes/:recipeId', 'member', async (ctx) => {
  const { familyId, recipeId } = ctx.params;
  const recipe = await loadRecipe(ctx.env, familyId, recipeId, false);
  if (!(await canDelete(ctx, recipe))) {
    throw new HttpError(403, 'Permission denied. Only the assigned user or family admins can delete recipes.');
  }
  await run(ctx.env, 'DELETE FROM recipes WHERE id = ?', recipeId);
  return json({ message: 'Recipe deleted successfully' });
});

route('POST', '/api/families/:familyId/recipes/:recipeId/assign', 'member', async (ctx) => {
  const { familyId, recipeId } = ctx.params;
  await loadRecipe(ctx.env, familyId, recipeId, false);
  // null removes the cook
  const userId =
    ctx.body.user_id === null
      ? null
      : integer(ctx.body.user_id, 'user_id', { min: 1, max: Number.MAX_SAFE_INTEGER });
  if (userId !== null) await requireMember(ctx.env, familyId, userId);

  await run(ctx.env, 'UPDATE recipes SET assigned_to_id = ?, updated_at = ? WHERE id = ?', userId, nowIso(), recipeId);
  return json({
    message: 'Recipe assigned successfully',
    recipe: await loadRecipe(ctx.env, familyId, recipeId, false),
  });
});

/** The ordered step ids of a recipe in this family */
async function stepIds(env: Env, familyId: number, recipeId: number): Promise<number[]> {
  const recipe = await first(env, 'SELECT id FROM recipes WHERE id = ? AND family_id = ?', recipeId, familyId);
  if (!recipe) throw new HttpError(404, 'Recipe not found');
  const steps = await all(env, 'SELECT id FROM cooking_steps WHERE recipe_id = ? ORDER BY position, id', recipeId);
  return steps.map((step) => step.id as number);
}

// Mark a step done or not done for everyone in the family
route('PUT', '/api/families/:familyId/recipes/:recipeId/steps/:stepId', 'member', async (ctx) => {
  const { familyId, recipeId, stepId } = ctx.params;
  const { env } = ctx;
  if (typeof ctx.body.done !== 'boolean') throw new HttpError(400, 'done must be true or false');

  const ids = await stepIds(env, familyId, recipeId);
  const position = ids.indexOf(stepId);
  if (position < 0) throw new HttpError(404, 'Step not found');

  const now = new Date();
  const latest = await first(env, 'SELECT MAX(done_at) AS latest FROM recipe_step_progress WHERE recipe_id = ?', recipeId);
  const statements: D1PreparedStatement[] = [];
  if (isStale(latest?.latest, now)) {
    // The last cook is over; this mark starts a new one
    statements.push(stmt(env, 'DELETE FROM recipe_step_progress WHERE recipe_id = ?', recipeId));
  } else {
    statements.push(
      stmt(env, 'DELETE FROM recipe_step_progress WHERE recipe_id = ? AND position >= ?', recipeId, ids.length)
    );
  }
  statements.push(
    ctx.body.done
      ? stmt(
          env,
          `INSERT INTO recipe_step_progress (recipe_id, position, done_by_id, done_at) VALUES (?, ?, ?, ?)
           ON CONFLICT (recipe_id, position) DO NOTHING`,
          recipeId,
          position,
          ctx.userId,
          now.toISOString()
        )
      : stmt(env, 'DELETE FROM recipe_step_progress WHERE recipe_id = ? AND position = ?', recipeId, position)
  );
  await batch(env, statements);

  return json({ recipe: await loadRecipe(env, familyId, recipeId, true) });
});

// Open every step again, to cook the recipe from the start
route('POST', '/api/families/:familyId/recipes/:recipeId/steps/reset', 'member', async (ctx) => {
  const { familyId, recipeId } = ctx.params;
  await stepIds(ctx.env, familyId, recipeId);
  await run(ctx.env, 'DELETE FROM recipe_step_progress WHERE recipe_id = ?', recipeId);
  return json({ recipe: await loadRecipe(ctx.env, familyId, recipeId, true) });
});

route('POST', '/api/families/:familyId/recipes/import', 'member', async () => {
  throw new HttpError(501, 'Recipe import from a link is not available on this server. Add the recipe by hand.');
});
