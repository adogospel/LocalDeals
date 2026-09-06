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

const supabaseUrl = normalizeSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL);
const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
const appEnv = (process.env.EXPO_PUBLIC_APP_ENV ?? 'development').trim().toLowerCase();
const developmentAccessRequested =
  process.env.EXPO_PUBLIC_ENABLE_DEV_AUTH?.trim().toLowerCase() === 'true';

export const env = {
  appEnv,
  supabaseUrl,
  supabasePublishableKey,
  isSupabaseConfigured:
    /^https:\/\/.+\.supabase\.co$/.test(supabaseUrl) &&
    supabasePublishableKey.startsWith('sb_publishable_'),
  isDevelopmentAccessEnabled: appEnv === 'development' && developmentAccessRequested,
} as const;
