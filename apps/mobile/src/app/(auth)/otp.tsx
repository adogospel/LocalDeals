import { SymbolView } from 'expo-symbols';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AuthShell } from '@/components/auth/auth-shell';
import { OtpCodeInput } from '@/components/auth/otp-code-input';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { requestPhoneOtp, verifyPhoneOtp } from '@/features/auth/auth-service';
import { maskPhone } from '@/features/auth/phone';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';

const RESEND_SECONDS = 60;

export default function OtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ phone?: string }>();
  const { isPhoneAuthEnabled } = useAuth();
  const phone = typeof params.phone === 'string' ? params.phone : '';
  const [token, setToken] = useState('');
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (isPhoneAuthEnabled && !phone) router.replace('/(auth)/phone');
  }, [isPhoneAuthEnabled, phone, router]);

  const verify = async () => {
    if (!/^\d{6}$/.test(token)) {
      setError(t('auth.otpInvalid'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await verifyPhoneOtp(phone, token);
      router.replace('/');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!phone || countdown > 0) return;
    setLoading(true);
    setError(null);
    try {
      await requestPhoneOtp(phone);
      setToken('');
      setCountdown(RESEND_SECONDS);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  if (!isPhoneAuthEnabled) {
    return <Redirect href="/(auth)/email" />;
  }

  if (!phone) {
    return null;
  }

  return (
    <AuthShell
      header={
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('auth.changePhone')}
            onPress={() => router.replace('/(auth)/phone')}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <SymbolView name="chevron.left" size={18} tintColor={colors.ink} />
          </Pressable>
          <Logo compact />
          <View style={styles.headerSpacer} />
        </View>
      }
      footer={
        <View style={styles.secureFooter}>
          <SymbolView name="lock.fill" size={13} tintColor={colors.success} />
          <AppText variant="caption" color={colors.muted}>{t('auth.secureCode')}</AppText>
        </View>
      }
    >
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.messageIcon}>
            <SymbolView name="message.fill" size={26} tintColor={colors.orange} />
            <View style={styles.messageDot} />
          </View>
          <AppText variant="display" style={styles.title}>{t('auth.otpTitle')}</AppText>
          <AppText color={colors.slate} style={styles.subtitle}>
            {t('auth.otpSubtitle', { phone: maskPhone(phone) })}
          </AppText>
          <Pressable style={styles.phonePill} onPress={() => router.replace('/(auth)/phone')}>
            <AppText variant="bodyStrong">{maskPhone(phone)}</AppText>
            <SymbolView name="pencil" size={13} tintColor={colors.orange} />
          </Pressable>
        </View>

        <View style={styles.card}>
          <OtpCodeInput
            label={t('auth.otpLabel')}
            value={token}
            error={error}
            onChange={(value) => {
              setToken(value);
              if (error) setError(null);
            }}
            onSubmit={() => void verify()}
          />
          <Button
            label={t('auth.verify')}
            trailingIcon="arrow.right"
            loading={loading}
            disabled={token.length !== 6}
            onPress={() => void verify()}
          />

          <View style={styles.resendBlock}>
            <View style={styles.timerTrack}>
              <View style={[styles.timerProgress, { width: `${(countdown / RESEND_SECONDS) * 100}%` }]} />
            </View>
            <Button
              label={countdown > 0 ? t('auth.resendIn', { seconds: countdown }) : t('auth.resend')}
              variant="ghost"
              disabled={countdown > 0}
              onPress={() => void resend()}
            />
          </View>
        </View>

        <View style={styles.helpCard}>
          <View style={styles.helpIcon}>
            <SymbolView name="questionmark" size={16} tintColor={colors.slate} />
          </View>
          <View style={styles.helpCopy}>
            <AppText variant="bodyStrong">{t('auth.didntReceive')}</AppText>
            <AppText variant="caption" color={colors.slate}>
              {t('auth.otpHelp')}
            </AppText>
          </View>
        </View>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  backButtonPressed: { opacity: 0.66, transform: [{ scale: 0.96 }] },
  headerSpacer: { width: 42 },
  content: { flex: 1, gap: spacing.lg, paddingTop: spacing.md },
  hero: { alignItems: 'center', gap: spacing.md },
  messageIcon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.orangeSoft },
  messageDot: { position: 'absolute', width: 10, height: 10, top: 10, right: 10, borderWidth: 2, borderColor: colors.orangeSoft, borderRadius: 5, backgroundColor: colors.success },
  title: { textAlign: 'center', fontSize: 31, lineHeight: 38, letterSpacing: -0.7 },
  subtitle: { maxWidth: 340, textAlign: 'center' },
  phonePill: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: 10 },
  card: {
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(231,233,238,0.88)',
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.07,
    shadowRadius: 30,
    elevation: 5,
  },
  resendBlock: { gap: spacing.xs },
  timerTrack: { height: 3, overflow: 'hidden', borderRadius: 2, backgroundColor: colors.border },
  timerProgress: { height: 3, borderRadius: 2, backgroundColor: colors.orange, opacity: 0.7 },
  helpCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: radii.md, backgroundColor: colors.orangeSoft, padding: spacing.md },
  helpIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: colors.surface },
  helpCopy: { flex: 1, gap: 2 },
  secureFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
});
