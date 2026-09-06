import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ListingCard } from '@/components/listings/listing-card';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { getFavoriteListings, toggleFavorite } from '@/features/listings/listing-service';
import type { Listing } from '@/features/listings/mock-listings';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';

export default function FavoritesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { authMode, user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteLoading, setFavoriteLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setListings(await getFavoriteListings({ development: authMode === 'development', language: i18n.language }));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [authMode, i18n.language, user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const removeFavorite = async (listing: Listing) => {
    if (!user || favoriteLoading) return;
    setFavoriteLoading(listing.id);
    setError(null);
    try {
      await toggleFavorite(user.id, listing.id, true, authMode === 'development');
      setListings((current) => current.filter((item) => item.id !== listing.id));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setFavoriteLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('listing.goBack')} onPress={() => router.back()} style={styles.backButton}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.ink} />
        </Pressable>
        <View style={styles.headerCopy}>
          <AppText variant="title">{t('favorites.title')}</AppText>
          <AppText variant="caption" color={colors.slate}>{t('favorites.subtitle')}</AppText>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.orange} /></View>
      ) : error && listings.length === 0 ? (
        <View style={styles.center}>
          <SymbolView name="wifi.exclamationmark" size={32} tintColor={colors.danger} />
          <AppText accessibilityRole="alert" color={colors.danger} style={styles.centerText}>{error}</AppText>
          <Button label={t('common.retry')} variant="secondary" onPress={() => void load()} />
        </View>
      ) : listings.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}><SymbolView name="heart.fill" size={29} tintColor={colors.orange} /></View>
          <AppText variant="title">{t('favorites.emptyTitle')}</AppText>
          <AppText color={colors.slate} style={styles.centerText}>{t('favorites.emptyBody')}</AppText>
          <Button label={t('favorites.explore')} onPress={() => router.replace('/(tabs)/search')} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.countRow}>
            <AppText variant="caption" color={colors.slate}>{t('favorites.count', { count: listings.length })}</AppText>
          </View>
          <View style={styles.grid}>
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                favoriteLoading={favoriteLoading === listing.id}
                onToggleFavorite={() => void removeFavorite(listing)}
                onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
              />
            ))}
          </View>
          {error ? <AppText accessibilityRole="alert" variant="caption" color={colors.danger} style={styles.inlineError}>{error}</AppText> : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.lg },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 21, backgroundColor: colors.background },
  headerCopy: { flex: 1, gap: 2 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  countRow: { marginBottom: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  centerText: { maxWidth: 300, textAlign: 'center', lineHeight: 21 },
  emptyIcon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.orangeSoft },
  inlineError: { borderRadius: radii.sm, backgroundColor: colors.dangerSoft, padding: spacing.sm, textAlign: 'center' },
});
