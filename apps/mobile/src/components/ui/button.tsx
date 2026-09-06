import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { colors, radii, spacing } from '@/theme/tokens';

import { AppText } from './app-text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  accessibilityHint?: string;
  trailingIcon?: SymbolViewProps['name'];
};

const variantStyles = {
  primary: { background: colors.orange, foreground: colors.surface, border: colors.orange },
  secondary: { background: colors.surface, foreground: colors.ink, border: colors.border },
  ghost: { background: 'transparent', foreground: colors.orange, border: 'transparent' },
  danger: { background: colors.dangerSoft, foreground: colors.danger, border: colors.dangerSoft },
} as const;

export function Button({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  accessibilityHint,
  trailingIcon,
}: ButtonProps) {
  const palette = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.background, borderColor: palette.border },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      <View style={styles.content}>
        {loading ? <ActivityIndicator color={palette.foreground} /> : null}
        <AppText variant="bodyStrong" color={palette.foreground}>
          {label}
        </AppText>
        {trailingIcon && !loading ? (
          <SymbolView name={trailingIcon} size={17} tintColor={palette.foreground} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.48 },
});
