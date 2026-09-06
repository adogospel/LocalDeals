import { describe, expect, it } from 'vitest';

import { createDevelopmentSession } from './development-session';

describe('development session', () => {
  it('creates a complete local profile from an email', () => {
    const session = createDevelopmentSession('amina.ngono@example.com');

    expect(session.email).toBe('amina.ngono@example.com');
    expect(session.profile.display_name).toBe('Amina Ngono');
    expect(session.profile.onboarding_completed).toBe(true);
    expect(session.profile.id).toBe('development:amina.ngono@example.com');
  });
});
