import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useNetwork } from '@/providers/network-provider';
import { colors, spacing } from '@/theme/tokens';

import { AppText } from './ui/app-text';

export function NetworkBanner() {
  const { t } = useTranslation();
  const { isOffline } = useNetwork();

  if (!isOffline) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <AppText variant="caption" color={colors.warning}>{t('offline')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
});

