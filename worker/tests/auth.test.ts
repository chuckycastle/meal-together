import { describe, expect, it } from 'vitest';
import { ACCESS_TOKEN_SECONDS, hashPassword, signToken, verifyPassword, verifyToken } from '../src/auth';

const SECRET = 'test-secret-not-used-anywhere-else';

describe('passwords', () => {
  it('verifies the password that was hashed', async () => {
    const stored = await hashPassword('correct horse');
    expect(stored.startsWith('pbkdf2$100000$')).toBe(true);
    expect(await verifyPassword('correct horse', stored)).toBe(true);
    expect(await verifyPassword('wrong horse', stored)).toBe(false);
  });

  it('salts each hash', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('rejects malformed stored values', async () => {
    expect(await verifyPassword('x', '')).toBe(false);
    expect(await verifyPassword('x', 'bcrypt$12$abc$def')).toBe(false);
    expect(await verifyPassword('x', 'pbkdf2$999999999$abc$def')).toBe(false);
  });
});

describe('tokens', () => {
  it('round-trips the user id', async () => {
    const token = await signToken(SECRET, 42, 'access');
    expect(await verifyToken(SECRET, token, 'access')).toBe(42);
  });

  it('rejects a refresh token used as an access token', async () => {
    const token = await signToken(SECRET, 42, 'refresh');
    expect(await verifyToken(SECRET, token, 'access')).toBeNull();
    expect(await verifyToken(SECRET, token, 'refresh')).toBe(42);
  });

  it('rejects an expired token', async () => {
    const issued = 1_000_000;
    const token = await signToken(SECRET, 42, 'access', issued);
    expect(await verifyToken(SECRET, token, 'access', issued + ACCESS_TOKEN_SECONDS - 1)).toBe(42);
    expect(await verifyToken(SECRET, token, 'access', issued + ACCESS_TOKEN_SECONDS)).toBeNull();
  });

  it('rejects a token signed with another key', async () => {
    const token = await signToken('another-secret', 42, 'access');
    expect(await verifyToken(SECRET, token, 'access')).toBeNull();
  });

  it('rejects a tampered payload', async () => {
    const token = await signToken(SECRET, 42, 'access');
    const [head, , signature] = token.split('.');
    const forged = btoa(JSON.stringify({ sub: '1', type: 'access', iat: 0, exp: 9_999_999_999 })).replace(/=+$/, '');
    expect(await verifyToken(SECRET, `${head}.${forged}.${signature}`, 'access')).toBeNull();
  });

  it('rejects an unsigned token', async () => {
    const head = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' })).replace(/=+$/, '');
    const payload = btoa(JSON.stringify({ sub: '1', type: 'access', iat: 0, exp: 9_999_999_999 })).replace(/=+$/, '');
    expect(await verifyToken(SECRET, `${head}.${payload}.`, 'access')).toBeNull();
    expect(await verifyToken(SECRET, 'not-a-token', 'access')).toBeNull();
  });
});
