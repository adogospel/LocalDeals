import { Image } from 'expo-image';
import type { ImagePickerAsset } from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LocationFields } from '@/components/profile/location-fields';
import { Avatar } from '@/components/ui/avatar';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { getErrorMessage } from '@/lib/errors';
import { colors, radii, spacing } from '@/theme/tokens';
import type { AppLanguage } from '@/types/database';

import { pickAvatar } from './profile-service';
import { profileSchema, type ProfileFormValues } from './profile-schema';

type ProfileFormProps = {
  initialValues: ProfileFormValues;
  initialAvatarPath?: string | null;
  submitLabel: string;
  loading?: boolean;
  onSubmit: (values: ProfileFormValues, avatar: ImagePickerAsset | null) => Promise<void>;
};

export function ProfileForm({ initialValues, initialAvatarPath, submitLabel, loading = false, onSubmit }: ProfileFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState(initialValues);
  const [avatar, setAvatar] = useState<ImagePickerAsset | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chooseAvatar = async () => {
    setError(null);
    try {
      const asset = await pickAvatar();
      if (asset) setAvatar(asset);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    }
  };

  const submit = async () => {
    const result = profileSchema.safeParse(values);
    if (!result.success) {
      setError(t('profile.incomplete'));
      return;
    }
    setError(null);
    await onSubmit(result.data, avatar);
  };

  return (
    <View style={styles.form}>
      <View style={styles.avatarBlock}>
        <View style={styles.avatarRing}>
          {avatar ? (
            <Image source={{ uri: avatar.uri }} style={styles.avatarImage} contentFit="cover" />
          ) : (
            <Avatar path={initialAvatarPath} name={values.displayName} size={92} />
          )}
        </View>
        <Pressable onPress={() => void chooseAvatar()} accessibilityRole="button">
          <AppText variant="bodyStrong" color={colors.orange}>
            {avatar || initialAvatarPath ? t('profile.changePhoto') : t('profile.photo')}
          </AppText>
        </Pressable>
      </View>

      <TextField
        label={t('profile.nameLabel')}
        placeholder={t('profile.namePlaceholder')}
        value={values.displayName}
        onChangeText={(displayName) => setValues((current) => ({ ...current, displayName }))}
        autoCapitalize="words"
        textContentType="name"
        maxLength={50}
      />

      <LocationFields
        value={values}
        onChange={(location) => setValues((current) => ({ ...current, ...location }))}
      />

      <View style={styles.fieldGroup}>
        <AppText variant="bodyStrong">{t('profile.languageLabel')}</AppText>
        <View style={styles.languageRow}>
          {(['fr', 'en'] as AppLanguage[]).map((language) => {
            const active = values.preferredLanguage === language;
            return (
              <Pressable
                key={language}
                style={[styles.languageChip, active ? styles.languageChipActive : null]}
                onPress={() => setValues((current) => ({ ...current, preferredLanguage: language }))}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
              >
                <AppText variant="bodyStrong" color={active ? colors.orange : colors.slate}>
                  {language === 'fr' ? 'Français' : 'English'}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {error ? <AppText color={colors.danger} accessibilityRole="alert">{error}</AppText> : null}
      <Button label={submitLabel} loading={loading} onPress={() => void submit()} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  avatarBlock: { alignItems: 'center', gap: spacing.sm },
  avatarRing: { padding: 4, borderWidth: 1, borderColor: colors.orangeSoft, borderRadius: 52, backgroundColor: colors.surface },
  avatarImage: { width: 92, height: 92, borderRadius: 46 },
  fieldGroup: { gap: spacing.sm },
  languageRow: { flexDirection: 'row', gap: spacing.sm },
  languageChip: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  languageChipActive: { borderColor: colors.orange, backgroundColor: colors.orangeSoft },
});
