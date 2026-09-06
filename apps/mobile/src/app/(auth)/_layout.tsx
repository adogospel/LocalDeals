import { Redirect, Stack, usePathname } from 'expo-router';

import { useAuth } from '@/providers/auth-provider';

export default function AuthLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const isPasswordRecovery = pathname.endsWith('/reset-password');
  if (!isLoading && isAuthenticated && !isPasswordRecovery) return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    />
  );
}
