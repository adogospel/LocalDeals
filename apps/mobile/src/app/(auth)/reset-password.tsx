import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AuthShell } from '@/components/auth/auth-shell';
import { AuthTopBar } from '@/components/auth/auth-top-bar';
import { OtpCodeInput } from '@/components/auth/otp-code-input';
import { PasswordField } from '@/components/auth/password-field';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { updatePassword, verifyRecoveryCode } from '@/features/auth/auth-service';
import { isStrongPassword } from '@/features/auth/email';
import { getErrorMessage } from '@/lib/errors';
import { colors, radii, spacing } from '@/theme/tokens';

type ResetStep = 'code' | 'password' | 'success';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';
  const [step, setStep] = useState<ResetStep>('code');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) router.replace('/(auth)/forgot-password');
  }, [email, router]);

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(token)) {
      setError(t('emailAuth.invalidCode'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await verifyRecoveryCode(email, token);
      setStep('password');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  const savePassword = async () => {
    if (!isStrongPassword(password)) {
      setError(t('emailAuth.passwordPolicy'));
      return;
    }
    if (password !== confirmation) {
      setError(t('emailAuth.passwordMismatch'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await updatePassword(password);
      setStep('success');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null;

  return (
    <AuthShell header={<AuthTopBar onBack={() => router.replace('/(auth)/email')} />}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={[styles.icon, step === 'success' ? styles.successIcon : null]}>
            <SymbolView
              name={step === 'success' ? 'checkmark.shield.fill' : 'lock.rotation'}
              size={32}
              tintColor={step === 'success' ? colors.success : colors.orange}
            />
          </View>
          <AppText variant="display" style={styles.title}>
            {step === 'code' ? t('emailAuth.recoveryCodeTitle') : step === 'password' ? t('emailAuth.newPasswordTitle') : t('emailAuth.passwordChangedTitle')}
          </AppText>
          <AppText color={colors.slate} style={styles.subtitle}>
            {step === 'code' ? t('emailAuth.recoveryCodeSubtitle', { email }) : step === 'password' ? t('emailAuth.newPasswordSubtitle') : t('emailAuth.passwordChangedSubtitle')}
          </AppText>
        </View>

        {step === 'code' ? (
          <View style={styles.card}>
            <OtpCodeInput
              label={t('emailAuth.codeLabel')}
              value={token}
              error={error}
              onChange={(value) => { setToken(value); setError(null); }}
              onSubmit={() => void verifyCode()}
            />
            <Button label={t('common.continue')} trailingIcon="arrow.right" loading={loading} disabled={token.length !== 6} onPress={() => void verifyCode()} />
          </View>
        ) : null}

        {step === 'password' ? (
          <View style={styles.card}>
            <PasswordField
              label={t('emailAuth.newPasswordLabel')}
              value={password}
              placeholder={t('emailAuth.passwordPlaceholder')}
              onChangeText={(value) => { setPassword(value); setError(null); }}
              returnKeyType="next"
            />
            <PasswordField
              label={t('emailAuth.confirmPasswordLabel')}
              value={confirmation}
              placeholder={t('emailAuth.confirmPasswordPlaceholder')}
              error={error}
              onChangeText={(value) => { setConfirmation(value); setError(null); }}
              onSubmitEditing={() => void savePassword()}
            />
            <Button label={t('emailAuth.saveNewPassword')} trailingIcon="checkmark" loading={loading} onPress={() => void savePassword()} />
          </View>
        ) : null}

        {step === 'success' ? (
          <View style={styles.successCard}>
            <AppText variant="bodyStrong">{t('emailAuth.accountSecured')}</AppText>
            <AppText variant="caption" color={colors.slate}>{t('emailAuth.accountSecuredHint')}</AppText>
            <Button label={t('emailAuth.continueToApp')} trailingIcon="arrow.right" onPress={() => router.replace('/')} />
          </View>
        ) : null}
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: spacing.xl, paddingTop: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.md },
  icon: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: colors.orangeSoft },
  successIcon: { backgroundColor: colors.successSoft },
  title: { textAlign: 'center', fontSize: 31, lineHeight: 38, letterSpacing: -0.8 },
  subtitle: { maxWidth: 360, textAlign: 'center', lineHeight: 22 },
  card: { gap: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, padding: spacing.lg },
  successCard: { gap: spacing.md, borderWidth: 1, borderColor: '#CDEBDD', borderRadius: radii.lg, backgroundColor: colors.successSoft, padding: spacing.lg },
});
