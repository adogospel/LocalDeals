import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInput as TextInputType } from 'react-native';

import { formatLocalPhone, sanitizeLocalPhone } from '@/features/auth/phone';
import { colors, radii, spacing, typography } from '@/theme/tokens';

import { AppText } from '../ui/app-text';

type PhoneNumberFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  error?: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function PhoneNumberField({ label, value, placeholder, error, onChange, onSubmit }: PhoneNumberFieldProps) {
  const inputRef = useRef<TextInputType>(null);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.group}>
      <AppText variant="bodyStrong">{label}</AppText>
      <Pressable
        style={[styles.field, focused && styles.fieldFocused, error ? styles.fieldError : null]}
        onPress={() => inputRef.current?.focus()}
      >
        <View style={styles.flagBox}>
          <AppText style={styles.flag} accessibilityLabel="Cameroun">🇨🇲</AppText>
        </View>
        <AppText variant="bodyStrong" color={colors.ink}>+237</AppText>
        <View style={styles.divider} />
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          value={formatLocalPhone(value)}
          onChangeText={(nextValue) => onChange(sanitizeLocalPhone(nextValue))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmit}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          selectionColor={colors.orange}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          returnKeyType="done"
          maxLength={12}
          style={styles.input}
        />
      </Pressable>
      {error ? (
        <AppText variant="caption" color={colors.danger} accessibilityRole="alert">
          {error}
        </AppText>
      ) : (
        <AppText variant="caption" color={colors.muted}>Format : 6XX XXX XXX</AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  field: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.045,
    shadowRadius: 16,
    elevation: 2,
  },
  fieldFocused: { borderColor: colors.orange, shadowColor: colors.orange, shadowOpacity: 0.09 },
  fieldError: { borderColor: colors.danger },
  flagBox: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.background,
  },
  flag: { fontSize: 22, lineHeight: 28 },
  divider: { width: 1, height: 28, backgroundColor: colors.border, marginHorizontal: spacing.xs },
  input: {
    flex: 1,
    minHeight: 58,
    color: colors.ink,
    fontFamily: typography.semibold,
    fontSize: 17,
    letterSpacing: 0.5,
  },
});
