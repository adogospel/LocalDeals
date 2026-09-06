import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { TextField } from '@/components/ui/text-field';
import { colors } from '@/theme/tokens';

type PasswordFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  error?: string | null;
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'go' | 'next';
};

export function PasswordField({
  label,
  value,
  placeholder,
  error,
  onChangeText,
  onSubmitEditing,
  returnKeyType = 'done',
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      label={label}
      value={value}
      placeholder={placeholder}
      error={error}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="password"
      textContentType="password"
      returnKeyType={returnKeyType}
      onChangeText={onChangeText}
      onSubmitEditing={onSubmitEditing}
      rightAccessory={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          hitSlop={10}
          onPress={() => setVisible((current) => !current)}
        >
          <SymbolView name={visible ? 'eye.slash.fill' : 'eye.fill'} size={18} tintColor={colors.slate} />
        </Pressable>
      }
    />
  );
}
