/**
 * Meal plans: a meal with a serve time, the dishes and events scheduled
 * before it, and shopping list generation from its menu
 */

import { guessCategory } from '../categories';
import { all, allIn, batch, first, groupBy, run, stmt, userColumns, userDict } from '../db';
import type { Env, Row } from '../db';
import { HttpError, integer, isoDateTime, json, list, nowIso, oneOf, requiredText, text } from '../http';
import type { Body } from '../http';
import { route } from '../router';
import type { Ctx } from '../router';
import { MARKER_COLORS } from './timers';

const ITEM_KINDS = ['dish', 'event'] as const;
const MAX_ITEMS_PER_MEAL = 100;

const ITEM_SELECT = `SELECT i.*, r.name AS r_name, r.prep_time AS r_prep_time, r.cook_time AS r_cook_time,
    r.servings AS r_servings, r.assigned_to_id AS r_assigned_to_id, ${userColumns('u', 'u')}, ${userColumns('ru', 'ru')}
  FROM meal_items i
  LEFT JOIN recipes r ON r.id = i.recipe_id
  LEFT JOIN users u ON u.id = i.assigned_to_id
  LEFT JOIN users ru ON ru.id = r.assigned_to_id`;

function itemDict(row: Row, timers: Row[]): Row {
  // The cook is the person set on the dish, or else the cook of its recipe
  const dishCook = userDict(row, 'u');
  const recipeCook = userDict(row, 'ru');
  return {
    id: row.id,
    meal_id: row.meal_id,
    kind: row.kind,
    title: row.title,
    recipe_id: row.recipe_id,
    recipe:
      row.recipe_id === null
        ? null
        : {
            id: row.recipe_id,
            name: row.r_name,
            prep_time: row.r_prep_time,
            cook_time: row.r_cook_time,
            total_time: row.r_prep_time + row.r_cook_time,
            servings: row.r_servings,
            assigned_to_id: row.r_assigned_to_id,
            timers: timers.map((timer) => ({
              id: timer.id,
              name: timer.name,
              duration: timer.duration,
              step_order: timer.step_order,
            })),
          },
    start_at: row.start_at,
    color: row.color,
    assigned_to_id: row.assigned_to_id,
    assigned_to: dishCook,
    cook: dishCook ?? recipeCook,
    cook_source: dishCook ? 'dish' : recipeCook ? 'recipe' : null,
    done: row.done_at !== null,
    done_at: row.done_at,
    done_by_id: row.done_by_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** Serialize meals with their items, soonest start first, unscheduled last */
async function serializeMeals(env: Env, meals: Row[]): Promise<Row[]> {
  const items = await allIn(
    env,
    `${ITEM_SELECT} WHERE i.meal_id IN ({in}) ORDER BY i.start_at IS NULL, i.start_at, i.id`,
    meals.map((meal) => meal.id)
  );
  const recipeIds = items.filter((item) => item.recipe_id !== null).map((item) => item.recipe_id as number);
  const timers = groupBy(
    await allIn(
      env,
      'SELECT id, recipe_id, name, duration, step_order FROM recipe_timers WHERE recipe_id IN ({in}) ORDER BY id',
      recipeIds
    ),
    'recipe_id'
  );
  const itemsByMeal = groupBy(items, 'meal_id');

  return meals.map((meal) => ({
    id: meal.id,
    family_id: meal.family_id,
    name: meal.name,
    serve_at: meal.serve_at,
    notes: meal.notes,
    items: (itemsByMeal.get(meal.id) ?? []).map((item) => itemDict(item, timers.get(item.recipe_id) ?? [])),
    created_at: meal.created_at,
    updated_at: meal.updated_at,
  }));
}

async function requireMeal(env: Env, familyId: number, mealId: number): Promise<Row> {
  const meal = await first(env, 'SELECT * FROM meals WHERE id = ? AND family_id = ?', mealId, familyId);
  if (!meal) throw new HttpError(404, 'Meal not found');
  return meal;
}

async function mealResponse(env: Env, familyId: number, mealId: number): Promise<Row> {
  const [meal] = await serializeMeals(env, [await requireMeal(env, familyId, mealId)]);
  return meal;
}

async function requireItem(env: Env, mealId: number, itemId: number): Promise<Row> {
  const item = await first(env, 'SELECT * FROM meal_items WHERE id = ? AND meal_id = ?', itemId, mealId);
  if (!item) throw new HttpError(404, 'Item not found');
  return item;
}

interface ItemValues {
  kind: string;
  title: string;
  recipe_id: number | null;
  start_at: string | null;
  color: string;
  assigned_to_id: number | null;
  done_at: string | null;
  done_by_id: number | null;
}

const minutesBefore = (iso: string, minutes: number): string =>
  new Date(new Date(iso).getTime() - minutes * 60000).toISOString();

/** Validate request fields against an existing item, or defaults for a new one */
async function resolveItem(ctx: Ctx, meal: Row, existing: Row | null, body: Body): Promise<ItemValues> {
  const { env } = ctx;
  const familyId = ctx.params.familyId;
  const values: ItemValues = {
    kind: existing?.kind ?? 'dish',
    title: existing?.title ?? '',
    recipe_id: existing?.recipe_id ?? null,
    start_at: existing?.start_at ?? null,
    color: existing?.color ?? 'ink',
    assigned_to_id: existing?.assigned_to_id ?? null,
    done_at: existing?.done_at ?? null,
    done_by_id: existing?.done_by_id ?? null,
  };

  if ('kind' in body) values.kind = oneOf(body.kind, 'kind', ITEM_KINDS);
  if ('color' in body) values.color = oneOf(body.color, 'color', MARKER_COLORS);

  let recipe: Row | null = null;
  if ('recipe_id' in body) {
    if (body.recipe_id === null) {
      values.recipe_id = null;
    } else {
      const recipeId = integer(body.recipe_id, 'recipe_id', { min: 1, max: Number.MAX_SAFE_INTEGER });
      recipe = await first(env, 'SELECT * FROM recipes WHERE id = ? AND family_id = ?', recipeId, familyId);
      if (!recipe) throw new HttpError(404, 'Recipe not found');
      values.recipe_id = recipeId;
    }
  }

  if ('title' in body) values.title = text(body.title, 'title', { max: 255 }) ?? '';
  if (!values.title) {
    if (!recipe) throw new HttpError(400, 'title is required');
    values.title = recipe.name;
  }

  if ('assigned_to_id' in body) {
    if (body.assigned_to_id === null) {
      values.assigned_to_id = null;
    } else {
      const userId = integer(body.assigned_to_id, 'assigned_to_id', { min: 1, max: Number.MAX_SAFE_INTEGER });
      const member = await first(
        env,
        'SELECT id FROM family_members WHERE family_id = ? AND user_id = ?',
        familyId,
        userId
      );
      if (!member) throw new HttpError(404, 'Assigned user is not a member of this family');
      values.assigned_to_id = userId;
    }
  }

  if ('start_at' in body) {
    values.start_at = body.start_at ? isoDateTime(body.start_at, 'start_at') : null;
  } else if (!existing && values.kind === 'dish' && recipe) {
    // A new dish starts in time to finish at the meal's serve time
    values.start_at = minutesBefore(meal.serve_at, recipe.prep_time + recipe.cook_time);
  }

  if ('done' in body) {
    if (body.done) {
      if (values.done_at === null) {
        values.done_at = nowIso();
        values.done_by_id = ctx.userId;
      }
    } else {
      values.done_at = null;
      values.done_by_id = null;
    }
  }

  return values;
}

function insertItem(env: Env, mealId: number, values: ItemValues, now: string): D1PreparedStatement {
  return stmt(
    env,
    `INSERT INTO meal_items (meal_id, kind, title, recipe_id, start_at, color, assigned_to_id, done_at, done_by_id,
                             created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    mealId,
    values.kind,
    values.title,
    values.recipe_id,
    values.start_at,
    values.color,
    values.assigned_to_id,
    values.done_at,
    values.done_by_id,
    now,
    now
  );
}

route('GET', '/api/families/:familyId/meals', 'member', async (ctx) => {
  const meals = await all(
    ctx.env,
    'SELECT * FROM meals WHERE family_id = ? ORDER BY serve_at, id LIMIT 200',
    ctx.params.familyId
  );
  return json({ meals: await serializeMeals(ctx.env, meals) });
});

route('POST', '/api/families/:familyId/meals', 'member', async (ctx) => {
  const { familyId } = ctx.params;
  const { body, env } = ctx;

  const name = requiredText(body.name, 'name', 255);
  const serveAt = isoDateTime(body.serve_at, 'serve_at');
  const notes = text(body.notes, 'notes', { max: 2000 });
  const entries = list(body.items, 'items', MAX_ITEMS_PER_MEAL);

  // Validate every item before the meal is written
  const draft: Row = { serve_at: serveAt };
  const items: ItemValues[] = [];
  for (const entry of entries) items.push(await resolveItem(ctx, draft, null, entry));

  const now = nowIso();
  const created = await first(
    env,
    'INSERT INTO meals (family_id, name, serve_at, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
    familyId,
    name,
    serveAt,
    notes,
    now,
    now
  );
  const mealId = created!.id as number;
  await batch(
    env,
    items.map((values) => insertItem(env, mealId, values, now))
  );

  return json({ meal: await mealResponse(env, familyId, mealId) }, 201);
});

route('GET', '/api/families/:familyId/meals/:mealId', 'member', async (ctx) =>
  json({ meal: await mealResponse(ctx.env, ctx.params.familyId, ctx.params.mealId) })
);

route('PUT', '/api/families/:familyId/meals/:mealId', 'member', async (ctx) => {
  const { familyId, mealId } = ctx.params;
  const { body, env } = ctx;
  const meal = await requireMeal(env, familyId, mealId);
  const now = nowIso();

  const name = 'name' in body ? requiredText(body.name, 'name', 255) : meal.name;
  const notes = 'notes' in body ? text(body.notes, 'notes', { max: 2000 }) : meal.notes;
  const serveAt = 'serve_at' in body ? isoDateTime(body.serve_at, 'serve_at') : meal.serve_at;

  const statements = [
    stmt(env, 'UPDATE meals SET name = ?, notes = ?, serve_at = ?, updated_at = ? WHERE id = ?', name, notes, serveAt, now, mealId),
  ];

  // Keep every item's offset from the serve time when the meal moves
  const deltaMs = new Date(serveAt).getTime() - new Date(meal.serve_at).getTime();
  if (deltaMs !== 0 && body.shift_items !== false) {
    const items = await all(env, 'SELECT id, start_at FROM meal_items WHERE meal_id = ? AND start_at IS NOT NULL', mealId);
    for (const item of items) {
      statements.push(
        stmt(
          env,
          'UPDATE meal_items SET start_at = ?, updated_at = ? WHERE id = ?',
          new Date(new Date(item.start_at).getTime() + deltaMs).toISOString(),
          now,
          item.id
        )
      );
    }
  }

  await batch(env, statements);
  return json({ meal: await mealResponse(env, familyId, mealId) });
});

route('DELETE', '/api/families/:familyId/meals/:mealId', 'member', async (ctx) => {
  const { familyId, mealId } = ctx.params;
  await requireMeal(ctx.env, familyId, mealId);
  await run(ctx.env, 'DELETE FROM meals WHERE id = ?', mealId);
  return json({ message: 'Meal deleted' });
});

route('POST', '/api/families/:familyId/meals/:mealId/items', 'member', async (ctx) => {
  const { familyId, mealId } = ctx.params;
  const meal = await requireMeal(ctx.env, familyId, mealId);

  const count = await first(ctx.env, 'SELECT COUNT(*) AS total FROM meal_items WHERE meal_id = ?', mealId);
  if ((count?.total ?? 0) >= MAX_ITEMS_PER_MEAL) {
    throw new HttpError(400, `A meal holds up to ${MAX_ITEMS_PER_MEAL} items`);
  }

  const values = await resolveItem(ctx, meal, null, ctx.body);
  await insertItem(ctx.env, mealId, values, nowIso()).run();
  return json({ meal: await mealResponse(ctx.env, familyId, mealId) }, 201);
});

route('PUT', '/api/families/:familyId/meals/:mealId/items/:itemId', 'member', async (ctx) => {
  const { familyId, mealId, itemId } = ctx.params;
  const meal = await requireMeal(ctx.env, familyId, mealId);
  const existing = await requireItem(ctx.env, mealId, itemId);
  const values = await resolveItem(ctx, meal, existing, ctx.body);

  await run(
    ctx.env,
    `UPDATE meal_items SET kind = ?, title = ?, recipe_id = ?, start_at = ?, color = ?, assigned_to_id = ?,
                           done_at = ?, done_by_id = ?, updated_at = ? WHERE id = ?`,
    values.kind,
    values.title,
    values.recipe_id,
    values.start_at,
    values.color,
    values.assigned_to_id,
    values.done_at,
    values.done_by_id,
    nowIso(),
    itemId
  );
  return json({ meal: await mealResponse(ctx.env, familyId, mealId) });
});

route('DELETE', '/api/families/:familyId/meals/:mealId/items/:itemId', 'member', async (ctx) => {
  const { familyId, mealId, itemId } = ctx.params;
  await requireMeal(ctx.env, familyId, mealId);
  await requireItem(ctx.env, mealId, itemId);
  await run(ctx.env, 'DELETE FROM meal_items WHERE id = ?', itemId);
  return json({ meal: await mealResponse(ctx.env, familyId, mealId) });
});

route('POST', '/api/families/:familyId/meals/:mealId/shopping-list', 'member', async (ctx) => {
  const { familyId, mealId } = ctx.params;
  const { env } = ctx;
  const meal = await requireMeal(env, familyId, mealId);

  const dishes = await all(
    env,
    'SELECT title, recipe_id FROM meal_items WHERE meal_id = ? AND recipe_id IS NOT NULL ORDER BY start_at IS NULL, start_at, id',
    mealId
  );
  const ingredients = groupBy(
    await allIn(
      env,
      'SELECT recipe_id, name, quantity FROM ingredients WHERE recipe_id IN ({in}) ORDER BY position, id',
      dishes.map((dish) => dish.recipe_id as number)
    ),
    'recipe_id'
  );

  // Merge the same ingredient across dishes, keeping first-seen order
  const merged = new Map<string, { name: string; uses: Array<[string, string | null]> }>();
  for (const dish of dishes) {
    for (const ingredient of ingredients.get(dish.recipe_id) ?? []) {
      const name = String(ingredient.name).trim();
      const key = name.toLowerCase();
      if (!key) continue;
      const entry = merged.get(key) ?? { name, uses: [] };
      entry.uses.push([dish.title, ingredient.quantity]);
      merged.set(key, entry);
    }
  }

  const now = nowIso();
  let shoppingList = await first(
    env,
    'SELECT id FROM shopping_lists WHERE family_id = ? AND is_active = 1 ORDER BY created_at DESC, id DESC LIMIT 1',
    familyId
  );
  if (!shoppingList) {
    shoppingList = await first(
      env,
      'INSERT INTO shopping_lists (family_id, name, created_at, updated_at) VALUES (?, ?, ?, ?) RETURNING id',
      familyId,
      `${meal.name} shopping`.slice(0, 255),
      now,
      now
    );
  }
  const listId = shoppingList!.id as number;

  const existing = new Set(
    (await all(env, 'SELECT name FROM shopping_list_items WHERE shopping_list_id = ?', listId)).map((item) =>
      String(item.name).trim().toLowerCase()
    )
  );

  const statements: D1PreparedStatement[] = [];
  let skipped = 0;
  for (const [key, entry] of merged) {
    if (existing.has(key)) {
      skipped += 1;
      continue;
    }
    const single = entry.uses.length === 1;
    statements.push(
      stmt(
        env,
        `INSERT INTO shopping_list_items (shopping_list_id, name, quantity, category, notes, added_by_id,
                                          created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        listId,
        entry.name.slice(0, 255),
        single ? entry.uses[0][1] : null,
        guessCategory(entry.name),
        single
          ? `For ${entry.uses[0][0]}`
          : entry.uses.map(([title, quantity]) => (quantity ? `${title}: ${quantity}` : title)).join('; '),
        ctx.userId,
        now,
        now
      )
    );
  }
  await batch(env, statements);

  return json({ shopping_list_id: listId, added: statements.length, skipped });
});
