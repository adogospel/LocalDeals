import { Redirect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { acceptRequiredLegalDocuments } from '@/features/account/account-service';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';

export default function ConsentScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    authMode,
    consentStatus,
    isAuthenticated,
    isConsentLoading,
    refreshConsentStatus,
    signOut,
  } = useAuth();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) return <Redirect href="/(auth)/email" />;
  if (authMode === 'development' || (!isConsentLoading && consentStatus?.hasRequiredConsents)) {
    return <Redirect href="/" />;
  }

  const accept = async () => {
    setAccepting(true);
    setError(null);
    try {
      await acceptRequiredLegalDocuments();
      await refreshConsentStatus();
      router.replace('/');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setAccepting(false);
    }
  };

  const leave = async () => {
    await signOut();
    router.replace('/(auth)/email');
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.icon}><SymbolView name="checkmark.shield.fill" size={31} tintColor={colors.orange} /></View>
        <AppText variant="display">{t('account.consentTitle')}</AppText>
        <AppText color={colors.slate} style={styles.subtitle}>{t('account.consentSubtitle')}</AppText>
      </View>

      <View style={styles.card}>
        <LegalRow
          icon="doc.text.fill"
          title={t('account.termsTitle')}
          version={consentStatus?.requiredVersions.terms}
          onPress={() => router.push('/legal/terms')}
        />
        <View style={styles.separator} />
        <LegalRow
          icon="hand.raised.fill"
          title={t('account.privacyTitle')}
          version={consentStatus?.requiredVersions.privacy}
          onPress={() => router.push('/legal/privacy')}
        />
      </View>

      <View style={styles.notice}>
        <SymbolView name="lock.shield.fill" size={19} tintColor={colors.success} />
        <AppText variant="caption" color={colors.slate} style={styles.noticeText}>{t('account.consentNotice')}</AppText>
      </View>
      {error ? <AppText accessibilityRole="alert" color={colors.danger}>{error}</AppText> : null}
      <Button label={t('account.acceptAndContinue')} loading={accepting || isConsentLoading} onPress={() => void accept()} />
      <Button label={t('auth.logout')} variant="ghost" disabled={accepting} onPress={() => void leave()} />
    </Screen>
  );
}

function LegalRow({
  icon,
  title,
  version,
  onPress,
}: {
  icon: 'doc.text.fill' | 'hand.raised.fill';
  title: string;
  version?: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => [styles.legalRow, pressed && styles.pressed]}>
      <View style={styles.rowIcon}><SymbolView name={icon} size={19} tintColor={colors.orange} /></View>
      <View style={styles.rowCopy}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" color={colors.muted}>{t('account.version', { version: version ?? '—' })}</AppText>
      </View>
      <SymbolView name="chevron.right" size={13} tintColor={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', justifyContent: 'center', gap: spacing.lg, paddingBottom: spacing.xxl },
  hero: { gap: spacing.sm },
  icon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.orangeSoft, marginBottom: spacing.sm },
  subtitle: { maxWidth: 520, lineHeight: 23 },
  card: { overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface },
  legalRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md },
  pressed: { backgroundColor: colors.background },
  rowIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.orangeSoft },
  rowCopy: { flex: 1, gap: 2 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 70, backgroundColor: colors.border },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderRadius: radii.md, backgroundColor: colors.successSoft, padding: spacing.md },
  noticeText: { flex: 1, lineHeight: 19 },
});
