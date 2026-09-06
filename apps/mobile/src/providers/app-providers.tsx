import type { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './auth-provider';
import { NetworkProvider } from './network-provider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <NetworkProvider>
        <AuthProvider>{children}</AuthProvider>
      </NetworkProvider>
    </SafeAreaProvider>
  );
}

