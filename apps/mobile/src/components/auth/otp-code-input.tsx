import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInput as TextInputType } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/tokens';

import { AppText } from '../ui/app-text';

const OTP_LENGTH = 6;

type OtpCodeInputProps = {
  label: string;
  value: string;
  error?: string | null;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function OtpCodeInput({ label, value, error, onChange, onSubmit }: OtpCodeInputProps) {
  const inputRef = useRef<TextInputType>(null);
  const [focused, setFocused] = useState(false);
  const digits = Array.from({ length: OTP_LENGTH }, (_, index) => value[index] ?? '');
  const activeIndex = Math.min(value.length, OTP_LENGTH - 1);

  return (
    <View style={styles.group}>
      <AppText variant="bodyStrong" style={styles.label}>{label}</AppText>
      <Pressable
        style={styles.codeRow}
        onPress={() => inputRef.current?.focus()}
      >
        {digits.map((digit, index) => {
          const active = focused && index === activeIndex;
          return (
            <View key={index} style={[styles.box, active && styles.boxActive, error ? styles.boxError : null]}>
              <AppText style={styles.digit}>{digit}</AppText>
              {active && !digit ? <View style={styles.caret} /> : null}
            </View>
          );
        })}
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(nextValue) => onChange(nextValue.replace(/\D/g, '').slice(0, OTP_LENGTH))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmit}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          returnKeyType="done"
          maxLength={OTP_LENGTH}
          caretHidden
          style={styles.hiddenInput}
          accessibilityLabel={label}
          accessibilityHint="Saisissez le code à six chiffres reçu par e-mail ou SMS"
        />
      </Pressable>
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.feedback} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.md },
  label: { textAlign: 'center' },
  codeRow: { position: 'relative', flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  box: {
    width: 47,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  boxActive: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeSoft,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
  },
  boxError: { borderColor: colors.danger },
  digit: { fontFamily: typography.semibold, fontSize: 22, lineHeight: 28, color: colors.ink },
  caret: { width: 2, height: 24, borderRadius: 1, backgroundColor: colors.orange },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0.01 },
  feedback: { textAlign: 'center' },
});
