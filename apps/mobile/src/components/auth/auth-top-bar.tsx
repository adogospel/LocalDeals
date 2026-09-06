import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Logo } from '@/components/ui/logo';
import { colors } from '@/theme/tokens';

type AuthTopBarProps = {
  onBack?: () => void;
  backLabel?: string;
};

export function AuthTopBar({ onBack, backLabel = 'Retour' }: AuthTopBarProps) {
  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          hitSlop={10}
          onPress={onBack}
          style={({ pressed }) => [styles.back, pressed ? styles.pressed : null]}
        >
          <SymbolView name="chevron.left" size={17} tintColor={colors.ink} />
        </Pressable>
      ) : <View style={styles.spacer} />}
      <Logo compact />
      <View style={styles.spacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.9)' },
  spacer: { width: 42 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
