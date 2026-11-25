/**
 * Families and their members
 */

import { all, allIn, batch, first, groupBy, run, stmt, userColumns, userDict } from '../db';
import type { Env, Row } from '../db';
import { HttpError, json, nowIso, oneOf, requiredText, text } from '../http';
import { route } from '../router';

const ASSIGNABLE_ROLES = ['admin', 'member'] as const;

function memberDict(row: Row): Row {
  return {
    id: row.id,
    family_id: row.family_id,
    user_id: row.user_id,
    role: row.role,
    user: userDict(row, 'u'),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function membersOf(env: Env, familyIds: number[]): Promise<Map<number, Row[]>> {
  const rows = await allIn(
    env,
    `SELECT m.*, ${userColumns('u', 'u')} FROM family_members m JOIN users u ON u.id = m.user_id
     WHERE m.family_id IN ({in}) ORDER BY m.id`,
    familyIds
  );
  return groupBy(rows, 'family_id');
}

function familyDict(family: Row, members: Row[]): Row {
  return {
    id: family.id,
    name: family.name,
    description: family.description,
    member_count: members.length,
    members: members.map(memberDict),
    accepts_join_requests: !!family.accepts_join_requests,
    created_at: family.created_at,
    updated_at: family.updated_at,
  };
}

async function loadFamily(env: Env, familyId: number): Promise<Row> {
  const family = await first(env, 'SELECT * FROM families WHERE id = ?', familyId);
  if (!family) throw new HttpError(404, 'Family not found');
  const members = await membersOf(env, [familyId]);
  return familyDict(family, members.get(familyId) ?? []);
}

async function loadMember(env: Env, familyId: number, memberId: number): Promise<Row> {
  const member = await first(
    env,
    `SELECT m.*, ${userColumns('u', 'u')} FROM family_members m JOIN users u ON u.id = m.user_id
     WHERE m.id = ? AND m.family_id = ?`,
    memberId,
    familyId
  );
  if (!member) throw new HttpError(404, 'Member not found');
  return member;
}

/** Someone who leaves the family no longer cooks its recipes or dishes */
function clearAssignments(env: Env, familyId: number, userId: number): D1PreparedStatement[] {
  return [
    stmt(env, 'UPDATE recipes SET assigned_to_id = NULL WHERE family_id = ? AND assigned_to_id = ?', familyId, userId),
    stmt(
      env,
      `UPDATE meal_items SET assigned_to_id = NULL
       WHERE assigned_to_id = ? AND meal_id IN (SELECT id FROM meals WHERE family_id = ?)`,
      userId,
      familyId
    ),
  ];
}

route('GET', '/api/families', 'user', async (ctx) => {
  const families = await all(
    ctx.env,
    `SELECT f.* FROM families f JOIN family_members m ON m.family_id = f.id
     WHERE m.user_id = ? ORDER BY f.id`,
    ctx.userId
  );
  const members = await membersOf(
    ctx.env,
    families.map((family) => family.id)
  );
  return json({ families: families.map((family) => familyDict(family, members.get(family.id) ?? [])) });
});

route('POST', '/api/families', 'user', async (ctx) => {
  const name = requiredText(ctx.body.name, 'name', 255);
  const description = text(ctx.body.description, 'description', { max: 2000 });
  const now = nowIso();

  const family = await first(
    ctx.env,
    'INSERT INTO families (name, description, created_at, updated_at) VALUES (?, ?, ?, ?) RETURNING id',
    name,
    description,
    now,
    now
  );
  await run(
    ctx.env,
    `INSERT INTO family_members (family_id, user_id, role, created_at, updated_at) VALUES (?, ?, 'owner', ?, ?)`,
    family!.id,
    ctx.userId,
    now,
    now
  );

  return json({ message: 'Family created successfully', family: await loadFamily(ctx.env, family!.id) }, 201);
});

route('GET', '/api/families/:familyId', 'member', async (ctx) =>
  json({ family: await loadFamily(ctx.env, ctx.params.familyId) })
);

route('PUT', '/api/families/:familyId', 'admin', async (ctx) => {
  const { familyId } = ctx.params;
  if ('name' in ctx.body) {
    await run(
      ctx.env,
      'UPDATE families SET name = ?, updated_at = ? WHERE id = ?',
      requiredText(ctx.body.name, 'name', 255),
      nowIso(),
      familyId
    );
  }
  if ('description' in ctx.body) {
    await run(
      ctx.env,
      'UPDATE families SET description = ?, updated_at = ? WHERE id = ?',
      text(ctx.body.description, 'description', { max: 2000 }),
      nowIso(),
      familyId
    );
  }
  if ('accepts_join_requests' in ctx.body) {
    if (typeof ctx.body.accepts_join_requests !== 'boolean') {
      throw new HttpError(400, 'accepts_join_requests must be true or false');
    }
    await run(
      ctx.env,
      'UPDATE families SET accepts_join_requests = ?, updated_at = ? WHERE id = ?',
      ctx.body.accepts_join_requests,
      nowIso(),
      familyId
    );
  }
  return json({ message: 'Family updated successfully', family: await loadFamily(ctx.env, familyId) });
});

route('DELETE', '/api/families/:familyId', 'owner', async (ctx) => {
  await run(ctx.env, 'DELETE FROM families WHERE id = ?', ctx.params.familyId);
  return json({ message: 'Family deleted successfully' });
});

route('POST', '/api/families/:familyId/members', 'admin', async (ctx) => {
  const { familyId } = ctx.params;
  const address = requiredText(ctx.body.email, 'email', 255).toLowerCase();
  const role = ctx.body.role === undefined ? 'member' : oneOf(ctx.body.role, 'role', ASSIGNABLE_ROLES);

  const user = await first(ctx.env, 'SELECT id FROM users WHERE email = ?', address);
  if (!user) throw new HttpError(404, 'User not found');

  const existing = await first(
    ctx.env,
    'SELECT id FROM family_members WHERE family_id = ? AND user_id = ?',
    familyId,
    user.id
  );
  if (existing) throw new HttpError(409, 'User is already a member');

  const now = nowIso();
  const member = await first(
    ctx.env,
    `INSERT INTO family_members (family_id, user_id, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?) RETURNING id`,
    familyId,
    user.id,
    role,
    now,
    now
  );
  return json(
    { message: 'Member added successfully', member: memberDict(await loadMember(ctx.env, familyId, member!.id)) },
    201
  );
});

route('PUT', '/api/families/:familyId/members/:memberId', 'admin', async (ctx) => {
  const { familyId, memberId } = ctx.params;
  const member = await loadMember(ctx.env, familyId, memberId);
  if (member.role === 'owner') throw new HttpError(403, "The owner's role cannot be changed");

  if ('role' in ctx.body) {
    await run(
      ctx.env,
      'UPDATE family_members SET role = ?, updated_at = ? WHERE id = ?',
      oneOf(ctx.body.role, 'role', ASSIGNABLE_ROLES),
      nowIso(),
      memberId
    );
  }
  return json({
    message: 'Member role updated successfully',
    member: memberDict(await loadMember(ctx.env, familyId, memberId)),
  });
});

route('DELETE', '/api/families/:familyId/members/:memberId', 'admin', async (ctx) => {
  const { familyId, memberId } = ctx.params;
  const member = await loadMember(ctx.env, familyId, memberId);
  if (member.role === 'owner') throw new HttpError(403, 'Cannot remove family owner');

  await batch(ctx.env, [
    stmt(ctx.env, 'DELETE FROM family_members WHERE id = ?', memberId),
    ...clearAssignments(ctx.env, familyId, member.user_id),
  ]);
  return json({ message: 'Member removed successfully' });
});

route('POST', '/api/families/:familyId/leave', 'member', async (ctx) => {
  if (ctx.role === 'owner') {
    throw new HttpError(403, 'Owner cannot leave family. Transfer ownership or delete family.');
  }
  await batch(ctx.env, [
    stmt(
      ctx.env,
      'DELETE FROM family_members WHERE family_id = ? AND user_id = ?',
      ctx.params.familyId,
      ctx.userId
    ),
    ...clearAssignments(ctx.env, ctx.params.familyId, ctx.userId),
  ]);
  return json({ message: 'Left family successfully' });
});
