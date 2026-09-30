import { SymbolView } from 'expo-symbols';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AuthShell } from '@/components/auth/auth-shell';
import { PhoneNumberField } from '@/components/auth/phone-number-field';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { requestPhoneOtp } from '@/features/auth/auth-service';
import { isValidCameroonMobile, toE164Cameroon } from '@/features/auth/phone';
import { cacheKeys, setCachedValue } from '@/lib/cache';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';

export default function PhoneScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isConfigured, isPhoneAuthEnabled } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!isValidCameroonMobile(phone)) {
      setError(t('auth.invalidPhone'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const normalizedPhone = toE164Cameroon(phone);
      await requestPhoneOtp(normalizedPhone);
      setCachedValue(cacheKeys.lastPhone, normalizedPhone);
      router.push({ pathname: '/(auth)/otp', params: { phone: normalizedPhone } });
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <AppText variant="caption" color={colors.muted} style={styles.terms}>
      {t('auth.terms')}
    </AppText>
  );

  if (!isPhoneAuthEnabled) {
    return <Redirect href="/(auth)/email" />;
  }

  return (
    <AuthShell
      header={
        <View style={styles.topBar}>
          <Logo />
          <View style={styles.countryPill}>
            <View style={styles.onlineDot} />
            <AppText variant="caption" color={colors.slate}>Cameroun</AppText>
          </View>
        </View>
      }
      footer={footer}
    >
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <SymbolView name="location.fill" size={13} tintColor={colors.orange} />
            <AppText variant="caption" color={colors.orange} style={styles.badgeText}>
              {t('auth.localBadge')}
            </AppText>
          </View>
          <AppText variant="display" style={styles.title}>{t('auth.phoneTitle')}</AppText>
          <AppText color={colors.slate} style={styles.subtitle}>{t('auth.phoneSubtitle')}</AppText>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeading}>
            <AppText variant="title">{t('auth.cardTitle')}</AppText>
            <AppText variant="caption" color={colors.slate}>{t('auth.cardSubtitle')}</AppText>
          </View>

          {!isConfigured ? (
            <View style={styles.configuration}>
              <AppText variant="bodyStrong" color={colors.warning}>{t('configuration.title')}</AppText>
              <AppText variant="caption" color={colors.warning}>{t('configuration.body')}</AppText>
            </View>
          ) : null}

          <PhoneNumberField
            label={t('auth.phoneLabel')}
            value={phone}
            placeholder={t('auth.phonePlaceholder')}
            error={error}
            onChange={(value) => {
              setPhone(value);
              if (error) setError(null);
            }}
            onSubmit={() => void sendCode()}
          />
          <Button
            label={t('auth.sendCode')}
            trailingIcon="arrow.right"
            loading={loading}
            disabled={!isConfigured}
            onPress={() => void sendCode()}
          />
          <View style={styles.privacyRow}>
            <SymbolView name="lock.fill" size={13} tintColor={colors.success} />
            <AppText variant="caption" color={colors.slate}>{t('auth.noSpam')}</AppText>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <AppText variant="caption" color={colors.muted}>{t('emailAuth.or')}</AppText>
            <View style={styles.divider} />
          </View>
          <Button
            label={t('emailAuth.continueWithEmail')}
            variant="secondary"
            trailingIcon="envelope.fill"
            onPress={() => router.replace('/(auth)/email')}
          />
        </View>

        <View style={styles.trustGrid}>
          <View style={styles.trustItem}>
            <View style={styles.trustIcon}>
              <SymbolView name="shield.fill" size={18} tintColor={colors.success} />
            </View>
            <AppText variant="caption" color={colors.slate} style={styles.trustText}>
              {t('auth.secureLogin')}
            </AppText>
          </View>
          <View style={styles.trustItem}>
            <View style={styles.trustIconOrange}>
              <SymbolView name="person.2.fill" size={18} tintColor={colors.orange} />
            </View>
            <AppText variant="caption" color={colors.slate} style={styles.trustText}>
              {t('auth.localCommunity')}
            </AppText>
          </View>
        </View>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  content: { flex: 1, gap: spacing.lg, paddingTop: spacing.md },
  hero: { gap: spacing.md, paddingTop: spacing.sm },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.orangeSoft,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  badgeText: { letterSpacing: 0.75, fontSize: 10 },
  title: { maxWidth: 330, fontSize: 38, lineHeight: 44, letterSpacing: -1.3 },
  subtitle: { maxWidth: 390, fontSize: 15, lineHeight: 23 },
  card: {
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(231,233,238,0.88)',
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255,255,255,0.94)',
    padding: spacing.lg,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.07,
    shadowRadius: 30,
    elevation: 5,
  },
  cardHeading: { gap: spacing.xs },
  configuration: { gap: spacing.sm, borderRadius: radii.md, backgroundColor: colors.warningSoft, padding: spacing.md },
  privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  trustGrid: { flexDirection: 'row', gap: spacing.sm },
  trustItem: {
    flex: 1,
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.58)',
    paddingHorizontal: 11,
  },
  trustIcon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: colors.successSoft },
  trustIconOrange: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: colors.orangeSoft },
  trustText: { flex: 1, fontSize: 10, lineHeight: 15 },
  terms: { textAlign: 'center', lineHeight: 18, paddingHorizontal: spacing.md },
});
