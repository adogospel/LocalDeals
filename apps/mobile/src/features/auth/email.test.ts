import { describe, expect, it } from 'vitest';

import { isStrongPassword, isValidEmail, normalizeEmail } from './email';

describe('email authentication helpers', () => {
  it('normalizes and validates an email', () => {
    expect(normalizeEmail('  Amina.N@Example.com ')).toBe('amina.n@example.com');
    expect(isValidEmail('amina.n@example.com')).toBe(true);
    expect(isValidEmail('amina@')).toBe(false);
  });

  it('enforces the backend password policy', () => {
    expect(isStrongPassword('LocalDeals7')).toBe(true);
    expect(isStrongPassword('localdeals7')).toBe(false);
    expect(isStrongPassword('Local7')).toBe(false);
  });
});
