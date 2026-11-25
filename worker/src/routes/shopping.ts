/**
 * Shopping lists and their items
 */

import { all, allIn, batch, first, groupBy, run, stmt, userColumns, userDict } from '../db';
import type { Env, Row } from '../db';
import { HttpError, json, list, nowIso, requiredText, text } from '../http';
import type { Body } from '../http';
import { route } from '../router';

const ITEM_SELECT = `SELECT i.*, ${userColumns('a', 'added')}, ${userColumns('c', 'checker')}
  FROM shopping_list_items i
  LEFT JOIN users a ON a.id = i.added_by_id
  LEFT JOIN users c ON c.id = i.checked_by_id`;

function itemDict(row: Row): Row {
  return {
    id: row.id,
    shopping_list_id: row.shopping_list_id,
    name: row.name,
    quantity: row.quantity,
    category: row.category,
    notes: row.notes,
    checked: !!row.checked,
    version: row.version,
    added_by_id: row.added_by_id,
    added_by: userDict(row, 'added'),
    checked_by_id: row.checked_by_id,
    checked_by: userDict(row, 'checker'),
    checked_at: row.checked_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function listDict(row: Row, items: Row[]): Row {
  const checked = items.filter((item) => item.checked).length;
  return {
    id: row.id,
    name: row.name,
    family_id: row.family_id,
    is_active: !!row.is_active,
    total_items: items.length,
    checked_items: checked,
    completion_percentage: items.length === 0 ? 0 : Math.floor((checked / items.length) * 100),
    items: items.map(itemDict),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function loadList(env: Env, familyId: number, listId: number): Promise<Row> {
  const row = await first(env, 'SELECT * FROM shopping_lists WHERE id = ? AND family_id = ?', listId, familyId);
  if (!row) throw new HttpError(404, 'Shopping list not found');
  const items = await all(env, `${ITEM_SELECT} WHERE i.shopping_list_id = ? ORDER BY i.id`, listId);
  return listDict(row, items);
}

async function requireList(env: Env, familyId: number, listId: number): Promise<void> {
  const row = await first(env, 'SELECT id FROM shopping_lists WHERE id = ? AND family_id = ?', listId, familyId);
  if (!row) throw new HttpError(404, 'Shopping list not found');
}

async function loadItem(env: Env, familyId: number, listId: number, itemId: number): Promise<Row> {
  const row = await first(
    env,
    `${ITEM_SELECT} JOIN shopping_lists l ON l.id = i.shopping_list_id
     WHERE i.id = ? AND i.shopping_list_id = ? AND l.family_id = ?`,
    itemId,
    listId,
    familyId
  );
  if (!row) throw new HttpError(404, 'Item not found');
  return row;
}

function itemValues(body: Body) {
  return {
    name: requiredText(body.name, 'name', 255),
    quantity: text(body.quantity, 'quantity', { max: 255 }),
    category: text(body.category, 'category', { max: 100 }),
    notes: text(body.notes, 'notes', { max: 2000 }),
  };
}

const INSERT_ITEM = `INSERT INTO shopping_list_items
  (shopping_list_id, name, quantity, category, notes, added_by_id, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

route('GET', '/api/families/:familyId/shopping-lists', 'member', async (ctx) => {
  const { familyId } = ctx.params;
  const activeOnly = (ctx.url.searchParams.get('active_only') ?? 'true').toLowerCase() === 'true';

  const lists = await all(
    ctx.env,
    `SELECT * FROM shopping_lists WHERE family_id = ? ${activeOnly ? 'AND is_active = 1' : ''}
     ORDER BY created_at DESC, id DESC LIMIT 100`,
    familyId
  );
  const items = groupBy(
    await allIn(
      ctx.env,
      `${ITEM_SELECT} WHERE i.shopping_list_id IN ({in}) ORDER BY i.id`,
      lists.map((row) => row.id)
    ),
    'shopping_list_id'
  );

  return json({
    shopping_lists: lists.map((row) => listDict(row, items.get(row.id) ?? [])),
    pagination: {
      page: 1,
      per_page: 100,
      total: lists.length,
      total_pages: 1,
      has_next: false,
      has_prev: false,
    },
  });
});

route('POST', '/api/families/:familyId/shopping-lists', 'member', async (ctx) => {
  const { familyId } = ctx.params;
  const now = nowIso();
  const created = await first(
    ctx.env,
    'INSERT INTO shopping_lists (family_id, name, created_at, updated_at) VALUES (?, ?, ?, ?) RETURNING id',
    familyId,
    text(ctx.body.name, 'name', { max: 255 }) ?? 'Shopping List',
    now,
    now
  );
  return json(
    {
      message: 'Shopping list created successfully',
      shopping_list: await loadList(ctx.env, familyId, created!.id),
    },
    201
  );
});

route('GET', '/api/families/:familyId/shopping-lists/:listId', 'member', async (ctx) =>
  json({ shopping_list: await loadList(ctx.env, ctx.params.familyId, ctx.params.listId) })
);

route('PUT', '/api/families/:familyId/shopping-lists/:listId', 'member', async (ctx) => {
  const { familyId, listId } = ctx.params;
  await requireList(ctx.env, familyId, listId);

  if ('name' in ctx.body) {
    await run(
      ctx.env,
      'UPDATE shopping_lists SET name = ?, updated_at = ? WHERE id = ?',
      requiredText(ctx.body.name, 'name', 255),
      nowIso(),
      listId
    );
  }
  if ('is_active' in ctx.body) {
    if (typeof ctx.body.is_active !== 'boolean') throw new HttpError(400, 'is_active must be true or false');
    await run(
      ctx.env,
      'UPDATE shopping_lists SET is_active = ?, updated_at = ? WHERE id = ?',
      ctx.body.is_active,
      nowIso(),
      listId
    );
  }
  return json({
    message: 'Shopping list updated successfully',
    shopping_list: await loadList(ctx.env, familyId, listId),
  });
});

route('DELETE', '/api/families/:familyId/shopping-lists/:listId', 'member', async (ctx) => {
  const { familyId, listId } = ctx.params;
  await requireList(ctx.env, familyId, listId);
  await run(ctx.env, 'DELETE FROM shopping_lists WHERE id = ?', listId);
  return json({ message: 'Shopping list deleted successfully' });
});

route('POST', '/api/families/:familyId/shopping-lists/:listId/items', 'member', async (ctx) => {
  const { familyId, listId } = ctx.params;
  await requireList(ctx.env, familyId, listId);

  const values = itemValues(ctx.body);
  const now = nowIso();
  const created = await first(
    ctx.env,
    `${INSERT_ITEM} RETURNING id`,
    listId,
    values.name,
    values.quantity,
    values.category,
    values.notes,
    ctx.userId,
    now,
    now
  );
  return json(
    { message: 'Item added successfully', item: itemDict(await loadItem(ctx.env, familyId, listId, created!.id)) },
    201
  );
});

route('POST', '/api/families/:familyId/shopping-lists/:listId/items/bulk', 'member', async (ctx) => {
  const { familyId, listId } = ctx.params;
  await requireList(ctx.env, familyId, listId);

  const entries = list(ctx.body.items, 'items', 200);
  if (entries.length === 0) throw new HttpError(400, 'No items provided');

  const now = nowIso();
  await batch(
    ctx.env,
    entries.map((entry) => {
      const values = itemValues(entry);
      return stmt(
        ctx.env,
        INSERT_ITEM,
        listId,
        values.name,
        values.quantity,
        values.category,
        values.notes,
        ctx.userId,
        now,
        now
      );
    })
  );

  const added = await all(
    ctx.env,
    `${ITEM_SELECT} WHERE i.shopping_list_id = ? AND i.created_at = ? AND i.added_by_id = ? ORDER BY i.id`,
    listId,
    now,
    ctx.userId
  );
  return json({ message: `${added.length} items added successfully`, items: added.map(itemDict) }, 201);
});

route('PUT', '/api/families/:familyId/shopping-lists/:listId/items/:itemId', 'member', async (ctx) => {
  const { familyId, listId, itemId } = ctx.params;
  const { body, env } = ctx;
  const item = await loadItem(env, familyId, listId, itemId);

  // Optimistic locking: a stale version means someone else changed the item first
  if ('version' in body && body.version !== item.version) {
    throw new HttpError(409, 'Conflict: Item was modified by another user', { current_item: itemDict(item) });
  }

  let checked = !!item.checked;
  let checkedBy = item.checked_by_id as number | null;
  let checkedAt = item.checked_at as string | null;
  if ('checked' in body) {
    if (typeof body.checked !== 'boolean') throw new HttpError(400, 'checked must be true or false');
    checked = body.checked;
    checkedBy = checked ? ctx.userId : null;
    checkedAt = checked ? nowIso() : null;
  }

  const result = await run(
    env,
    `UPDATE shopping_list_items
     SET name = ?, quantity = ?, category = ?, notes = ?, checked = ?, checked_by_id = ?, checked_at = ?,
         version = version + 1, updated_at = ?
     WHERE id = ? AND version = ?`,
    'name' in body ? requiredText(body.name, 'name', 255) : item.name,
    'quantity' in body ? text(body.quantity, 'quantity', { max: 255 }) : item.quantity,
    'category' in body ? text(body.category, 'category', { max: 100 }) : item.category,
    'notes' in body ? text(body.notes, 'notes', { max: 2000 }) : item.notes,
    checked,
    checkedBy,
    checkedAt,
    nowIso(),
    itemId,
    item.version
  );

  const current = await loadItem(env, familyId, listId, itemId);
  if (result.meta.changes === 0) {
    throw new HttpError(409, 'Conflict: Item was modified by another user', { current_item: itemDict(current) });
  }
  return json({ message: 'Item updated successfully', item: itemDict(current) });
});

route('DELETE', '/api/families/:familyId/shopping-lists/:listId/items/:itemId', 'member', async (ctx) => {
  const { familyId, listId, itemId } = ctx.params;
  await loadItem(ctx.env, familyId, listId, itemId);
  await run(ctx.env, 'DELETE FROM shopping_list_items WHERE id = ?', itemId);
  return json({ message: 'Item deleted successfully' });
});
