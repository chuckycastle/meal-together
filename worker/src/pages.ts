/**
 * Page responses: the built frontend's HTML with security headers.
 *
 * Each HTML response carries a fresh nonce in its Content-Security-Policy.
 * Cloudflare reads that header and stamps the nonce onto the bot-detection
 * script it injects into pages, so the script runs without 'unsafe-inline'.
 */

const NONCE_BYTES = 16;

export function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function contentSecurityPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

/** Serve a static file or the app shell through the assets binding */
export async function servePage(request: Request, assets: { fetch: (request: Request) => Promise<Response> }) {
  // Always fetch the full page: a 304 would pair a cached body with a new nonce
  const headers = new Headers(request.headers);
  headers.delete('if-none-match');
  headers.delete('if-modified-since');

  const asset = await assets.fetch(new Request(request, { headers }));
  const response = new Response(asset.body, asset);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (!(asset.headers.get('content-type') ?? '').includes('text/html')) return response;

  response.headers.set('Content-Security-Policy', contentSecurityPolicy(newNonce()));
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Cache-Control', 'no-store');
  response.headers.delete('etag');
  response.headers.delete('last-modified');
  return response;
}
