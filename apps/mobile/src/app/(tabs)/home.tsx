import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ListingCard } from '@/components/listings/listing-card';
import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { fallbackCategories, getCategories, getListings, toggleFavorite } from '@/features/listings/listing-service';
import type { Listing } from '@/features/listings/mock-listings';
import { getNotifications } from '@/features/notifications/notification-service';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';
import type { Category } from '@/types/database';

const categoryPalettes = [
  { color: '#3157A4', background: '#EDF3FF' },
  { color: '#9A4E74', background: '#FCEFF5' },
  { color: '#7C5A36', background: '#F8F0E8' },
  { color: '#247068', background: '#E9F7F4' },
  { color: '#7456A3', background: '#F2EDFB' },
];

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { authMode, profile, user } = useAuth();
  const firstName = profile?.display_name?.split(' ')[0] ?? 'LocalDealer';
  const city = profile?.city ?? 'Douala';
  const [categories, setCategories] = useState<Category[]>(authMode === 'development' ? fallbackCategories : []);
  const [feed, setFeed] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteLoading, setFavoriteLoading] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadHome = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextCategories, nextFeed, nextNotifications] = await Promise.all([
        getCategories(authMode === 'development').catch(() => fallbackCategories),
        getListings({ city }, { development: authMode === 'development', language: i18n.language, limit: 20 }),
        user ? getNotifications(user.id, authMode === 'development').catch(() => []) : Promise.resolve([]),
      ]);
      setCategories(nextCategories);
      setFeed(nextFeed);
      setUnreadCount(nextNotifications.filter((notification) => !notification.read_at).length);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [authMode, city, i18n.language, user]);

  useFocusEffect(useCallback(() => { void loadHome(); }, [loadHome]));

  const openSearch = (categoryId?: number) => {
    router.push({
      pathname: '/(tabs)/search',
      params: { categoryId: categoryId ? String(categoryId) : '' },
    });
  };

  const changeFavorite = async (listing: Listing) => {
    if (!user) return;
    setFavoriteLoading(listing.id);
    try {
      const nextValue = await toggleFavorite(user.id, listing.id, Boolean(listing.isFavorite), authMode === 'development');
      setFeed((current) => current.map((item) => item.id === listing.id ? { ...item, isFavorite: nextValue } : item));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setFavoriteLoading(null);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.identity}>
          <Avatar path={profile?.avatar_path} name={profile?.display_name} size={44} />
          <View style={styles.greeting}>
            <AppText variant="caption" color={colors.slate}>{t('home.greeting', { name: firstName })}</AppText>
            <View style={styles.locationRow}>
              <SymbolView name="location.fill" size={13} tintColor={colors.orange} />
              <AppText variant="bodyStrong">{city}, Cameroun</AppText>
            </View>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('notifications.title')}
          onPress={() => router.push('/notifications')}
          style={({ pressed }) => [styles.notificationButton, pressed ? styles.pressed : null]}
        >
          <SymbolView name="bell.fill" size={19} tintColor={colors.ink} />
          {unreadCount ? (
            <View style={styles.notificationBadge}>
              <AppText variant="caption" color={colors.surface} style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</AppText>
            </View>
          ) : null}
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="search"
        accessibilityLabel={t('marketplace.searchPlaceholder')}
        onPress={() => openSearch()}
        style={({ pressed }) => [styles.searchBar, pressed ? styles.pressed : null]}
      >
        <SymbolView name="magnifyingglass" size={19} tintColor={colors.slate} />
        <AppText color={colors.muted} style={styles.searchText}>{t('marketplace.searchPlaceholder')}</AppText>
        <View style={styles.filterButton}>
          <SymbolView name="slider.horizontal.3" size={17} tintColor={colors.orange} />
        </View>
      </Pressable>

      <View style={styles.promoCard}>
        <View style={styles.promoGlow} />
        <View style={styles.promoCopy}>
          <View style={styles.promoBadge}>
            <AppText variant="caption" style={styles.promoBadgeText}>{t('marketplace.sellBadge')}</AppText>
          </View>
          <AppText variant="title" color={colors.surface} style={styles.promoTitle}>{t('marketplace.sellTitle')}</AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.8)" style={styles.promoSubtitle}>{t('marketplace.sellSubtitle')}</AppText>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/(tabs)/sell')}
            style={({ pressed }) => [styles.promoButton, pressed ? styles.promoButtonPressed : null]}
          >
            <AppText variant="bodyStrong" color={colors.orange}>{t('marketplace.startSelling')}</AppText>
            <SymbolView name="arrow.right" size={15} tintColor={colors.orange} />
          </Pressable>
        </View>
        <View style={styles.promoIcon}>
          <SymbolView name="shippingbox.fill" size={46} tintColor={colors.surface} />
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <AppText variant="title" style={styles.sectionTitle}>{t('marketplace.categories')}</AppText>
        <Pressable accessibilityRole="button" onPress={() => openSearch()}>
          <AppText variant="caption" color={colors.orange}>{t('marketplace.seeAll')}</AppText>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        {categories.slice(0, 6).map((category, index) => {
          const palette = categoryPalettes[index % categoryPalettes.length];
          const label = i18n.language.startsWith('en') ? category.label_en : category.label_fr;
          return (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => openSearch(category.id)}
            style={({ pressed }) => [styles.category, pressed ? styles.pressed : null]}
          >
            <View style={[styles.categoryIcon, { backgroundColor: palette.background }]}> 
              <SymbolView name={category.symbol as SymbolViewProps['name']} size={22} tintColor={palette.color} />
            </View>
            <AppText variant="caption" style={styles.categoryLabel}>{label}</AppText>
          </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.sectionHeading}>
        <View style={styles.sectionCopy}>
          <AppText variant="title" style={styles.sectionTitle}>{t('marketplace.forYou')}</AppText>
          <AppText variant="caption" color={colors.muted}>{t('marketplace.nearYou', { city })}</AppText>
        </View>
        <View style={styles.freshPill}>
          <View style={styles.freshDot} />
          <AppText variant="caption" color={colors.success} style={styles.freshText}>{t('marketplace.fresh')}</AppText>
        </View>
      </View>

      <View style={styles.grid}>
        {loading ? <View style={styles.loading}><ActivityIndicator color={colors.orange} /></View> : null}
        {!loading && error ? (
          <View style={styles.feedError}>
            <AppText color={colors.danger} style={styles.feedMessage}>{error}</AppText>
            <Button label={t('common.retry')} variant="secondary" onPress={() => void loadHome()} />
          </View>
        ) : null}
        {!loading && !error && feed.length === 0 ? <AppText color={colors.slate} style={styles.feedMessage}>{t('marketplace.empty')}</AppText> : null}
        {feed.map((listing) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            favoriteLoading={favoriteLoading === listing.id}
            onToggleFavorite={() => void changeFavorite(listing)}
            onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
          />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  greeting: { gap: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  notificationButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 21, backgroundColor: colors.surface },
  notificationBadge: { position: 'absolute', top: -3, right: -3, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background, borderRadius: 10, backgroundColor: colors.orange, paddingHorizontal: 4 },
  notificationBadgeText: { fontSize: 8, lineHeight: 11 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  searchBar: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, paddingLeft: spacing.md, paddingRight: 7, shadowColor: colors.ink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.035, shadowRadius: 18 },
  searchText: { flex: 1, fontSize: 14 },
  filterButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.orangeSoft },
  promoCard: { minHeight: 185, overflow: 'hidden', flexDirection: 'row', borderRadius: radii.lg, backgroundColor: colors.orange, padding: spacing.lg },
  promoGlow: { position: 'absolute', top: -70, right: -38, width: 190, height: 190, borderRadius: 95, backgroundColor: 'rgba(255,255,255,0.12)' },
  promoCopy: { zIndex: 1, flex: 1, alignItems: 'flex-start', gap: 9 },
  promoBadge: { borderRadius: radii.pill, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 9, paddingVertical: 5 },
  promoBadgeText: { color: colors.surface, fontSize: 9, letterSpacing: 0.7 },
  promoTitle: { maxWidth: 220, fontSize: 21, lineHeight: 28 },
  promoSubtitle: { maxWidth: 230, fontSize: 10, lineHeight: 15 },
  promoButton: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: radii.pill, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 9 },
  promoButtonPressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  promoIcon: { width: 72, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-9deg' }] },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionCopy: { gap: 2 },
  sectionTitle: { fontSize: 19, lineHeight: 26 },
  categories: { gap: 12, paddingRight: spacing.lg },
  category: { width: 70, alignItems: 'center', gap: 7 },
  categoryIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  categoryLabel: { fontSize: 9, lineHeight: 13, textAlign: 'center' },
  freshPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radii.pill, backgroundColor: colors.successSoft, paddingHorizontal: 9, paddingVertical: 6 },
  freshDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.success },
  freshText: { fontSize: 9 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  loading: { width: '100%', minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  feedMessage: { width: '100%', textAlign: 'center', paddingVertical: spacing.xl },
  feedError: { width: '100%', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
});
