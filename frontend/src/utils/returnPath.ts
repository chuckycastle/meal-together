/**
 * Where to go after signing in.
 * The TV sign-in page sends a signed-out person to the sign-in form and
 * wants them back afterward. Only that page is remembered, so a stored
 * value can never send someone anywhere else.
 */

const KEY = 'return-after-sign-in';
const ALLOWED = /^\/link(\?code=[A-Za-z0-9-]{1,16})?$/;

export function rememberReturnPath(path: string): void {
  if (ALLOWED.test(path)) sessionStorage.setItem(KEY, path);
}

/** The remembered path, or the kitchen. Reading it clears it. */
export function takeReturnPath(): string {
  const path = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  return path && ALLOWED.test(path) ? path : '/';
}
