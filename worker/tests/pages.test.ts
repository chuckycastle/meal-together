import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy, newNonce, servePage } from '../src/pages';

const html = () =>
  new Response('<!doctype html><div id="root"></div>', {
    headers: { 'content-type': 'text/html; charset=utf-8', etag: '"abc"', 'last-modified': 'yesterday' },
  });

describe('page responses', () => {
  it('builds a policy with the nonce and without unsafe-inline scripts', () => {
    const policy = contentSecurityPolicy('abc123');
    expect(policy).toContain("script-src 'self' 'nonce-abc123'");
    expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it('generates a different nonce each time', () => {
    const nonces = new Set(Array.from({ length: 50 }, newNonce));
    expect(nonces.size).toBe(50);
    expect([...nonces][0]).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  });

  it('adds a fresh policy to HTML and makes it uncacheable', async () => {
    const assets = { fetch: async () => html() };
    const first = await servePage(new Request('https://example.test/plan'), assets);
    const second = await servePage(new Request('https://example.test/plan'), assets);

    const policy = first.headers.get('content-security-policy')!;
    expect(policy).toMatch(/script-src 'self' 'nonce-[A-Za-z0-9+/=]+'/);
    expect(policy).not.toBe(second.headers.get('content-security-policy'));
    expect(first.headers.get('cache-control')).toBe('no-store');
    expect(first.headers.get('etag')).toBeNull();
    expect(first.headers.get('last-modified')).toBeNull();
    expect(first.headers.get('x-frame-options')).toBe('DENY');
    expect(await first.text()).toContain('<div id="root">');
  });

  it('does not forward conditional headers, so a page is never answered with 304', async () => {
    let seen: Headers | null = null;
    const assets = {
      fetch: async (request: Request) => {
        seen = request.headers;
        return html();
      },
    };
    await servePage(
      new Request('https://example.test/', { headers: { 'if-none-match': '"abc"', 'if-modified-since': 'x', accept: 'text/html' } }),
      assets
    );
    expect(seen!.get('if-none-match')).toBeNull();
    expect(seen!.get('if-modified-since')).toBeNull();
    expect(seen!.get('accept')).toBe('text/html');
  });

  it('caches hashed files for a year', async () => {
    const assets = {
      fetch: async () => new Response('export {}', { headers: { 'content-type': 'text/javascript', etag: '"j"' } }),
    };
    const response = await servePage(new Request('https://example.test/assets/index-abc123.js'), assets);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(response.headers.get('content-security-policy')).toBeNull();
  });

  it('answers a missing file with 404 instead of the app shell', async () => {
    const assets = { fetch: async () => html() };
    for (const path of ['/assets/index-gone.js', '/assets/Page-old.css', '/favicon.ico', '/missing.woff2']) {
      const response = await servePage(new Request(`https://example.test${path}`), assets);
      expect(response.status, path).toBe(404);
      expect(response.headers.get('cache-control'), path).toBe('no-store');
      expect(await response.text()).not.toContain('<div');
    }
  });

  it('still serves the app shell for page paths, including ones with dots in a folder name', async () => {
    const assets = { fetch: async () => html() };
    for (const path of ['/', '/plan', '/recipes/12', '/cook/3', '/index.html']) {
      const response = await servePage(new Request(`https://example.test${path}`), assets);
      expect(response.status, path).toBe(200);
      expect(response.headers.get('content-security-policy'), path).toContain('nonce-');
    }
  });

  it('leaves other files cacheable and without a page policy', async () => {
    const assets = {
      fetch: async () =>
        new Response('{}', { headers: { 'content-type': 'application/manifest+json', etag: '"m"' } }),
    };
    const response = await servePage(new Request('https://example.test/site.webmanifest'), assets);
    expect(response.headers.get('content-security-policy')).toBeNull();
    expect(response.headers.get('etag')).toBe('"m"');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });
});
