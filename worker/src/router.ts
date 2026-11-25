/**
 * Route table with access levels
 */

import type { Body } from './http';
import type { Env } from './db';

export type Access = 'public' | 'refresh' | 'user' | 'member' | 'admin' | 'owner';

export interface Ctx {
  request: Request;
  env: Env;
  url: URL;
  /** Numeric path parameters */
  params: Record<string, number>;
  /** Signed-in user id; 0 on public routes */
  userId: number;
  /** The user's role in the family named by the path, when there is one */
  role: 'owner' | 'admin' | 'member' | null;
  body: Body;
}

export type Handler = (ctx: Ctx) => Promise<Response>;

export interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  access: Access;
  handler: Handler;
  rateLimited: boolean;
}

export const routes: Route[] = [];

interface RouteOptions {
  rateLimited?: boolean;
}

/** Register a route. `:name` segments match numeric ids. */
export function route(method: string, path: string, access: Access, handler: Handler, options: RouteOptions = {}) {
  const keys: string[] = [];
  const source = path.replace(/:(\w+)/g, (_match, key: string) => {
    keys.push(key);
    return '(\\d{1,15})';
  });
  routes.push({
    method,
    pattern: new RegExp(`^${source}/?$`),
    keys,
    access,
    handler,
    rateLimited: options.rateLimited ?? false,
  });
}
