import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '@/theme/tokens';

import { AppText } from './app-text';

type LogoProps = { compact?: boolean };

export function Logo({ compact = false }: LogoProps) {
  return (
    <View style={styles.row} accessibilityLabel="LocalDeals">
      <View style={[styles.mark, compact && styles.markCompact]}>
        <AppText variant={compact ? 'bodyStrong' : 'title'} color={colors.surface}>
          LD
        </AppText>
      </View>
      {!compact ? (
        <AppText variant="title">
          Local<AppText variant="title" color={colors.orange}>Deals</AppText>
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mark: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-3deg' }],
  },
  markCompact: { width: 36, height: 36, borderRadius: radii.sm },
});

