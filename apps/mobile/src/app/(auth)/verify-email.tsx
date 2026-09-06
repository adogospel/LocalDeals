import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AuthShell } from '@/components/auth/auth-shell';
import { AuthTopBar } from '@/components/auth/auth-top-bar';
import { OtpCodeInput } from '@/components/auth/otp-code-input';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { resendEmailCode, verifyEmailCode } from '@/features/auth/auth-service';
import { getErrorMessage } from '@/lib/errors';
import { colors, radii, spacing } from '@/theme/tokens';

const RESEND_SECONDS = 60;

export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';
  const [token, setToken] = useState('');
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) router.replace('/(auth)/sign-up');
  }, [email, router]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const verify = async () => {
    if (!/^\d{6}$/.test(token)) {
      setError(t('emailAuth.invalidCode'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await verifyEmailCode(email, token);
      router.replace('/');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (countdown > 0) return;
    setLoading(true);
    setError(null);
    try {
      await resendEmailCode(email);
      setToken('');
      setCountdown(RESEND_SECONDS);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  if (!email) return null;

  return (
    <AuthShell
      header={<AuthTopBar onBack={() => router.replace('/(auth)/email')} />}
      footer={
        <View style={styles.secureFooter}>
          <SymbolView name="lock.fill" size={13} tintColor={colors.success} />
          <AppText variant="caption" color={colors.muted}>{t('emailAuth.codeSecurity')}</AppText>
        </View>
      }
    >
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.icon}>
            <SymbolView name="envelope.badge.fill" size={30} tintColor={colors.orange} />
            <View style={styles.successDot}><SymbolView name="checkmark" size={9} tintColor={colors.surface} /></View>
          </View>
          <AppText variant="display" style={styles.title}>{t('emailAuth.verifyTitle')}</AppText>
          <AppText color={colors.slate} style={styles.subtitle}>{t('emailAuth.verifySubtitle', { email })}</AppText>
          <View style={styles.emailPill}><AppText variant="caption">{email}</AppText></View>
        </View>

        <View style={styles.card}>
          <OtpCodeInput
            label={t('emailAuth.codeLabel')}
            value={token}
            error={error}
            onChange={(value) => { setToken(value); setError(null); }}
            onSubmit={() => void verify()}
          />
          <Button
            label={t('emailAuth.confirmEmail')}
            trailingIcon="arrow.right"
            loading={loading}
            disabled={token.length !== 6}
            onPress={() => void verify()}
          />
          <Button
            label={countdown > 0 ? t('auth.resendIn', { seconds: countdown }) : t('emailAuth.resendCode')}
            variant="ghost"
            disabled={countdown > 0}
            onPress={() => void resend()}
          />
        </View>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: spacing.xl, paddingTop: spacing.lg },
  hero: { alignItems: 'center', gap: spacing.md },
  icon: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: colors.orangeSoft },
  successDot: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.orangeSoft, borderRadius: 10, backgroundColor: colors.success },
  title: { textAlign: 'center', fontSize: 31, lineHeight: 38, letterSpacing: -0.8 },
  subtitle: { maxWidth: 350, textAlign: 'center', lineHeight: 22 },
  emailPill: { borderRadius: radii.pill, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: 9 },
  card: { gap: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: 'rgba(255,255,255,0.95)', padding: spacing.lg, shadowColor: colors.ink, shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.07, shadowRadius: 30, elevation: 5 },
  secureFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
});
