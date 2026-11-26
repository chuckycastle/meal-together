/**
 * Codes for device sign-in.
 *
 * device code: a long secret held only by the device, stored as a hash
 * user code:   eight characters a person can read off a TV and type on a phone
 */

// No 0, O, 1, or I, which are misread on a screen across the room
export const USER_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const USER_CODE_LENGTH = 8;

export const DEVICE_LOGIN_SECONDS = 10 * 60;
export const DEVICE_POLL_SECONDS = 3;

const DEVICE_CODE_BYTES = 32;

/** Eight characters from the alphabet. 32 symbols divide 256 evenly, so there is no bias. */
export function newUserCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(USER_CODE_LENGTH));
  let code = '';
  for (const byte of bytes) code += USER_CODE_ALPHABET[byte % USER_CODE_ALPHABET.length];
  return code;
}

/** ABCDEFGH -> ABCD-EFGH */
export function formatUserCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/** Accept the code as typed: any case, with or without the dash or spaces. Null when it cannot be a code. */
export function normalizeUserCode(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 32) return null;
  const code = value.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== USER_CODE_LENGTH) return null;
  for (const character of code) {
    if (!USER_CODE_ALPHABET.includes(character)) return null;
  }
  return code;
}

export function newDeviceCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(DEVICE_CODE_BYTES));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function hashDeviceCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
