import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, radii, spacing } from '@/theme/tokens';

import { AppText } from './ui/app-text';

type PlaceholderFeatureProps = {
  title: string;
  description: string;
  symbol: string;
};

export function PlaceholderFeature({ title, description, symbol }: PlaceholderFeatureProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <AppText style={styles.symbol}>{symbol}</AppText>
      <AppText variant="title" style={styles.center}>{title}</AppText>
      <AppText color={colors.slate} style={styles.center}>{description}</AppText>
      <View style={styles.badge}>
        <AppText variant="caption" color={colors.orange}>{t('common.comingSoon')}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  symbol: { fontSize: 36, lineHeight: 44 },
  center: { textAlign: 'center' },
  badge: {
    backgroundColor: colors.orangeSoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});

