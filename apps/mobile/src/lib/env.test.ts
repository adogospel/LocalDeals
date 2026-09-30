import { describe, expect, it } from 'vitest';

import { normalizeSupabaseUrl, parsePublicEnvironment } from './env';

describe('Supabase environment', () => {
  it('keeps the project origin when a REST path was pasted', () => {
    expect(normalizeSupabaseUrl('https://project-ref.supabase.co/rest/v1/'))
      .toBe('https://project-ref.supabase.co');
  });

  it('rejects normalization for a non-Supabase host', () => {
    expect(normalizeSupabaseUrl('https://example.com/rest/v1/'))
      .toBe('https://example.com/rest/v1');
  });

  it('enables development access only in the development environment', () => {
    const development = parsePublicEnvironment({
      EXPO_PUBLIC_APP_ENV: 'development',
      EXPO_PUBLIC_ENABLE_DEV_AUTH: 'true',
    });
    const production = parsePublicEnvironment({
      EXPO_PUBLIC_APP_ENV: 'production',
      EXPO_PUBLIC_ENABLE_DEV_AUTH: 'true',
    });

    expect(development.isDevelopmentAccessEnabled).toBe(true);
    expect(production.isDevelopmentAccessEnabled).toBe(false);
    expect(production.configurationIssues).toContain(
      'Development authentication is forbidden outside development.',
    );
  });

  it('fails closed when the application environment is invalid', () => {
    const result = parsePublicEnvironment({
      EXPO_PUBLIC_APP_ENV: 'prodution',
      EXPO_PUBLIC_ENABLE_DEV_AUTH: 'true',
    });

    expect(result.appEnv).toBe('production');
    expect(result.isDevelopmentAccessEnabled).toBe(false);
    expect(result.configurationIssues).toContain('EXPO_PUBLIC_APP_ENV is invalid.');
  });

  it('does not enable optional providers without valid Supabase configuration', () => {
    const result = parsePublicEnvironment({
      EXPO_PUBLIC_ENABLE_GOOGLE_AUTH: 'true',
      EXPO_PUBLIC_ENABLE_PHONE_AUTH: 'true',
    });

    expect(result.isGoogleAuthEnabled).toBe(false);
    expect(result.isPhoneAuthEnabled).toBe(false);
    expect(result.isSupabaseConfigured).toBe(false);
  });

  it('enables configured providers and accepts a normalized Supabase origin', () => {
    const result = parsePublicEnvironment({
      EXPO_PUBLIC_APP_ENV: 'production',
      EXPO_PUBLIC_SUPABASE_URL: 'https://localdeals-ref.supabase.co/rest/v1/',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
      EXPO_PUBLIC_ENABLE_GOOGLE_AUTH: 'true',
      EXPO_PUBLIC_ENABLE_PHONE_AUTH: 'true',
    });

    expect(result.supabaseUrl).toBe('https://localdeals-ref.supabase.co');
    expect(result.isGoogleAuthEnabled).toBe(true);
    expect(result.isPhoneAuthEnabled).toBe(true);
    expect(result.isProductionReady).toBe(true);
  });
});
