import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AuthShell } from '@/components/auth/auth-shell';
import { AuthTopBar } from '@/components/auth/auth-top-bar';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { requestPasswordReset } from '@/features/auth/auth-service';
import { isValidEmail, normalizeEmail } from '@/features/auth/email';
import { getErrorMessage } from '@/lib/errors';
import { colors, radii, spacing } from '@/theme/tokens';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendCode = async () => {
    if (!isValidEmail(email)) {
      setError(t('emailAuth.invalidEmail'));
      return;
    }
    setLoading(true);
    setError(null);
    const normalizedEmail = normalizeEmail(email);
    try {
      await requestPasswordReset(normalizedEmail);
      router.push({ pathname: '/(auth)/reset-password', params: { email: normalizedEmail } });
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell header={<AuthTopBar onBack={() => router.back()} />}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.icon}><SymbolView name="key.fill" size={31} tintColor={colors.orange} /></View>
          <AppText variant="display" style={styles.title}>{t('emailAuth.forgotTitle')}</AppText>
          <AppText color={colors.slate} style={styles.subtitle}>{t('emailAuth.forgotSubtitle')}</AppText>
        </View>
        <View style={styles.card}>
          <TextField
            label={t('emailAuth.emailLabel')}
            value={email}
            placeholder={t('emailAuth.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            error={error}
            returnKeyType="go"
            onChangeText={(value) => { setEmail(value); setError(null); }}
            onSubmitEditing={() => void sendCode()}
          />
          <Button label={t('emailAuth.sendRecoveryCode')} trailingIcon="arrow.right" loading={loading} onPress={() => void sendCode()} />
        </View>
        <View style={styles.info}>
          <SymbolView name="shield.fill" size={18} tintColor={colors.success} />
          <AppText variant="caption" color={colors.slate} style={styles.infoText}>{t('emailAuth.recoveryPrivacy')}</AppText>
        </View>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: spacing.xl, paddingTop: spacing.lg },
  hero: { gap: spacing.md },
  icon: { width: 66, height: 66, alignItems: 'center', justifyContent: 'center', borderRadius: 23, backgroundColor: colors.orangeSoft },
  title: { maxWidth: 360, fontSize: 34, lineHeight: 41, letterSpacing: -1 },
  subtitle: { maxWidth: 380, lineHeight: 22 },
  card: { gap: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, padding: spacing.lg },
  info: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: radii.md, backgroundColor: colors.successSoft, padding: spacing.md },
  infoText: { flex: 1, lineHeight: 19 },
});
