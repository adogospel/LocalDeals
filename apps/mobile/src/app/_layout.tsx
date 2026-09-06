import '@/i18n';

import { Sora_400Regular, Sora_500Medium, Sora_600SemiBold, Sora_700Bold, useFonts } from '@expo-google-fonts/sora';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { NetworkBanner } from '@/components/network-banner';
import { AppProviders } from '@/providers/app-providers';
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
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
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
      </Stack>
    </AppProviders>
  );
}
