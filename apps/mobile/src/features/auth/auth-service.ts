import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import * as WebBrowser from 'expo-web-browser';

import { normalizeEmail } from '@/features/auth/email';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { AppLanguage } from '@/types/database';

WebBrowser.maybeCompleteAuthSession();

export type SignUpProfile = {
  displayName: string;
  cityId: number | null;
  customCity: string;
  neighborhoodId: number | null;
  customNeighborhood: string;
  preferredLanguage: AppLanguage;
};

export async function requestPhoneOtp(phone: string): Promise<void> {
  if (!env.isPhoneAuthEnabled) {
    throw new Error('La connexion par téléphone n’est pas activée.');
  }
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

export async function verifyPhoneOtp(phone: string, token: string): Promise<void> {
  if (!env.isPhoneAuthEnabled) {
    throw new Error('La connexion par téléphone n’est pas activée.');
  }
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });
  if (error) throw error;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  profile: SignUpProfile,
): Promise<void> {
  const { error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: {
      data: {
        display_name: profile.displayName.trim(),
        city_id: profile.cityId,
        custom_city: profile.cityId ? null : profile.customCity.trim(),
        neighborhood_id: profile.neighborhoodId,
        custom_neighborhood: profile.neighborhoodId ? null : profile.customNeighborhood.trim(),
        preferred_language: profile.preferredLanguage,
      },
    },
  });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email: normalizeEmail(email),
    token,
    type: 'signup',
  });
  if (error) throw error;
}

export async function resendEmailCode(email: string): Promise<void> {
  const { error } = await supabase.auth.resend({
    email: normalizeEmail(email),
    type: 'signup',
  });
  if (error) throw error;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), {
    redirectTo: 'localdeals://auth/reset-password',
  });
  if (error) throw error;
}

export async function verifyRecoveryCode(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email: normalizeEmail(email),
    token,
    type: 'recovery',
  });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function createSessionFromUrl(url: string): Promise<void> {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) {
    throw new Error(String(params.error_description ?? errorCode));
  }

  const authorizationCode = typeof params.code === 'string' ? params.code : null;
  if (authorizationCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(authorizationCode);
    if (error) throw error;
    return;
  }

  const accessToken = typeof params.access_token === 'string' ? params.access_token : null;
  const refreshToken = typeof params.refresh_token === 'string' ? params.refresh_token : null;
  if (!accessToken || !refreshToken) throw new Error('La session Google reçue est incomplète.');

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (error) throw error;
}

export async function signInWithGoogle(): Promise<boolean> {
  if (!env.isGoogleAuthEnabled) {
    throw new Error('La connexion avec Google n’est pas activée.');
  }
  const redirectTo = makeRedirectUri({
    scheme: 'localdeals',
    path: 'auth/callback',
    native: 'localdeals://auth/callback',
  });
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Google OAuth est indisponible pour le moment.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    preferEphemeralSession: false,
  });
  if (result.type !== 'success') return false;
  await createSessionFromUrl(result.url);
  return true;
}
