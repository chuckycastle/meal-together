/**
 * Password hashing (PBKDF2-SHA256) and signed tokens (HS256 JWT) on WebCrypto
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Workers cap PBKDF2 at 100,000 iterations
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

export const ACCESS_TOKEN_SECONDS = 60 * 60;
export const REFRESH_TOKEN_SECONDS = 30 * 24 * 60 * 60;

export type TokenType = 'access' | 'refresh';

export interface TokenClaims {
  sub: string;
  type: TokenType;
  iat: number;
  exp: number;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Compare without leaking where the first difference is */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, HASH_BITS);
  return new Uint8Array(bits);
}

/** Format: pbkdf2$<iterations>$<salt>$<hash>, salt and hash base64url */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterationText, saltText, hashText] = stored.split('$');
  const iterations = Number(iterationText);
  if (scheme !== 'pbkdf2' || !Number.isInteger(iterations) || iterations < 1 || iterations > PBKDF2_ITERATIONS) {
    return false;
  }
  try {
    const expected = fromBase64Url(hashText);
    const actual = await pbkdf2(password, fromBase64Url(saltText), iterations);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Spend the same time as a real check when the account does not exist */
export async function burnPasswordCheck(password: string): Promise<void> {
  await pbkdf2(password, new Uint8Array(SALT_BYTES), PBKDF2_ITERATIONS);
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
    'verify',
  ]);
}

export async function signToken(
  secret: string,
  userId: number,
  type: TokenType,
  nowSeconds = Math.floor(Date.now() / 1000)
): Promise<string> {
  const lifetime = type === 'access' ? ACCESS_TOKEN_SECONDS : REFRESH_TOKEN_SECONDS;
  const claims: TokenClaims = { sub: String(userId), type, iat: nowSeconds, exp: nowSeconds + lifetime };
  const head = toBase64Url(encoder.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = toBase64Url(encoder.encode(JSON.stringify(claims)));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), encoder.encode(`${head}.${payload}`));
  return `${head}.${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

/** Returns the user id, or null when the token is malformed, forged, expired, or the wrong type */
export async function verifyToken(
  secret: string,
  token: string,
  type: TokenType,
  nowSeconds = Math.floor(Date.now() / 1000)
): Promise<number | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [head, payload, signature] = parts;

  try {
    const header = JSON.parse(decoder.decode(fromBase64Url(head))) as { alg?: string };
    if (header.alg !== 'HS256') return null;

    const valid = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(secret),
      fromBase64Url(signature),
      encoder.encode(`${head}.${payload}`)
    );
    if (!valid) return null;

    const claims = JSON.parse(decoder.decode(fromBase64Url(payload))) as Partial<TokenClaims>;
    if (claims.type !== type || typeof claims.exp !== 'number' || claims.exp <= nowSeconds) return null;

    const userId = Number(claims.sub);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  } catch {
    return null;
  }
}
