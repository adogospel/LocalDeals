import type { ImagePickerAsset } from 'expo-image-picker';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ProfileForm } from '@/features/profile/profile-form';
import type { ProfileFormValues } from '@/features/profile/profile-schema';
import { updateProfile, uploadAvatar } from '@/features/profile/profile-service';
import { setAppLanguage } from '@/i18n';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, spacing } from '@/theme/tokens';

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { authMode, user, profile, refreshProfile, updateDevelopmentProfile, isLoading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoading && (!user || !profile)) return <Redirect href="/" />;
  if (!user || !profile) return null;

  const submit = async (values: ProfileFormValues, avatar: ImagePickerAsset | null) => {
    setSaving(true);
    setError(null);
    try {
      if (authMode === 'development') {
        await updateDevelopmentProfile({
          display_name: values.displayName.trim(),
          city_id: values.cityId,
          neighborhood_id: values.neighborhoodId,
          custom_city: values.cityId ? null : values.customCity.trim(),
          custom_neighborhood: values.neighborhoodId ? null : values.customNeighborhood.trim(),
          city: values.cityName || values.customCity.trim(),
          neighborhood: values.neighborhoodName || values.customNeighborhood.trim(),
          preferred_language: values.preferredLanguage,
          avatar_path: avatar?.uri ?? profile.avatar_path,
          onboarding_completed: true,
        });
        router.back();
        return;
      }
      let avatarPath = profile.avatar_path;
      if (avatar) avatarPath = await uploadAvatar(user.id, avatar);
      await updateProfile(user.id, { ...values, avatarPath });
      await setAppLanguage(values.preferredLanguage);
      await refreshProfile();
      router.back();
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Button label={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
        <AppText variant="title">{t('profile.settings')}</AppText>
      </View>
      <ProfileForm
        initialValues={{
          displayName: profile.display_name ?? '',
          cityId: profile.city_id,
          cityName: profile.city_id ? (profile.city ?? '') : '',
          customCity: profile.city_id ? '' : (profile.custom_city ?? profile.city ?? ''),
          neighborhoodId: profile.neighborhood_id,
          neighborhoodName: profile.neighborhood_id ? (profile.neighborhood ?? '') : '',
          customNeighborhood: profile.neighborhood_id ? '' : (profile.custom_neighborhood ?? profile.neighborhood ?? ''),
          preferredLanguage: profile.preferred_language,
        }}
        initialAvatarPath={profile.avatar_path}
        submitLabel={t('common.save')}
        loading={saving}
        onSubmit={submit}
      />
      {error ? <AppText color={colors.danger}>{error}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { gap: spacing.sm },
});
