import { describe, expect, it } from 'vitest';
import { guessCategory } from '../src/categories';
import { HttpError, httpUrl, integer, isoDateTime, list, oneOf, optionalInteger, text } from '../src/http';

describe('request validation', () => {
  it('trims text and enforces length', () => {
    expect(text('  Thanksgiving  ', 'name', { max: 255 })).toBe('Thanksgiving');
    expect(text('   ', 'notes', { max: 255 })).toBeNull();
    expect(() => text('', 'name', { max: 255, required: true })).toThrow(HttpError);
    expect(() => text('x'.repeat(300), 'name', { max: 255 })).toThrow(HttpError);
    expect(() => text(42, 'name', { max: 255 })).toThrow(HttpError);
  });

  it('accepts only whole numbers in range', () => {
    expect(integer(600, 'duration', { min: 1, max: 1000 })).toBe(600);
    for (const value of ['60', 0, -5, 1.5, true, null, 10 ** 9]) {
      expect(() => integer(value, 'duration', { min: 1, max: 1000 })).toThrow(HttpError);
    }
    expect(optionalInteger(Number.NaN, 'minutes', { min: 0, max: 10 })).toBeNull();
    expect(optionalInteger(undefined, 'minutes', { min: 0, max: 10 })).toBeNull();
  });

  it('normalizes date and time to UTC', () => {
    expect(isoDateTime('2026-11-26T18:00:00-08:00', 'serve_at')).toBe('2026-11-27T02:00:00.000Z');
    expect(isoDateTime('2026-11-27T02:00:00Z', 'serve_at')).toBe('2026-11-27T02:00:00.000Z');
    for (const value of [null, '', 'tomorrow', 42, '2026-13-45T99:00:00Z']) {
      expect(() => isoDateTime(value, 'serve_at')).toThrow(HttpError);
    }
  });

  it('allows only http and https links', () => {
    expect(httpUrl('https://example.com/recipe', 'source_url')).toBe('https://example.com/recipe');
    expect(httpUrl('', 'source_url')).toBeNull();
    expect(() => httpUrl('javascript:alert(1)', 'source_url')).toThrow(HttpError);
    expect(() => httpUrl('not a link', 'source_url')).toThrow(HttpError);
  });

  it('checks choices and lists', () => {
    expect(oneOf('red', 'color', ['red', 'ink'])).toBe('red');
    expect(() => oneOf('purple', 'color', ['red', 'ink'])).toThrow(HttpError);
    expect(list(undefined, 'items', 5)).toEqual([]);
    expect(() => list([1], 'items', 5)).toThrow(HttpError);
    expect(() => list(new Array(6).fill({}), 'items', 5)).toThrow(HttpError);
  });
});

describe('shopping categories', () => {
  it.each([
    ['Unsalted butter', 'Dairy & eggs'],
    ['Kosher salt', 'Spices'],
    ['Orange juice', 'Pantry'],
    ['Orange', 'Produce'],
    ['Chicken broth', 'Pantry'],
    ['Young turkey', 'Meat'],
    ['Fresh sage', 'Produce'],
    ['Ground cloves', 'Spices'],
    ['Dark brown sugar', 'Baking'],
    ['Traditional stuffing mix', 'Bakery'],
    ['Dijon mustard', 'Pantry'],
    ['Dragon fruit', 'Other'],
  ])('%s is in %s', (name, category) => {
    expect(guessCategory(name)).toBe(category);
  });
});
