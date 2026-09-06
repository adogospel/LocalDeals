import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { useTranslation } from 'react-i18next';

import { formatPrice, type Listing } from '@/features/listings/mock-listings';
import { colors, radii, spacing } from '@/theme/tokens';

import { AppText } from '../ui/app-text';

type ListingCardProps = {
  listing: Listing;
  onPress: () => void;
  onToggleFavorite?: () => void;
  favoriteLoading?: boolean;
};

export function ListingCard({ listing, onPress, onToggleFavorite, favoriteLoading = false }: ListingCardProps) {
  const { t } = useTranslation();
  const isFavorite = Boolean(listing.isFavorite);
  const metadata = [listing.neighborhood || listing.city, listing.postedLabel].filter(Boolean).join(' · ');

  const toggleFavorite = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onToggleFavorite?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.title}, ${formatPrice(listing.price)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: listing.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={220}
          accessibilityLabel={`Photo de ${listing.title}`}
        />
        {onToggleFavorite ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? t('listing.removeFavorite') : t('listing.addFavorite')}
            hitSlop={8}
            disabled={favoriteLoading}
            onPress={toggleFavorite}
            style={({ pressed }) => [styles.favorite, pressed ? styles.favoritePressed : null]}
          >
            {favoriteLoading
              ? <ActivityIndicator size="small" color={colors.orange} />
              : <SymbolView name={isFavorite ? 'heart.fill' : 'heart'} size={17} tintColor={isFavorite ? colors.orange : colors.ink} />}
          </Pressable>
        ) : null}
        {listing.status === 'reserved' ? (
          <View style={styles.statusPill}>
            <SymbolView name="clock.fill" size={10} tintColor={colors.surface} />
            <AppText variant="caption" style={styles.statusText}>{t('myListings.status.reserved')}</AppText>
          </View>
        ) : null}
        <View style={styles.conditionPill}>
          <AppText variant="caption" style={styles.conditionText}>{listing.condition}</AppText>
        </View>
      </View>
      <View style={styles.copy}>
        <AppText variant="bodyStrong" numberOfLines={1} style={styles.title}>{listing.title}</AppText>
        <AppText variant="bodyStrong" color={colors.orange} style={styles.price}>{formatPrice(listing.price)}</AppText>
        <View style={styles.metaRow}>
          <SymbolView name="location.fill" size={11} tintColor={colors.muted} />
          <AppText variant="caption" color={colors.muted} numberOfLines={1} style={styles.metaText}>
            {metadata}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: '48.2%', gap: 10, marginBottom: spacing.lg },
  cardPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  imageWrap: {
    aspectRatio: 0.92,
    overflow: 'hidden',
    borderRadius: radii.md,
    backgroundColor: colors.border,
  },
  image: { width: '100%', height: '100%' },
  favorite: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  favoritePressed: { transform: [{ scale: 0.9 }] },
  statusPill: { position: 'absolute', left: 9, top: 9, flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radii.pill, backgroundColor: 'rgba(23,32,51,0.82)', paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { color: colors.surface, fontSize: 8, lineHeight: 11 },
  conditionPill: {
    position: 'absolute',
    left: 9,
    bottom: 9,
    maxWidth: '82%',
    borderRadius: radii.pill,
    backgroundColor: 'rgba(23,32,51,0.78)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  conditionText: { color: colors.surface, fontSize: 9, lineHeight: 13 },
  copy: { gap: 4, paddingHorizontal: 2 },
  title: { fontSize: 13, lineHeight: 18 },
  price: { fontSize: 14, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { flex: 1, fontSize: 9, lineHeight: 14 },
});
