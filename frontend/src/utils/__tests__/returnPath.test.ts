import { beforeEach, describe, expect, it } from 'vitest';
import { rememberReturnPath, takeReturnPath } from '../returnPath';

describe('return path after sign-in', () => {
  beforeEach(() => sessionStorage.clear());

  it('goes to the kitchen when nothing is remembered', () => {
    expect(takeReturnPath()).toBe('/');
  });

  it('returns to the TV sign-in page with its code, once', () => {
    rememberReturnPath('/link?code=ABCD-EFGH');
    expect(takeReturnPath()).toBe('/link?code=ABCD-EFGH');
    expect(takeReturnPath()).toBe('/');
  });

  it('remembers the page without a code', () => {
    rememberReturnPath('/link');
    expect(takeReturnPath()).toBe('/link');
  });

  it('ignores every other path', () => {
    for (const path of ['/plan', '//example.com', '/link/../profile', '/link?code=<script>', '/link?next=//example.com']) {
      rememberReturnPath(path);
      expect(takeReturnPath()).toBe('/');
    }
  });

  it('does not trust a stored value it would not have written', () => {
    sessionStorage.setItem('return-after-sign-in', 'https://example.com');
    expect(takeReturnPath()).toBe('/');
  });
});
