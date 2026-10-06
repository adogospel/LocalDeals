import type { Session, User } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  createDevelopmentSession,
  type DevelopmentSession,
} from '@/features/auth/development-session';
import { getConsentStatus, type ConsentStatus } from '@/features/account/account-service';
import { getProfile } from '@/features/profile/profile-service';
import { setAppLanguage } from '@/i18n';
import { cacheKeys, clearCachedAccountData, getCachedValue, removeCachedValue, setCachedValue } from '@/lib/cache';
import { env } from '@/lib/env';
import { getErrorMessage } from '@/lib/errors';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';

type AuthMode = 'supabase' | 'development' | null;
type AuthUser = Pick<User, 'id' | 'email' | 'phone'>;

type AuthContextValue = {
  session: Session | null;
  user: AuthUser | null;
  profile: Profile | null;
  authMode: AuthMode;
  isAuthenticated: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  isDevelopmentAccessEnabled: boolean;
  isGoogleAuthEnabled: boolean;
  isPhoneAuthEnabled: boolean;
  error: string | null;
  consentStatus: ConsentStatus | null;
  isConsentLoading: boolean;
  refreshProfile: () => Promise<void>;
  refreshConsentStatus: () => Promise<void>;
  updateDevelopmentProfile: (updates: Partial<Profile>) => Promise<void>;
  signInForDevelopment: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  completeAccountDeletion: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [developmentSession, setDevelopmentSession] = useState<DevelopmentSession | null>(() => (
    env.isDevelopmentAccessEnabled
      ? getCachedValue<DevelopmentSession>(cacheKeys.developmentSession)
      : null
  ));
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(
    developmentSession ? { hasRequiredConsents: true, requiredVersions: {} } : null,
  );
  const [isConsentLoading, setIsConsentLoading] = useState(
    env.isSupabaseConfigured && !developmentSession,
  );
  const [isLoading, setIsLoading] = useState(
    env.isSupabaseConfigured && !developmentSession,
  );
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    const nextProfile = await getProfile(userId);
    setProfile(nextProfile);
    if (nextProfile?.preferred_language) {
      await setAppLanguage(nextProfile.preferred_language);
    }
  }, []);

  const sessionUserId = session?.user.id;

  const refreshProfile = useCallback(async () => {
    if (developmentSession) return;
    if (!sessionUserId) return;
    setError(null);
    try {
      await loadProfile(sessionUserId);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    }
  }, [developmentSession, loadProfile, sessionUserId]);

  const refreshConsentStatus = useCallback(async () => {
    if (developmentSession) {
      setConsentStatus({ hasRequiredConsents: true, requiredVersions: {} });
      return;
    }
    if (!sessionUserId) return;
    setIsConsentLoading(true);
    setError(null);
    try {
      setConsentStatus(await getConsentStatus());
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setIsConsentLoading(false);
    }
  }, [developmentSession, sessionUserId]);

  useEffect(() => {
    if (developmentSession) {
      setIsLoading(false);
      setIsConsentLoading(false);
      setConsentStatus({ hasRequiredConsents: true, requiredVersions: {} });
      return;
    }

    if (!env.isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);

    const syncSession = async (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setConsentStatus(null);
        setIsConsentLoading(false);
        return;
      }
      setIsConsentLoading(true);
      const [, nextConsentStatus] = await Promise.all([
        loadProfile(nextSession.user.id),
        getConsentStatus(),
      ]);
      if (active) setConsentStatus(nextConsentStatus);
      if (active) setIsConsentLoading(false);
    };

    void supabase.auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (sessionError) throw sessionError;
        return syncSession(data.session);
      })
      .catch((nextError) => {
        if (active) {
          setError(getErrorMessage(nextError));
          setIsConsentLoading(false);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSession(nextSession).catch((nextError) => {
        if (active) {
          setError(getErrorMessage(nextError));
          setIsConsentLoading(false);
        }
      });
    });

    const appStateListener = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      appStateListener.remove();
    };
  }, [developmentSession, loadProfile]);

  const signInForDevelopment = useCallback(async (email: string) => {
    if (!env.isDevelopmentAccessEnabled) {
      throw new Error('Development access is disabled.');
    }

    const nextSession = createDevelopmentSession(email);
    setCachedValue(cacheKeys.developmentSession, nextSession);
    setDevelopmentSession(nextSession);
    setError(null);
  }, []);

  const updateDevelopmentProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!developmentSession) throw new Error('Development session is not active.');
    const nextSession: DevelopmentSession = {
      ...developmentSession,
      profile: {
        ...developmentSession.profile,
        ...updates,
        updated_at: new Date().toISOString(),
      },
    };
    setCachedValue(cacheKeys.developmentSession, nextSession);
    setDevelopmentSession(nextSession);
    if (nextSession.profile.preferred_language) await setAppLanguage(nextSession.profile.preferred_language);
  }, [developmentSession]);

  const signOut = useCallback(async () => {
    if (developmentSession) {
      removeCachedValue(cacheKeys.developmentSession);
      setDevelopmentSession(null);
      setConsentStatus(null);
      setError(null);
      return;
    }

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) throw signOutError;
    setSession(null);
    setProfile(null);
    setConsentStatus(null);
  }, [developmentSession]);

  const completeAccountDeletion = useCallback(async () => {
    clearCachedAccountData();
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } finally {
      setSession(null);
      setProfile(null);
      setConsentStatus(null);
      setError(null);
    }
  }, []);

  const authMode: AuthMode = developmentSession
    ? 'development'
    : session
      ? 'supabase'
      : null;
  const activeProfile = developmentSession?.profile ?? profile;

  const value = useMemo<AuthContextValue>(() => {
    const activeUser: AuthUser | null = developmentSession
      ? { id: developmentSession.profile.id, email: developmentSession.email }
      : session?.user ?? null;

    return {
      session,
      user: activeUser,
      profile: activeProfile,
      authMode,
      isAuthenticated: Boolean(developmentSession || session),
      isLoading,
      isConfigured: env.isSupabaseConfigured,
      isDevelopmentAccessEnabled: env.isDevelopmentAccessEnabled,
      isGoogleAuthEnabled: env.isGoogleAuthEnabled,
      isPhoneAuthEnabled: env.isPhoneAuthEnabled,
      error,
      consentStatus,
      isConsentLoading,
      refreshProfile,
      refreshConsentStatus,
      updateDevelopmentProfile,
      signInForDevelopment,
      signOut,
      completeAccountDeletion,
    };
  }, [
    activeProfile,
    authMode,
    completeAccountDeletion,
    consentStatus,
    developmentSession,
    error,
    isLoading,
    isConsentLoading,
    refreshConsentStatus,
    refreshProfile,
    session,
    signInForDevelopment,
    signOut,
    updateDevelopmentProfile,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
}
