import { describe, expect, it } from 'vitest';

import {
  formatLocalPhone,
  isValidCameroonMobile,
  maskPhone,
  sanitizeLocalPhone,
  toE164Cameroon,
} from './phone';

describe('Cameroon phone utilities', () => {
  it('normalizes spaces and the +237 prefix', () => {
    expect(sanitizeLocalPhone('+237 699 12 34 56')).toBe('699123456');
  });

  it('accepts a nine-digit mobile number', () => {
    expect(isValidCameroonMobile('699123456')).toBe(true);
    expect(isValidCameroonMobile('299123456')).toBe(false);
  });

  it('formats a valid number to E.164', () => {
    expect(toE164Cameroon('6 99 12 34 56')).toBe('+237699123456');
  });

  it('formats a local number for display', () => {
    expect(formatLocalPhone('699123456')).toBe('699 123 456');
  });

  it('masks the middle digits', () => {
    expect(maskPhone('+237699123456')).toBe('+237 6•• •• 3456');
  });
});
