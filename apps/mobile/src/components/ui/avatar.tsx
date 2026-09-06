import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { getAvatarUrl } from '@/features/profile/profile-service';
import { colors } from '@/theme/tokens';

import { AppText } from './app-text';

type AvatarProps = {
  path?: string | null;
  name?: string | null;
  size?: number;
};

export function Avatar({ path, name, size = 72 }: AvatarProps) {
  const url = getAvatarUrl(path);
  const initials = name?.trim().slice(0, 2).toUpperCase() || 'LD';

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        transition={180}
        accessibilityLabel={`Photo de ${name ?? 'profil'}`}
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <AppText variant="title" color={colors.orange}>{initials}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.orangeSoft,
    borderWidth: 1,
    borderColor: colors.orange,
    overflow: 'hidden',
  },
});
