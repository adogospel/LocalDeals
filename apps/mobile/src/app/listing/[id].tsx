import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getActiveDealForListing, type DealView } from '@/features/deals/deal-service';
import { getListing, toggleFavorite } from '@/features/listings/listing-service';
import { formatPrice, type Listing } from '@/features/listings/mock-listings';
import { isListingPurchasable } from '@/features/listings/listing-status';
import { getOrCreateConversation } from '@/features/messaging/messaging-service';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';

export default function ListingDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authMode, user } = useAuth();
  const { width: viewportWidth } = useWindowDimensions();
  const [listing, setListing] = useState<Listing | null>(null);
  const [activeDeal, setActiveDeal] = useState<DealView | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setActiveImageIndex(0);
    setLoading(true);
    setError(null);
    setActiveDeal(null);
    void (async () => {
      try {
        const nextListing = await getListing(id, { development: authMode === 'development' });
        if (!active) return;
        setListing(nextListing);
        if (nextListing?.status === 'reserved' && user) {
          const nextDeal = await getActiveDealForListing(nextListing.id, user.id, authMode === 'development');
          if (active) setActiveDeal(nextDeal);
        }
      } catch (nextError) {
        if (active) setError(getErrorMessage(nextError));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [authMode, id, refreshKey, user]);

  const changeFavorite = async () => {
    if (!user || !listing) return;
    setFavoriteLoading(true);
    try {
      const isFavorite = await toggleFavorite(user.id, listing.id, Boolean(listing.isFavorite), authMode === 'development');
      setListing((current) => current ? { ...current, isFavorite } : current);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setFavoriteLoading(false);
    }
  };

  const openConversation = async (makeOffer = false) => {
    if (!user || !listing || conversationLoading) return;
    if (listing.sellerId === user.id) {
      router.push('/my-listings');
      return;
    }
    if (makeOffer && !isListingPurchasable(listing.status)) {
      setError(t('listing.soldUnavailable'));
      return;
    }
    if (!makeOffer && listing.status === 'reserved' && !activeDeal) {
      setError(t('listing.reservedUnavailable'));
      return;
    }
    setConversationLoading(true);
    setError(null);
    try {
      const conversationId = await getOrCreateConversation(listing.id, user.id, authMode === 'development');
      router.push({
        pathname: '/conversation/[id]',
        params: { id: conversationId, ...(makeOffer ? { offer: 'true' } : {}) },
      });
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setConversationLoading(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.emptyState}><ActivityIndicator color={colors.orange} /></SafeAreaView>;
  }

  if (!listing) {
    return (
      <SafeAreaView style={styles.emptyState}>
        <SymbolView name="shippingbox" size={42} tintColor={colors.muted} />
        <AppText variant="title">{error ? t('search.emptyTitle') : t('listing.notFound')}</AppText>
        {error ? <AppText color={colors.danger} style={styles.emptyCopy}>{error}</AppText> : null}
        {error
          ? <Button label={t('common.retry')} onPress={() => setRefreshKey((value) => value + 1)} />
          : <Button label={t('listing.backHome')} onPress={() => router.replace('/(tabs)/home')} />}
      </SafeAreaView>
    );
  }

  const imageUrls = listing.imageUrls?.length ? listing.imageUrls : [listing.imageUrl];
  const isOwnListing = listing.sellerId === user?.id;
  const isPurchasable = isListingPurchasable(listing.status);
  const openSellerProfile = () => {
    const sellerId = listing.sellerId ?? listing.seller.id;
    if (sellerId) router.push({ pathname: '/profile/[id]', params: { id: sellerId } });
  };
  const updateActiveImage = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / viewportWidth);
    setActiveImageIndex(Math.max(0, Math.min(nextIndex, imageUrls.length - 1)));
  };

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <ScrollView
            horizontal
            pagingEnabled
            directionalLockEnabled
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={updateActiveImage}
            accessibilityLabel={`Photos de ${listing.title}`}
          >
            {imageUrls.map((imageUrl, index) => (
              <Image
                key={`${imageUrl}-${index}`}
                source={{ uri: imageUrl }}
                style={[styles.heroImage, { width: viewportWidth }]}
                contentFit="cover"
                transition={260}
                accessibilityLabel={`Photo ${index + 1} sur ${imageUrls.length} de ${listing.title}`}
              />
            ))}
          </ScrollView>
          {imageUrls.length > 1 ? (
            <View style={styles.paginationDots} pointerEvents="none">
              {imageUrls.map((imageUrl, index) => (
                <View
                  key={`dot-${imageUrl}-${index}`}
                  style={[styles.paginationDot, index === activeImageIndex ? styles.paginationDotActive : null]}
                />
              ))}
            </View>
          ) : null}
          <View style={styles.imageCount}>
            <SymbolView name="photo.fill" size={12} tintColor={colors.surface} />
            <AppText variant="caption" color={colors.surface} style={styles.imageCountText}>{activeImageIndex + 1} / {imageUrls.length}</AppText>
          </View>
          {!isPurchasable ? (
            <View style={styles.soldBadge}>
              <SymbolView name={listing.status === 'reserved' ? 'clock.fill' : 'checkmark.seal.fill'} size={15} tintColor={colors.surface} />
              <AppText variant="caption" color={colors.surface}>{listing.status === 'sold' ? t('listing.sold') : listing.status === 'reserved' ? t('listing.reserved') : t('listing.unavailable')}</AppText>
            </View>
          ) : null}
        </View>

        <View style={styles.content}>
          <View style={styles.metaTopRow}>
            <View style={styles.conditionPill}>
              <SymbolView name="sparkles" size={12} tintColor={colors.success} />
              <AppText variant="caption" color={colors.success}>{listing.condition}</AppText>
            </View>
            <AppText variant="caption" color={colors.muted}>{listing.postedLabel}</AppText>
          </View>

          <View style={styles.heading}>
            <AppText variant="display" style={styles.title}>{listing.title}</AppText>
            <AppText variant="display" color={colors.orange} style={styles.price}>{formatPrice(listing.price)}</AppText>
          </View>

          <View style={styles.locationCard}>
            <View style={styles.locationIcon}>
              <SymbolView name="location.fill" size={17} tintColor={colors.orange} />
            </View>
            <View style={styles.locationCopy}>
              <AppText variant="bodyStrong">{listing.neighborhood}, {listing.city}</AppText>
              <AppText variant="caption" color={colors.slate}>{t('listing.meetup')}</AppText>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <AppText variant="title" style={styles.sectionTitle}>{t('listing.description')}</AppText>
            <AppText color={colors.slate} style={styles.description}>{listing.description}</AppText>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AppText variant="title" style={styles.sectionTitle}>{t('listing.seller')}</AppText>
              <Pressable accessibilityRole="button" onPress={openSellerProfile}>
                <AppText variant="caption" color={colors.orange}>{t('listing.viewProfile')}</AppText>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={openSellerProfile}
              style={({ pressed }) => [styles.sellerCard, pressed ? styles.pressed : null]}
            >
              <Avatar path={listing.seller.avatarPath} name={listing.seller.name} size={54} />
              <View style={styles.sellerCopy}>
                <View style={styles.sellerNameRow}>
                  <AppText variant="bodyStrong">{listing.seller.name}</AppText>
                  <SymbolView name="checkmark.seal.fill" size={15} tintColor={colors.success} />
                </View>
                {listing.seller.reviews > 0 ? (
                  <View style={styles.ratingRow}>
                    <SymbolView name="star.fill" size={13} tintColor="#F4A423" />
                    <AppText variant="caption">{listing.seller.rating} · {listing.seller.reviews} avis</AppText>
                  </View>
                ) : null}
                <AppText variant="caption" color={colors.muted}>{listing.seller.responseTime}</AppText>
              </View>
              <SymbolView name="chevron.right" size={14} tintColor={colors.muted} />
            </Pressable>
          </View>

          <View style={styles.safetyCard}>
            <View style={styles.safetyIcon}>
              <SymbolView name="shield.fill" size={21} tintColor={colors.success} />
            </View>
            <View style={styles.safetyCopy}>
              <AppText variant="bodyStrong">{t('listing.safetyTitle')}</AppText>
              <AppText variant="caption" color={colors.slate}>{t('listing.safetyBody')}</AppText>
            </View>
          </View>
          {!isOwnListing ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/report', params: { targetType: 'listing', targetId: listing.id, label: listing.title } })}
              style={styles.reportButton}
            >
              <SymbolView name="exclamationmark.triangle.fill" size={15} tintColor={colors.slate} />
              <AppText variant="caption" color={colors.slate}>{t('report.title')}</AppText>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <SafeAreaView edges={['top']} style={styles.topActions} pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('listing.goBack')}
          hitSlop={8}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.roundButton, pressed ? styles.pressed : null]}
        >
          <SymbolView name="chevron.left" size={18} tintColor={colors.ink} />
        </Pressable>
        <View style={styles.topRightActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('listing.share')}
            hitSlop={8}
            onPress={() => void Share.share({ message: `${listing.title} · ${formatPrice(listing.price)} sur LocalDeals` })}
            style={({ pressed }) => [styles.roundButton, pressed ? styles.pressed : null]}
          >
            <SymbolView name="square.and.arrow.up" size={17} tintColor={colors.ink} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={listing.isFavorite ? t('listing.removeFavorite') : t('listing.addFavorite')}
            hitSlop={8}
            disabled={favoriteLoading}
            onPress={() => void changeFavorite()}
            style={({ pressed }) => [styles.roundButton, pressed ? styles.pressed : null]}
          >
            {favoriteLoading
              ? <ActivityIndicator size="small" color={colors.orange} />
              : <SymbolView name={listing.isFavorite ? 'heart.fill' : 'heart'} size={19} tintColor={listing.isFavorite ? colors.orange : colors.ink} />}
          </Pressable>
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
        {error ? <AppText variant="caption" color={colors.danger} accessibilityRole="alert" style={styles.bottomError}>{error}</AppText> : null}
        {activeDeal ? (
          <View style={styles.bottomActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('listing.messageSeller')}
              disabled={conversationLoading}
              onPress={() => void openConversation(false)}
              style={({ pressed }) => [styles.messageButton, pressed ? styles.pressed : null]}
            >
              {conversationLoading
                ? <ActivityIndicator size="small" color={colors.orange} />
                : <SymbolView name="message.fill" size={20} tintColor={colors.orange} />}
            </Pressable>
            <View style={styles.offerButtonWrap}>
              <Button label={t('deals.manage')} trailingIcon="arrow.right" onPress={() => router.push({ pathname: '/deal/[id]', params: { id: activeDeal.id } })} />
            </View>
          </View>
        ) : isOwnListing ? (
          <Button label={t('myListings.title')} trailingIcon="arrow.right" onPress={() => router.push('/my-listings')} />
        ) : isPurchasable ? (
          <View style={styles.bottomActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('listing.messageSeller')}
              disabled={conversationLoading}
              onPress={() => void openConversation(false)}
              style={({ pressed }) => [styles.messageButton, pressed ? styles.pressed : null]}
            >
              {conversationLoading
                ? <ActivityIndicator size="small" color={colors.orange} />
                : <SymbolView name="message.fill" size={20} tintColor={colors.orange} />}
            </Pressable>
            <View style={styles.offerButtonWrap}>
              <Button label={t('listing.makeOffer')} trailingIcon="arrow.right" loading={conversationLoading} onPress={() => void openConversation(true)} />
            </View>
          </View>
        ) : (
          <View style={styles.unavailableAction}>
            <View style={styles.unavailableIcon}><SymbolView name="checkmark.seal.fill" size={19} tintColor={colors.slate} /></View>
            <View style={styles.unavailableCopy}>
              <AppText variant="bodyStrong">{listing.status === 'sold' ? t('listing.sold') : listing.status === 'reserved' ? t('listing.reserved') : t('listing.unavailable')}</AppText>
              <AppText variant="caption" color={colors.slate}>{listing.status === 'reserved' ? t('listing.reservedUnavailable') : t('listing.soldUnavailable')}</AppText>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 112 },
  hero: { height: 420, backgroundColor: colors.border },
  heroImage: { height: 420 },
  paginationDots: { position: 'absolute', left: 0, right: 0, bottom: spacing.md, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  paginationDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.55)' },
  paginationDotActive: { width: 18, backgroundColor: colors.surface },
  imageCount: { position: 'absolute', right: spacing.md, bottom: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radii.pill, backgroundColor: 'rgba(23,32,51,0.74)', paddingHorizontal: 10, paddingVertical: 7 },
  imageCountText: { fontSize: 10 },
  soldBadge: { position: 'absolute', left: spacing.md, top: 78, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: radii.pill, backgroundColor: 'rgba(23,32,51,0.88)', paddingHorizontal: 12, paddingVertical: 8 },
  topActions: { position: 'absolute', zIndex: 4, top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: 8 },
  topRightActions: { flexDirection: 'row', gap: spacing.sm },
  roundButton: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.92)', shadowColor: colors.ink, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.95 }] },
  content: { gap: spacing.lg, padding: spacing.lg },
  metaTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  conditionPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radii.pill, backgroundColor: colors.successSoft, paddingHorizontal: 10, paddingVertical: 7 },
  heading: { gap: spacing.sm },
  title: { fontSize: 27, lineHeight: 35, letterSpacing: -0.6 },
  price: { fontSize: 26, lineHeight: 34 },
  locationCard: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 12 },
  locationIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.orangeSoft },
  locationCopy: { flex: 1, gap: 2 },
  divider: { height: 1, backgroundColor: colors.border },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: 18, lineHeight: 25 },
  description: { lineHeight: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sellerCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radii.md, backgroundColor: colors.surface, padding: spacing.md },
  sellerCopy: { flex: 1, gap: 4 },
  sellerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  safetyCard: { flexDirection: 'row', gap: 12, borderRadius: radii.md, backgroundColor: colors.successSoft, padding: spacing.md },
  safetyIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.surface },
  safetyCopy: { flex: 1, gap: 4 },
  reportButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  bottomBar: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: 'rgba(255,255,255,0.97)', paddingHorizontal: spacing.md, paddingTop: 12 },
  bottomError: { borderRadius: radii.sm, backgroundColor: colors.dangerSoft, paddingHorizontal: 10, paddingVertical: 7 },
  bottomActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  messageButton: { width: 54, height: 54, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.orange, borderRadius: radii.md, backgroundColor: colors.orangeSoft },
  offerButtonWrap: { flex: 1 },
  unavailableAction: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: radii.md, backgroundColor: colors.background, paddingHorizontal: 12 },
  unavailableIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.border },
  unavailableCopy: { flex: 1, gap: 1 },
  emptyCopy: { textAlign: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, backgroundColor: colors.background, padding: spacing.lg },
});
