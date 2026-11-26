import { describe, expect, it } from 'vitest';
import {
  USER_CODE_ALPHABET,
  USER_CODE_LENGTH,
  formatUserCode,
  hashDeviceCode,
  newDeviceCode,
  newUserCode,
  normalizeUserCode,
} from '../src/device';

describe('user codes', () => {
  it('draws eight characters from the alphabet', () => {
    for (let i = 0; i < 200; i += 1) {
      const code = newUserCode();
      expect(code).toHaveLength(USER_CODE_LENGTH);
      for (const character of code) expect(USER_CODE_ALPHABET).toContain(character);
    }
  });

  it('leaves out characters that are misread', () => {
    for (const character of '01OI') expect(USER_CODE_ALPHABET).not.toContain(character);
    expect(256 % USER_CODE_ALPHABET.length).toBe(0);
  });

  it('formats with a dash in the middle', () => {
    expect(formatUserCode('ABCDEFGH')).toBe('ABCD-EFGH');
  });

  it('accepts the code as a person types it', () => {
    expect(normalizeUserCode('ABCD-EFGH')).toBe('ABCDEFGH');
    expect(normalizeUserCode('abcd efgh')).toBe('ABCDEFGH');
    expect(normalizeUserCode(' abcdefgh ')).toBe('ABCDEFGH');
    expect(normalizeUserCode(formatUserCode(newUserCode()))).toHaveLength(USER_CODE_LENGTH);
  });

  it('rejects what cannot be a code', () => {
    expect(normalizeUserCode('ABCD-EFG')).toBeNull();
    expect(normalizeUserCode('ABCD-EFGHJ')).toBeNull();
    expect(normalizeUserCode('ABCD-EFG0')).toBeNull();
    expect(normalizeUserCode('ABCD_EFGH')).toBeNull();
    expect(normalizeUserCode('')).toBeNull();
    expect(normalizeUserCode(12345678)).toBeNull();
    expect(normalizeUserCode(null)).toBeNull();
    expect(normalizeUserCode('A'.repeat(500))).toBeNull();
  });
});

describe('device codes', () => {
  it('are long, URL-safe, and different each time', () => {
    const code = newDeviceCode();
    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newDeviceCode()).not.toBe(code);
  });

  it('hash to 64 hex characters, the same for the same code', async () => {
    const code = newDeviceCode();
    const hash = await hashDeviceCode(code);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashDeviceCode(code)).toBe(hash);
    expect(await hashDeviceCode(`${code}x`)).not.toBe(hash);
  });
});
