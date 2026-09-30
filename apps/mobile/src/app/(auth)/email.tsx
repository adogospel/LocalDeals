import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AuthShell } from '@/components/auth/auth-shell';
import { AuthTopBar } from '@/components/auth/auth-top-bar';
import { PasswordField } from '@/components/auth/password-field';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { signInWithEmail, signInWithGoogle } from '@/features/auth/auth-service';
import { isValidEmail, normalizeEmail } from '@/features/auth/email';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';

export default function EmailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    isConfigured,
    isDevelopmentAccessEnabled,
    isGoogleAuthEnabled,
    isPhoneAuthEnabled,
    signInForDevelopment,
  } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<'email' | 'google' | 'development' | null>(null);

  const login = async () => {
    if (!isValidEmail(email)) {
      setError(t('emailAuth.invalidEmail'));
      return;
    }
    if (!password) {
      setError(t('emailAuth.passwordRequired'));
      return;
    }

    setLoading('email');
    setError(null);
    try {
      await signInWithEmail(normalizeEmail(email), password);
      router.replace('/');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(null);
    }
  };

  const loginWithGoogle = async () => {
    setLoading('google');
    setError(null);
    try {
      const completed = await signInWithGoogle();
      if (completed) router.replace('/');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(null);
    }
  };

  const enterDevelopmentMode = async () => {
    if (!isValidEmail(email)) {
      setError(t('emailAuth.invalidEmail'));
      return;
    }

    setLoading('development');
    setError(null);
    try {
      await signInForDevelopment(normalizeEmail(email));
      router.replace('/');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(null);
    }
  };

  return (
    <AuthShell
      header={<AuthTopBar />}
      footer={<AppText variant="caption" color={colors.muted} style={styles.terms}>{t('auth.terms')}</AppText>}
    >
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <SymbolView name="lock.shield.fill" size={31} tintColor={colors.orange} />
          </View>
          <View style={styles.eyebrow}>
            <View style={styles.onlineDot} />
            <AppText variant="caption" color={colors.orange} style={styles.eyebrowText}>{t('emailAuth.secureAccess')}</AppText>
          </View>
          <AppText variant="display" style={styles.title}>{t('emailAuth.signInTitle')}</AppText>
          <AppText color={colors.slate} style={styles.subtitle}>{t('emailAuth.signInSubtitle')}</AppText>
        </View>

        <View style={styles.card}>
          {!isConfigured ? (
            <View style={styles.configuration}>
              <AppText variant="bodyStrong" color={colors.warning}>{t('configuration.title')}</AppText>
              <AppText variant="caption" color={colors.warning}>{t('configuration.body')}</AppText>
            </View>
          ) : null}
          <TextField
            label={t('emailAuth.emailLabel')}
            value={email}
            placeholder={t('emailAuth.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="next"
            onChangeText={(value) => { setEmail(value); setError(null); }}
          />
          <PasswordField
            label={t('emailAuth.passwordLabel')}
            value={password}
            placeholder={t('emailAuth.passwordPlaceholder')}
            onChangeText={(value) => { setPassword(value); setError(null); }}
            onSubmitEditing={() => void login()}
            returnKeyType="go"
          />
          <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotLink}>
            <AppText variant="caption" color={colors.orange}>{t('emailAuth.forgotPassword')}</AppText>
          </Pressable>
          {error ? <AppText color={colors.danger} accessibilityRole="alert">{error}</AppText> : null}
          <Button
            label={t('emailAuth.signIn')}
            trailingIcon="arrow.right"
            loading={loading === 'email'}
            disabled={!isConfigured || loading !== null}
            onPress={() => void login()}
          />

          {isGoogleAuthEnabled ? (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <AppText variant="caption" color={colors.muted}>{t('emailAuth.or')}</AppText>
                <View style={styles.divider} />
              </View>
              <Button
                label={t('emailAuth.continueGoogle')}
                variant="secondary"
                loading={loading === 'google'}
                disabled={loading !== null}
                onPress={() => void loginWithGoogle()}
              />
            </>
          ) : null}
        </View>

        {isDevelopmentAccessEnabled ? (
          <View style={styles.developmentCard}>
            <View style={styles.developmentHeader}>
              <View style={styles.developmentBadge}>
                <View style={styles.developmentDot} />
                <AppText variant="caption" color={colors.orange} style={styles.developmentBadgeText}>
                  {t('emailAuth.developmentAccess')}
                </AppText>
              </View>
              <SymbolView name="hammer.fill" size={18} tintColor={colors.orange} />
            </View>
            <View style={styles.developmentCopy}>
              <AppText variant="bodyStrong">{t('emailAuth.developmentTitle')}</AppText>
              <AppText variant="caption" color={colors.slate} style={styles.developmentSubtitle}>
                {t('emailAuth.developmentSubtitle')}
              </AppText>
            </View>
            <Button
              label={t('emailAuth.developmentButton')}
              trailingIcon="arrow.right"
              loading={loading === 'development'}
              disabled={loading !== null}
              onPress={() => void enterDevelopmentMode()}
            />
            <AppText variant="caption" color={colors.muted} style={styles.developmentNotice}>
              {t('emailAuth.developmentNotice')}
            </AppText>
          </View>
        ) : null}

        <View style={styles.accountRow}>
          <AppText color={colors.slate}>{t('emailAuth.noAccount')}</AppText>
          <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/sign-up')}>
            <AppText variant="bodyStrong" color={colors.orange}>{t('emailAuth.createAccount')}</AppText>
          </Pressable>
        </View>

        {isPhoneAuthEnabled ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/(auth)/phone')} style={styles.phoneLink}>
            <SymbolView name="iphone" size={15} tintColor={colors.slate} />
            <AppText variant="caption" color={colors.slate}>{t('emailAuth.usePhone')}</AppText>
          </Pressable>
        ) : null}
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: spacing.lg, paddingTop: spacing.sm },
  hero: { gap: spacing.sm },
  heroIcon: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.orangeSoft, transform: [{ rotate: '-3deg' }] },
  eyebrow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: radii.pill, backgroundColor: colors.orangeSoft, paddingHorizontal: 10, paddingVertical: 6 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  eyebrowText: { fontSize: 10, letterSpacing: 0.7 },
  title: { fontSize: 35, lineHeight: 42, letterSpacing: -1.1 },
  subtitle: { maxWidth: 390, fontSize: 14, lineHeight: 22 },
  card: { gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: 'rgba(255,255,255,0.95)', padding: spacing.lg, shadowColor: colors.ink, shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.07, shadowRadius: 30, elevation: 5 },
  configuration: { gap: spacing.sm, borderRadius: radii.md, backgroundColor: colors.warningSoft, padding: spacing.md },
  developmentCard: { gap: spacing.md, overflow: 'hidden', borderWidth: 1, borderColor: '#FFD2BA', borderRadius: radii.lg, backgroundColor: colors.orangeSoft, padding: spacing.lg },
  developmentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  developmentBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', borderRadius: radii.pill, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 6 },
  developmentDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.orange },
  developmentBadgeText: { fontSize: 10, letterSpacing: 0.65 },
  developmentCopy: { gap: spacing.xs },
  developmentSubtitle: { lineHeight: 19 },
  developmentNotice: { textAlign: 'center', lineHeight: 17 },
  forgotLink: { alignSelf: 'flex-end', marginTop: -spacing.sm },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  accountRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 6 },
  phoneLink: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, padding: spacing.sm },
  terms: { textAlign: 'center', lineHeight: 18, paddingHorizontal: spacing.md },
});
