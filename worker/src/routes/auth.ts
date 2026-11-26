/**
 * Accounts: register, sign in, token refresh, profile, password
 */

import { burnPasswordCheck, hashPassword, signToken, verifyPassword } from '../auth';
import { first, run, userDict } from '../db';
import { HttpError, json, nowIso, requiredText } from '../http';
import { route } from '../router';
import type { Ctx } from '../router';
import type { Env } from '../db';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;
const MAX_PASSWORD = 200;

function email(value: unknown): string {
  const address = requiredText(value, 'email', 255).toLowerCase();
  if (!EMAIL_PATTERN.test(address)) throw new HttpError(400, 'Enter a valid email address');
  return address;
}

function password(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length < MIN_PASSWORD) {
    throw new HttpError(400, `${field} must be at least ${MIN_PASSWORD} characters`);
  }
  if (value.length > MAX_PASSWORD) throw new HttpError(400, `${field} must be ${MAX_PASSWORD} characters or fewer`);
  return value;
}

export async function tokens(env: Env, userId: number) {
  return {
    access_token: await signToken(env.JWT_SECRET, userId, 'access'),
    refresh_token: await signToken(env.JWT_SECRET, userId, 'refresh'),
  };
}

async function currentUser(ctx: Ctx) {
  const user = await first(ctx.env, 'SELECT * FROM users WHERE id = ?', ctx.userId);
  if (!user || !user.is_active) throw new HttpError(401, 'Sign in again');
  return user;
}

route(
  'POST',
  '/api/auth/register',
  'public',
  async (ctx) => {
    const address = email(ctx.body.email);
    const secret = password(ctx.body.password, 'Password');
    const firstName = requiredText(ctx.body.first_name, 'first_name', 100);
    const lastName = requiredText(ctx.body.last_name, 'last_name', 100);

    if (await first(ctx.env, 'SELECT id FROM users WHERE email = ?', address)) {
      throw new HttpError(409, 'Email already registered');
    }

    const now = nowIso();
    const user = await first(
      ctx.env,
      `INSERT INTO users (email, password_hash, first_name, last_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?) RETURNING *`,
      address,
      await hashPassword(secret),
      firstName,
      lastName,
      now,
      now
    );

    return json(
      { message: 'User registered successfully', user: userDict(user!), ...(await tokens(ctx.env, user!.id)) },
      201
    );
  },
  { rateLimited: true }
);

route(
  'POST',
  '/api/auth/login',
  'public',
  async (ctx) => {
    if (typeof ctx.body.email !== 'string' || typeof ctx.body.password !== 'string' || !ctx.body.password) {
      throw new HttpError(400, 'Email and password required');
    }
    const address = ctx.body.email.trim().toLowerCase();
    const attempt = ctx.body.password.slice(0, MAX_PASSWORD);

    const user = await first(ctx.env, 'SELECT * FROM users WHERE email = ?', address);
    if (!user) {
      await burnPasswordCheck(attempt);
      throw new HttpError(401, 'Invalid credentials');
    }
    if (!(await verifyPassword(attempt, user.password_hash))) throw new HttpError(401, 'Invalid credentials');
    if (!user.is_active) throw new HttpError(403, 'Account is disabled');

    return json({ ...(await tokens(ctx.env, user.id)), user: userDict(user) });
  },
  { rateLimited: true }
);

route('POST', '/api/auth/refresh', 'refresh', async (ctx) => {
  await currentUser(ctx);
  return json({ access_token: await signToken(ctx.env.JWT_SECRET, ctx.userId, 'access') });
});

route('GET', '/api/auth/me', 'user', async (ctx) => json({ user: userDict(await currentUser(ctx)) }));

route('PUT', '/api/auth/me', 'user', async (ctx) => {
  const user = await currentUser(ctx);
  const firstName = 'first_name' in ctx.body ? requiredText(ctx.body.first_name, 'first_name', 100) : user.first_name;
  const lastName = 'last_name' in ctx.body ? requiredText(ctx.body.last_name, 'last_name', 100) : user.last_name;
  const address = 'email' in ctx.body ? email(ctx.body.email) : user.email;

  if (address !== user.email) {
    const taken = await first(ctx.env, 'SELECT id FROM users WHERE email = ? AND id != ?', address, user.id);
    if (taken) throw new HttpError(409, 'Email already in use');
  }

  const updated = await first(
    ctx.env,
    'UPDATE users SET first_name = ?, last_name = ?, email = ?, updated_at = ? WHERE id = ? RETURNING *',
    firstName,
    lastName,
    address,
    nowIso(),
    user.id
  );
  return json({ message: 'Profile updated successfully', user: userDict(updated!) });
});

route(
  'POST',
  '/api/auth/change-password',
  'user',
  async (ctx) => {
    const user = await currentUser(ctx);
    if (typeof ctx.body.current_password !== 'string' || !ctx.body.current_password) {
      throw new HttpError(400, 'Current and new password required');
    }
    const next = password(ctx.body.new_password, 'New password');

    if (!(await verifyPassword(ctx.body.current_password.slice(0, MAX_PASSWORD), user.password_hash))) {
      throw new HttpError(401, 'Current password is incorrect');
    }

    await run(
      ctx.env,
      'UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?',
      await hashPassword(next),
      nowIso(),
      user.id
    );
    return json({ message: 'Password changed successfully' });
  },
  { rateLimited: true }
);
