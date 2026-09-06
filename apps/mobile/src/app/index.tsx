import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/providers/auth-provider';
import { colors } from '@/theme/tokens';

export default function IndexScreen() {
  const { isAuthenticated, profile, isLoading } = useAuth();
  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.orange} /></View>;
  }
  if (!isAuthenticated) return <Redirect href="/(auth)/email" />;
  if (!profile?.onboarding_completed) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)/home" />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
