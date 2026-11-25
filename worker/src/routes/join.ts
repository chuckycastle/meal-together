/**
 * Requests to join a family.
 *
 * An account without a family asks to join one that accepts requests.
 * An owner or admin of that family approves or declines.
 */

import { all, batch, first, run, stmt, userColumns, userDict } from '../db';
import type { Env, Row } from '../db';
import { HttpError, integer, json, nowIso, oneOf, text } from '../http';
import { route } from '../router';

const APPROVABLE_ROLES = ['member', 'admin'] as const;

function requestDict(row: Row): Row {
  return {
    id: row.id,
    family_id: row.family_id,
    family_name: row.family_name,
    user_id: row.user_id,
    user: userDict(row, 'u'),
    note: row.note,
    status: row.status,
    created_at: row.created_at,
    decided_at: row.decided_at,
  };
}

const REQUEST_SELECT = `SELECT j.*, f.name AS family_name, ${userColumns('u', 'u')}
  FROM join_requests j
  JOIN families f ON f.id = j.family_id
  JOIN users u ON u.id = j.user_id`;

async function pendingRequest(env: Env, familyId: number, requestId: number): Promise<Row> {
  const row = await first(env, `${REQUEST_SELECT} WHERE j.id = ? AND j.family_id = ?`, requestId, familyId);
  if (!row) throw new HttpError(404, 'Request not found');
  if (row.status !== 'pending') throw new HttpError(409, `This request was already ${row.status}`);
  return row;
}

// What a signed-in person can ask to join, and where their requests stand
route('GET', '/api/join', 'user', async (ctx) => {
  const families = await all(
    ctx.env,
    `SELECT f.id, f.name, (SELECT COUNT(*) FROM family_members m WHERE m.family_id = f.id) AS member_count
     FROM families f
     WHERE f.accepts_join_requests = 1
       AND NOT EXISTS (SELECT 1 FROM family_members m WHERE m.family_id = f.id AND m.user_id = ?)
     ORDER BY f.id LIMIT 20`,
    ctx.userId
  );
  // The latest request per family
  const requests = await all(
    ctx.env,
    `${REQUEST_SELECT}
     WHERE j.user_id = ? AND j.status != 'approved'
       AND j.id = (SELECT MAX(id) FROM join_requests WHERE user_id = j.user_id AND family_id = j.family_id)
     ORDER BY j.id DESC LIMIT 20`,
    ctx.userId
  );
  return json({ families, requests: requests.map(requestDict) });
});

route(
  'POST',
  '/api/join',
  'user',
  async (ctx) => {
    const familyId = integer(ctx.body.family_id, 'family_id', { min: 1, max: Number.MAX_SAFE_INTEGER });
    const note = text(ctx.body.note, 'note', { max: 280 });

    const family = await first(ctx.env, 'SELECT id, accepts_join_requests FROM families WHERE id = ?', familyId);
    if (!family || !family.accepts_join_requests) throw new HttpError(404, 'This family is not accepting requests');

    const member = await first(
      ctx.env,
      'SELECT id FROM family_members WHERE family_id = ? AND user_id = ?',
      familyId,
      ctx.userId
    );
    if (member) throw new HttpError(409, 'You are already in this family');

    const latest = await first(
      ctx.env,
      `${REQUEST_SELECT} WHERE j.family_id = ? AND j.user_id = ? ORDER BY j.id DESC LIMIT 1`,
      familyId,
      ctx.userId
    );
    if (latest?.status === 'pending') return json({ request: requestDict(latest) });
    if (latest?.status === 'declined') {
      throw new HttpError(403, 'Your request was declined. Ask someone in the family to add you by email.');
    }

    const now = nowIso();
    const created = await first(
      ctx.env,
      `INSERT INTO join_requests (family_id, user_id, note, created_at, updated_at) VALUES (?, ?, ?, ?, ?) RETURNING id`,
      familyId,
      ctx.userId,
      note,
      now,
      now
    );
    const request = await first(ctx.env, `${REQUEST_SELECT} WHERE j.id = ?`, created!.id);
    return json({ request: requestDict(request!) }, 201);
  },
  { rateLimited: true }
);

// Withdraw your own open request
route('DELETE', '/api/join/:requestId', 'user', async (ctx) => {
  const result = await run(
    ctx.env,
    `DELETE FROM join_requests WHERE id = ? AND user_id = ? AND status = 'pending'`,
    ctx.params.requestId,
    ctx.userId
  );
  if (result.meta.changes === 0) throw new HttpError(404, 'Request not found');
  return json({ message: 'Request withdrawn' });
});

route('GET', '/api/families/:familyId/join-requests', 'admin', async (ctx) => {
  const rows = await all(
    ctx.env,
    `${REQUEST_SELECT} WHERE j.family_id = ? AND j.status = 'pending' ORDER BY j.id LIMIT 100`,
    ctx.params.familyId
  );
  return json({ requests: rows.map(requestDict) });
});

route('POST', '/api/families/:familyId/join-requests/:requestId/approve', 'admin', async (ctx) => {
  const { familyId, requestId } = ctx.params;
  const request = await pendingRequest(ctx.env, familyId, requestId);
  const role = ctx.body.role === undefined ? 'member' : oneOf(ctx.body.role, 'role', APPROVABLE_ROLES);
  const now = nowIso();

  await batch(ctx.env, [
    stmt(
      ctx.env,
      `INSERT OR IGNORE INTO family_members (family_id, user_id, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      familyId,
      request.user_id,
      role,
      now,
      now
    ),
    stmt(
      ctx.env,
      `UPDATE join_requests SET status = 'approved', decided_by_id = ?, decided_at = ?, updated_at = ? WHERE id = ?`,
      ctx.userId,
      now,
      now,
      requestId
    ),
  ]);
  return json({ message: 'Request approved' });
});

route('POST', '/api/families/:familyId/join-requests/:requestId/decline', 'admin', async (ctx) => {
  const { familyId, requestId } = ctx.params;
  await pendingRequest(ctx.env, familyId, requestId);
  const now = nowIso();
  await run(
    ctx.env,
    `UPDATE join_requests SET status = 'declined', decided_by_id = ?, decided_at = ?, updated_at = ? WHERE id = ?`,
    ctx.userId,
    now,
    now,
    requestId
  );
  return json({ message: 'Request declined' });
});
