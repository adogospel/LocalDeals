import { Redirect, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { exportPersonalData } from '@/features/account/account-service';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';

export default function AccountSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { authMode, consentStatus, isLoading, user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isLoading && !user) return <Redirect href="/" />;
  if (!user) return null;
  const isDevelopment = authMode === 'development';

  const exportData = async () => {
    setExporting(true);
    setFeedback(null);
    setError(null);
    try {
      await exportPersonalData();
      setFeedback(t('account.exportReady'));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Button label={t('common.goBack')} variant="ghost" onPress={() => router.back()} />
        <View style={styles.headerCopy}>
          <View style={styles.icon}><SymbolView name="hand.raised.fill" size={27} tintColor={colors.orange} /></View>
          <AppText variant="display">{t('account.title')}</AppText>
          <AppText color={colors.slate} style={styles.subtitle}>{t('account.subtitle')}</AppText>
        </View>
      </View>

      {isDevelopment ? (
        <View style={styles.warningCard}>
          <AppText variant="bodyStrong" color={colors.warning}>{t('account.developmentTitle')}</AppText>
          <AppText variant="caption" color={colors.warning}>{t('account.developmentBody')}</AppText>
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText variant="bodyStrong" color={colors.slate}>{t('account.yourRights')}</AppText>
        <View style={styles.card}>
          <AccountRow
            icon="doc.text.fill"
            title={t('account.exportTitle')}
            body={t('account.exportBody')}
            loading={exporting}
            disabled={isDevelopment}
            onPress={() => void exportData()}
          />
          <View style={styles.separator} />
          <AccountRow
            icon="checkmark.shield.fill"
            title={t('account.consentsTitle')}
            body={t('account.consentsBody', {
              terms: consentStatus?.requiredVersions.terms ?? '—',
              privacy: consentStatus?.requiredVersions.privacy ?? '—',
            })}
            onPress={() => router.push('/legal/privacy')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="bodyStrong" color={colors.slate}>{t('account.documents')}</AppText>
        <View style={styles.card}>
          <AccountRow icon="doc.text.fill" title={t('account.termsTitle')} body={t('account.readCurrentVersion')} onPress={() => router.push('/legal/terms')} />
          <View style={styles.separator} />
          <AccountRow icon="hand.raised.fill" title={t('account.privacyTitle')} body={t('account.readCurrentVersion')} onPress={() => router.push('/legal/privacy')} />
        </View>
      </View>

      <View style={styles.retentionCard}>
        <View style={styles.retentionHeading}>
          <SymbolView name="lock.shield.fill" size={19} tintColor={colors.success} />
          <AppText variant="bodyStrong">{t('account.retentionTitle')}</AppText>
        </View>
        <AppText variant="caption" color={colors.slate} style={styles.retentionBody}>{t('account.retentionBody')}</AppText>
      </View>

      {feedback ? <AppText accessibilityRole="alert" color={colors.success} style={styles.feedback}>{feedback}</AppText> : null}
      {error ? <AppText accessibilityRole="alert" color={colors.danger} style={styles.feedback}>{error}</AppText> : null}

      <View style={styles.dangerSection}>
        <AppText variant="bodyStrong" color={colors.danger}>{t('account.dangerZone')}</AppText>
        <AppText variant="caption" color={colors.slate}>{t('account.dangerZoneBody')}</AppText>
        <Button
          label={t('account.deleteTitle')}
          variant="danger"
          disabled={isDevelopment || exporting}
          onPress={() => router.push('/settings/delete-account')}
        />
      </View>
    </Screen>
  );
}

function AccountRow({
  icon,
  title,
  body,
  loading = false,
  disabled = false,
  onPress,
}: {
  icon: SymbolViewProps['name'];
  title: string;
  body: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed, (disabled || loading) && styles.rowDisabled]}
    >
      <View style={styles.rowIcon}><SymbolView name={icon} size={19} tintColor={colors.orange} /></View>
      <View style={styles.rowCopy}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="caption" color={colors.slate} style={styles.rowBody}>{body}</AppText>
      </View>
      <SymbolView name={loading ? 'ellipsis' : 'chevron.right'} size={14} tintColor={colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.md },
  headerCopy: { gap: spacing.sm },
  icon: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.orangeSoft },
  subtitle: { maxWidth: 520, lineHeight: 23 },
  warningCard: { gap: spacing.xs, borderRadius: radii.md, backgroundColor: colors.warningSoft, padding: spacing.md },
  section: { gap: spacing.sm },
  card: { overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface },
  row: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md },
  rowPressed: { backgroundColor: colors.background },
  rowDisabled: { opacity: 0.45 },
  rowIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.orangeSoft },
  rowCopy: { flex: 1, gap: 3 },
  rowBody: { lineHeight: 18 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 70, backgroundColor: colors.border },
  retentionCard: { gap: spacing.sm, borderWidth: 1, borderColor: '#CDEBDD', borderRadius: radii.lg, backgroundColor: colors.successSoft, padding: spacing.md },
  retentionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  retentionBody: { lineHeight: 19 },
  feedback: { borderRadius: radii.sm, backgroundColor: colors.surface, padding: spacing.sm },
  dangerSection: { gap: spacing.sm, borderWidth: 1, borderColor: '#F6C7C7', borderRadius: radii.lg, backgroundColor: colors.surface, padding: spacing.lg },
});
