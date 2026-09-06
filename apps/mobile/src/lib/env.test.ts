import { describe, expect, it } from 'vitest';

import { normalizeSupabaseUrl } from './env';

describe('Supabase environment', () => {
  it('keeps the project origin when a REST path was pasted', () => {
    expect(normalizeSupabaseUrl('https://project-ref.supabase.co/rest/v1/'))
      .toBe('https://project-ref.supabase.co');
  });

  it('rejects normalization for a non-Supabase host', () => {
    expect(normalizeSupabaseUrl('https://example.com/rest/v1/'))
      .toBe('https://example.com/rest/v1');
  });
});
