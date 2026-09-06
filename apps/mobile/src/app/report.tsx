import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { submitReport } from '@/features/trust/trust-service';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import type { ReportReason } from '@/types/database';

const reasons: ReportReason[] = ['scam', 'prohibited_item', 'harassment', 'spam', 'counterfeit', 'other'];

export default function ReportScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ targetType?: string; targetId?: string; label?: string }>();
  const { authMode, user } = useAuth();
  const [reason, setReason] = useState<ReportReason>('scam');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const targetType = params.targetType === 'listing' || params.targetType === 'message' ? params.targetType : 'user';

  const send = async () => {
    if (!user || !params.targetId) return;
    setLoading(true);
    setError(null);
    try {
      await submitReport(user.id, targetType, params.targetId, reason, details, authMode === 'development');
      setSuccess(true);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Screen contentStyle={styles.successContent}>
        <View style={styles.successIcon}><SymbolView name="checkmark.shield.fill" size={40} tintColor={colors.success} /></View>
        <AppText variant="title" style={styles.centerText}>{t('report.successTitle')}</AppText>
        <AppText color={colors.slate} style={styles.centerText}>{t('report.successBody')}</AppText>
        <Button label={t('listing.goBack')} onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('listing.goBack')} onPress={() => router.back()} style={styles.backButton}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.ink} />
        </Pressable>
        <View style={styles.headerCopy}>
          <AppText variant="title">{t('report.title')}</AppText>
          {params.label ? <AppText variant="caption" color={colors.muted} numberOfLines={1}>{params.label}</AppText> : null}
        </View>
      </View>

      <View style={styles.introCard}>
        <View style={styles.introIcon}><SymbolView name="shield.fill" size={23} tintColor={colors.success} /></View>
        <AppText color={colors.slate} style={styles.introText}>{t('report.subtitle')}</AppText>
      </View>

      <View style={styles.section}>
        <AppText variant="bodyStrong">{t('report.reason')}</AppText>
        <View style={styles.reasons}>
          {reasons.map((item) => {
            const selected = reason === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setReason(item)}
                style={({ pressed }) => [styles.reason, selected ? styles.reasonSelected : null, pressed ? styles.pressed : null]}
              >
                <View style={[styles.radio, selected ? styles.radioSelected : null]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                <AppText variant="bodyStrong" color={selected ? colors.orange : colors.ink} style={styles.reasonLabel}>{t(`report.reasons.${item}`)}</AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.detailsHeading}>
          <AppText variant="bodyStrong">{t('report.details')}</AppText>
          <AppText variant="caption" color={colors.muted}>{details.length}/1000</AppText>
        </View>
        <TextInput
          value={details}
          onChangeText={setDetails}
          placeholder={t('report.detailsPlaceholder')}
          placeholderTextColor={colors.muted}
          selectionColor={colors.orange}
          multiline
          maxLength={1000}
          style={styles.input}
        />
      </View>

      {error ? <AppText variant="caption" color={colors.danger} accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}
      <Button label={t('report.submit')} loading={loading} disabled={!params.targetId} onPress={() => void send()} trailingIcon="arrow.right" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  successContent: { alignItems: 'stretch', justifyContent: 'center', gap: spacing.lg },
  centerText: { textAlign: 'center' },
  successIcon: { alignSelf: 'center', width: 82, height: 82, alignItems: 'center', justifyContent: 'center', borderRadius: 28, backgroundColor: colors.successSoft },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 21, backgroundColor: colors.surface },
  headerCopy: { flex: 1, gap: 2 },
  introCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radii.md, backgroundColor: colors.successSoft, padding: spacing.md },
  introIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.surface },
  introText: { flex: 1 },
  section: { gap: 11 },
  reasons: { gap: 8 },
  reason: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  reasonSelected: { borderColor: colors.orange, backgroundColor: colors.orangeSoft },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  radio: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.muted, borderRadius: 10 },
  radioSelected: { borderColor: colors.orange },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.orange },
  reasonLabel: { flex: 1 },
  detailsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: { minHeight: 138, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: spacing.md, color: colors.ink, fontFamily: typography.regular, fontSize: 15, lineHeight: 22, textAlignVertical: 'top' },
  error: { borderRadius: radii.sm, backgroundColor: colors.dangerSoft, padding: 11 },
});
