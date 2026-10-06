import '@/i18n';

import { Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold, useFonts } from '@expo-google-fonts/sora';
import { Redirect, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { NetworkBanner } from '@/components/network-banner';
import { AppProviders } from '@/providers/app-providers';
import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold });

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontError, fontsLoaded]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <AppProviders>
      <StatusBar style="dark" />
      <NetworkBanner />
      <AppNavigator />
    </AppProviders>
  );
}

function AppNavigator() {
  const segments = useSegments();
  const { authMode, consentStatus, isConsentLoading } = useAuth();
  const currentRoot = segments[0] as string | undefined;
  const consentRouteAllowed = currentRoot === 'consent' || currentRoot === 'legal';

  if (
    authMode === 'supabase'
    && !isConsentLoading
    && consentStatus?.hasRequiredConsents !== true
    && !consentRouteAllowed
  ) {
    return <Redirect href="/consent" />;
  }

  return (
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="consent" options={{ gestureEnabled: false }} />
        <Stack.Screen name="legal/[type]" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="listing/[id]" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
        <Stack.Screen name="conversation/[id]" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
        <Stack.Screen name="notifications" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
        <Stack.Screen name="favorites" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
        <Stack.Screen name="deals" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
        <Stack.Screen name="deal/[id]" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
        <Stack.Screen name="profile/[id]" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
        <Stack.Screen name="report" options={{ presentation: 'modal' }} />
        <Stack.Screen name="my-listings" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
        <Stack.Screen name="settings/profile" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings/account" options={{ animation: 'slide_from_right', gestureEnabled: true }} />
        <Stack.Screen name="settings/delete-account" options={{ presentation: 'modal', gestureEnabled: false }} />
      </Stack>
  );
}
