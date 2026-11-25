/**
 * MealTogether Worker
 * Serves the built frontend and the JSON API under /api, backed by D1.
 */

import { verifyToken } from './auth';
import { first } from './db';
import type { Env } from './db';
import { HttpError, json, readJson } from './http';
import { routes } from './router';
import type { Access, Ctx } from './router';
import './routes/auth';
import './routes/families';
import './routes/recipes';
import './routes/shopping';
import './routes/meals';
import './routes/timers';

const ROLE_RANK = { member: 1, admin: 2, owner: 3 } as const;
const REQUIRED_RANK: Partial<Record<Access, number>> = { member: 1, admin: 2, owner: 3 };

function bearer(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : null;
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  if (url.pathname === '/api/health') return json({ status: 'healthy' });
  if (!env.JWT_SECRET) throw new HttpError(500, 'Server is not configured');

  let pathMatched = false;
  for (const candidate of routes) {
    const match = candidate.pattern.exec(url.pathname);
    if (!match) continue;
    pathMatched = true;
    if (candidate.method !== request.method) continue;

    const params: Record<string, number> = {};
    candidate.keys.forEach((key, index) => {
      params[key] = Number(match[index + 1]);
    });

    if (candidate.rateLimited && env.AUTH_LIMIT) {
      const address = request.headers.get('cf-connecting-ip') ?? 'unknown';
      const { success } = await env.AUTH_LIMIT.limit({ key: `${url.pathname}:${address}` });
      if (!success) throw new HttpError(429, 'Too many attempts. Wait a minute and try again.');
    }

    const ctx: Ctx = { request, env, url, params, userId: 0, role: null, body: {} };

    if (candidate.access !== 'public') {
      const token = bearer(request);
      const userId = token
        ? await verifyToken(env.JWT_SECRET, token, candidate.access === 'refresh' ? 'refresh' : 'access')
        : null;
      if (!userId) throw new HttpError(401, 'Sign in again');
      ctx.userId = userId;
    }

    const requiredRank = REQUIRED_RANK[candidate.access];
    if (requiredRank) {
      const membership = await first(
        env,
        'SELECT role FROM family_members WHERE family_id = ? AND user_id = ?',
        params.familyId,
        ctx.userId
      );
      // A family the user is not in looks the same as one that does not exist
      if (!membership) throw new HttpError(404, 'Family not found');
      ctx.role = membership.role;
      if (ROLE_RANK[ctx.role!] < requiredRank) {
        throw new HttpError(403, requiredRank === 3 ? 'Owner privileges required' : 'Admin privileges required');
      }
    }

    if (request.method === 'POST' || request.method === 'PUT') ctx.body = await readJson(request);
    return candidate.handler(ctx);
  }

  throw pathMatched ? new HttpError(405, 'Method not allowed') : new HttpError(404, 'Not found');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);

    try {
      return await handleApi(request, env, url);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message, ...error.extra }, error.status);
      console.error('Unhandled error', url.pathname, error);
      return json({ error: 'Internal server error' }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
