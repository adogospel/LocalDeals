import type { ImagePickerAsset } from 'expo-image-picker';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/app-text';
import { Logo } from '@/components/ui/logo';
import { Screen } from '@/components/ui/screen';
import { ProfileForm } from '@/features/profile/profile-form';
import type { ProfileFormValues } from '@/features/profile/profile-schema';
import { updateProfile, uploadAvatar } from '@/features/profile/profile-service';
import { setAppLanguage } from '@/i18n';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, spacing } from '@/theme/tokens';

export default function OnboardingScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, profile, refreshProfile, isLoading } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoading && !user) return <Redirect href="/(auth)/email" />;
  if (!user) return null;

  const submit = async (values: ProfileFormValues, avatar: ImagePickerAsset | null) => {
    setSaving(true);
    setError(null);
    try {
      let avatarPath = profile?.avatar_path ?? null;
      if (avatar) avatarPath = await uploadAvatar(user.id, avatar);
      await updateProfile(user.id, { ...values, avatarPath });
      await setAppLanguage(values.preferredLanguage);
      await refreshProfile();
      router.replace('/');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <Logo />
      <View style={styles.hero}>
        <AppText variant="caption" color={colors.orange} style={styles.eyebrow}>{t('profile.onboardingEyebrow')}</AppText>
        <AppText variant="display">{t('profile.onboardingTitle')}</AppText>
        <AppText color={colors.slate}>{t('profile.onboardingSubtitle')}</AppText>
      </View>
      <ProfileForm
        initialValues={{
          displayName: profile?.display_name ?? '',
          cityId: profile?.city_id ?? null,
          cityName: profile?.city_id ? (profile.city ?? '') : '',
          customCity: profile?.city_id ? '' : (profile?.custom_city ?? profile?.city ?? ''),
          neighborhoodId: profile?.neighborhood_id ?? null,
          neighborhoodName: profile?.neighborhood_id ? (profile.neighborhood ?? '') : '',
          customNeighborhood: profile?.neighborhood_id ? '' : (profile?.custom_neighborhood ?? profile?.neighborhood ?? ''),
          preferredLanguage: profile?.preferred_language ?? (i18n.language === 'en' ? 'en' : 'fr'),
        }}
        initialAvatarPath={profile?.avatar_path}
        submitLabel={t('profile.complete')}
        loading={saving}
        onSubmit={submit}
      />
      {error ? <AppText color={colors.danger}>{error}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingBottom: spacing.xxl },
  hero: { gap: spacing.md },
  eyebrow: { letterSpacing: 1.2 },
});
