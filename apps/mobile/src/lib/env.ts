export function normalizeSupabaseUrl(value: string | undefined): string {
  const trimmedValue = value?.trim() ?? '';
  if (!trimmedValue) return '';

  try {
    const url = new URL(trimmedValue);
    if (url.protocol === 'https:' && url.hostname.endsWith('.supabase.co')) {
      return url.origin;
    }
  } catch {
    // Keep the invalid value so isSupabaseConfigured can reject it below.
  }

  return trimmedValue.replace(/\/+$/, '');
}

export type AppEnvironment = 'development' | 'preview' | 'production';

export type PublicEnvironmentSource = {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  EXPO_PUBLIC_APP_ENV?: string;
  EXPO_PUBLIC_ENABLE_DEV_AUTH?: string;
  EXPO_PUBLIC_ENABLE_GOOGLE_AUTH?: string;
  EXPO_PUBLIC_ENABLE_PHONE_AUTH?: string;
};

const APP_ENVIRONMENTS: AppEnvironment[] = ['development', 'preview', 'production'];

function isEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

export function parsePublicEnvironment(source: PublicEnvironmentSource) {
  const requestedAppEnv = (source.EXPO_PUBLIC_APP_ENV ?? 'development').trim().toLowerCase();
  const hasKnownAppEnv = APP_ENVIRONMENTS.includes(requestedAppEnv as AppEnvironment);
  // An invalid explicit value must fail closed: never expose development access by accident.
  const appEnv: AppEnvironment = hasKnownAppEnv
    ? requestedAppEnv as AppEnvironment
    : 'production';
  const supabaseUrl = normalizeSupabaseUrl(source.EXPO_PUBLIC_SUPABASE_URL);
  const supabasePublishableKey = source.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
  const hasValidSupabaseUrl = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(supabaseUrl);
  const hasValidPublishableKey = supabasePublishableKey.startsWith('sb_publishable_');
  const isSupabaseConfigured = hasValidSupabaseUrl && hasValidPublishableKey;
  const developmentAccessRequested = isEnabled(source.EXPO_PUBLIC_ENABLE_DEV_AUTH);
  const googleAuthRequested = isEnabled(source.EXPO_PUBLIC_ENABLE_GOOGLE_AUTH);
  const phoneAuthRequested = isEnabled(source.EXPO_PUBLIC_ENABLE_PHONE_AUTH);
  const configurationIssues: string[] = [];

  if (!hasKnownAppEnv) configurationIssues.push('EXPO_PUBLIC_APP_ENV is invalid.');
  if (!hasValidSupabaseUrl) configurationIssues.push('EXPO_PUBLIC_SUPABASE_URL is invalid.');
  if (!hasValidPublishableKey) {
    configurationIssues.push('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is invalid.');
  }
  if (developmentAccessRequested && appEnv !== 'development') {
    configurationIssues.push('Development authentication is forbidden outside development.');
  }

  return {
    appEnv,
    supabaseUrl,
    supabasePublishableKey,
    configurationIssues,
    isDevelopment: appEnv === 'development',
    isPreview: appEnv === 'preview',
    isProduction: appEnv === 'production',
    isSupabaseConfigured,
    isDevelopmentAccessEnabled: appEnv === 'development' && developmentAccessRequested,
    isGoogleAuthEnabled: isSupabaseConfigured && googleAuthRequested,
    isPhoneAuthEnabled: isSupabaseConfigured && phoneAuthRequested,
    isProductionReady:
      appEnv === 'production' &&
      isSupabaseConfigured &&
      !developmentAccessRequested &&
      configurationIssues.length === 0,
  } as const;
}

export const env = parsePublicEnvironment({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
  EXPO_PUBLIC_ENABLE_DEV_AUTH: process.env.EXPO_PUBLIC_ENABLE_DEV_AUTH,
  EXPO_PUBLIC_ENABLE_GOOGLE_AUTH: process.env.EXPO_PUBLIC_ENABLE_GOOGLE_AUTH,
  EXPO_PUBLIC_ENABLE_PHONE_AUTH: process.env.EXPO_PUBLIC_ENABLE_PHONE_AUTH,
});
