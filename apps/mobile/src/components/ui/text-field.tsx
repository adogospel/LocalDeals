import { forwardRef, type ReactNode } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type TextInput as TextInputType,
} from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/tokens';

import { AppText } from './app-text';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  prefix?: string;
  rightAccessory?: ReactNode;
};

export const TextField = forwardRef<TextInputType, TextFieldProps>(function TextField(
  { label, error, prefix, rightAccessory, style, ...props },
  ref,
) {
  return (
    <View style={styles.container}>
      <AppText variant="bodyStrong">{label}</AppText>
      <View style={[styles.inputRow, error ? styles.inputError : null]}>
        {prefix ? <AppText variant="bodyStrong">{prefix}</AppText> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.muted}
          selectionColor={colors.orange}
          {...props}
          style={[styles.input, style]}
        />
        {rightAccessory}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  inputRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  inputError: { borderColor: colors.danger },
  input: {
    flex: 1,
    minHeight: 52,
    color: colors.ink,
    fontFamily: typography.regular,
    fontSize: 16,
  },
});
