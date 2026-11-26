/**
 * Device sign-in: a TV shows a code, a signed-in person approves it from a
 * phone, and the TV trades its secret for tokens.
 *
 * 1. POST /api/auth/device          the device gets a device code and a user code
 * 2. POST /api/auth/device/approve  a signed-in person approves the user code
 * 3. POST /api/auth/device/token    the device polls with its device code
 */

import {
  DEVICE_LOGIN_SECONDS,
  DEVICE_POLL_SECONDS,
  formatUserCode,
  hashDeviceCode,
  newDeviceCode,
  newUserCode,
  normalizeUserCode,
} from '../device';
import { first, run, userDict } from '../db';
import type { Row } from '../db';
import { HttpError, json, nowIso } from '../http';
import { route } from '../router';
import type { Ctx } from '../router';
import { tokens } from './auth';

const MAX_CODE_ATTEMPTS = 5;
const MAX_DEVICE_CODE_LENGTH = 128;

route(
  'POST',
  '/api/auth/device',
  'public',
  async (ctx) => {
    const { env } = ctx;
    const now = new Date();
    await run(env, 'DELETE FROM device_logins WHERE expires_at <= ?', now.toISOString());

    const deviceCode = newDeviceCode();
    const deviceHash = await hashDeviceCode(deviceCode);
    const expiresAt = new Date(now.getTime() + DEVICE_LOGIN_SECONDS * 1000).toISOString();

    // A user code can collide with one that is still open; draw again
    let userCode = '';
    for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS && !userCode; attempt += 1) {
      const candidate = newUserCode();
      const taken = await first(env, 'SELECT id FROM device_logins WHERE user_code = ?', candidate);
      if (!taken) userCode = candidate;
    }
    if (!userCode) throw new HttpError(503, 'Could not start sign-in. Try again.');

    await run(
      env,
      'INSERT INTO device_logins (device_code_hash, user_code, created_at, expires_at) VALUES (?, ?, ?, ?)',
      deviceHash,
      userCode,
      now.toISOString(),
      expiresAt
    );

    const shown = formatUserCode(userCode);
    return json(
      {
        device_code: deviceCode,
        user_code: shown,
        verification_url: `${ctx.url.origin}/link`,
        verification_url_complete: `${ctx.url.origin}/link?code=${shown}`,
        expires_in: DEVICE_LOGIN_SECONDS,
        interval: DEVICE_POLL_SECONDS,
      },
      201
    );
  },
  { rateLimited: true }
);

/** The open request for a code a person typed or scanned */
async function pendingLogin(ctx: Ctx): Promise<Row> {
  const code = normalizeUserCode(ctx.body.user_code);
  const row = code
    ? await first(
        ctx.env,
        "SELECT * FROM device_logins WHERE user_code = ? AND status = 'pending' AND expires_at > ?",
        code,
        nowIso()
      )
    : null;
  if (!row) throw new HttpError(404, 'That code was not found. It may have expired. Check the code on the TV.');
  return row;
}

route(
  'POST',
  '/api/auth/device/approve',
  'user',
  async (ctx) => {
    const login = await pendingLogin(ctx);
    const result = await run(
      ctx.env,
      "UPDATE device_logins SET status = 'approved', user_id = ? WHERE id = ? AND status = 'pending'",
      ctx.userId,
      login.id
    );
    if (result.meta.changes === 0) throw new HttpError(409, 'That code was already used.');
    return json({ message: 'The device is signed in' });
  },
  { rateLimited: true }
);

route(
  'POST',
  '/api/auth/device/deny',
  'user',
  async (ctx) => {
    const login = await pendingLogin(ctx);
    await run(ctx.env, "UPDATE device_logins SET status = 'denied' WHERE id = ? AND status = 'pending'", login.id);
    return json({ message: 'Sign-in declined' });
  },
  { rateLimited: true }
);

// Polled every few seconds by the device, so it is not rate limited. A guess
// would have to match a 256-bit secret.
route('POST', '/api/auth/device/token', 'public', async (ctx) => {
  const { env } = ctx;
  const deviceCode = ctx.body.device_code;
  if (typeof deviceCode !== 'string' || !deviceCode || deviceCode.length > MAX_DEVICE_CODE_LENGTH) {
    throw new HttpError(400, 'device_code is required');
  }

  const login = await first(
    env,
    'SELECT * FROM device_logins WHERE device_code_hash = ?',
    await hashDeviceCode(deviceCode)
  );
  if (!login || login.expires_at <= nowIso()) {
    if (login) await run(env, 'DELETE FROM device_logins WHERE id = ?', login.id);
    throw new HttpError(410, 'This sign-in code has expired.');
  }

  if (login.status === 'pending') return json({ status: 'pending' });

  // An answered request is used once: remove it before acting on it
  const taken = await run(env, 'DELETE FROM device_logins WHERE id = ? AND status = ?', login.id, login.status);
  if (taken.meta.changes === 0) throw new HttpError(410, 'This sign-in code has expired.');

  if (login.status === 'denied') throw new HttpError(403, 'Sign-in was declined on the phone.');

  const user = await first(env, 'SELECT * FROM users WHERE id = ?', login.user_id);
  if (!user || !user.is_active) throw new HttpError(403, 'Account is disabled');

  return json({ status: 'approved', ...(await tokens(env, user.id)), user: userDict(user) });
});
