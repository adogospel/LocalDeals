import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/app-text';
import { MAX_LISTING_PHOTOS, type ListingPhoto } from '@/features/listings/listing-schema';
import { colors, radii, spacing } from '@/theme/tokens';

type ListingPhotoPickerProps = {
  photos: ListingPhoto[];
  disabled?: boolean;
  onPick: () => void;
  onCamera: () => void;
  onRemove: (index: number) => void;
};

export function ListingPhotoPicker({
  photos,
  disabled = false,
  onPick,
  onCamera,
  onRemove,
}: ListingPhotoPickerProps) {
  const { t } = useTranslation();
  const canAdd = photos.length < MAX_LISTING_PHOTOS && !disabled;

  return (
    <View style={styles.container}>
      <View style={styles.heading}>
        <View style={styles.titleRow}>
          <AppText variant="bodyStrong">{t('sell.photos')}</AppText>
          <View style={styles.requiredPill}>
            <AppText variant="caption" color={colors.orange} style={styles.requiredText}>{t('sell.required')}</AppText>
          </View>
        </View>
        <AppText variant="caption" color={colors.muted}>{photos.length}/{MAX_LISTING_PHOTOS}</AppText>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photos}
      >
        {photos.map((photo, index) => (
          <View key={`${photo.uri}-${index}`} style={styles.photoWrap}>
            <Image source={{ uri: photo.uri }} style={styles.photo} contentFit="cover" transition={150} />
            {index === 0 ? (
              <View style={styles.coverBadge}>
                <AppText variant="caption" color={colors.surface} style={styles.coverText}>{t('sell.cover')}</AppText>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('sell.removePhoto')}
              hitSlop={7}
              onPress={() => onRemove(index)}
              style={({ pressed }) => [styles.removeButton, pressed ? styles.pressed : null]}
            >
              <SymbolView name="xmark" size={12} tintColor={colors.ink} />
            </Pressable>
          </View>
        ))}
        {canAdd ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('sell.choosePhotos')}
            onPress={onPick}
            style={({ pressed }) => [styles.addTile, pressed ? styles.pressed : null]}
          >
            <View style={styles.addIcon}>
              <SymbolView name="photo.on.rectangle.angled" size={22} tintColor={colors.orange} />
            </View>
            <AppText variant="caption" color={colors.slate} style={styles.addText}>{t('sell.choosePhotos')}</AppText>
          </Pressable>
        ) : null}
      </ScrollView>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={!canAdd}
          onPress={onCamera}
          style={({ pressed }) => [styles.cameraButton, !canAdd && styles.disabled, pressed && canAdd ? styles.pressed : null]}
        >
          <SymbolView name="camera.fill" size={16} tintColor={colors.orange} />
          <AppText variant="caption" color={colors.orange}>{t('sell.takePhoto')}</AppText>
        </Pressable>
        <AppText variant="caption" color={colors.muted} style={styles.hint}>{t('sell.photoHint')}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  requiredPill: { borderRadius: radii.pill, backgroundColor: colors.orangeSoft, paddingHorizontal: 8, paddingVertical: 4 },
  requiredText: { fontSize: 9 },
  photos: { gap: 10, paddingRight: spacing.lg },
  photoWrap: { width: 112, height: 136, overflow: 'hidden', borderRadius: radii.md, backgroundColor: colors.border },
  photo: { width: '100%', height: '100%' },
  coverBadge: { position: 'absolute', left: 7, bottom: 7, borderRadius: radii.pill, backgroundColor: 'rgba(23,32,51,0.78)', paddingHorizontal: 8, paddingVertical: 4 },
  coverText: { fontSize: 8 },
  removeButton: { position: 'absolute', top: 7, right: 7, width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.94)' },
  addTile: { width: 112, height: 136, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#FFBE99', borderRadius: radii.md, backgroundColor: colors.orangeSoft, padding: spacing.sm },
  addIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.surface },
  addText: { textAlign: 'center', fontSize: 10, lineHeight: 15 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  cameraButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm },
  hint: { flex: 1, textAlign: 'right', fontSize: 9, lineHeight: 14 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.4 },
});
