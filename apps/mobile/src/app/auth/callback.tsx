import * as Linking from 'expo-linking';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { createSessionFromUrl } from '@/features/auth/auth-service';
import { getErrorMessage } from '@/lib/errors';
import { colors, spacing } from '@/theme/tokens';

export default function AuthCallbackScreen() {
  const url = Linking.useURL();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    let active = true;
    void createSessionFromUrl(url)
      .catch((nextError) => {
        if (active) setError(getErrorMessage(nextError));
      })
      .finally(() => {
        if (active) setDone(true);
      });
    return () => { active = false; };
  }, [url]);

  if (done && !error) return <Redirect href="/" />;

  return (
    <View style={styles.screen}>
      <ActivityIndicator size="large" color={colors.orange} />
      <AppText variant="bodyStrong">Connexion sécurisée en cours…</AppText>
      {error ? <AppText color={colors.danger} accessibilityRole="alert">{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.background, padding: spacing.lg },
});
