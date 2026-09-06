import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { getActiveDealForListing } from '@/features/deals/deal-service';
import { deleteListing, getMyListings, updateListingStatus } from '@/features/listings/listing-service';
import { formatPrice, type Listing } from '@/features/listings/mock-listings';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';

export default function MyListingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { authMode, user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    if (!user) return;
    let active = true;
    setLoading(true);
    void getMyListings(user.id, i18n.language, authMode === 'development')
      .then((items) => { if (active) setListings(items); })
      .catch((nextError) => { if (active) setError(getErrorMessage(nextError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authMode, i18n.language, user]));

  const changeStatus = async (listing: Listing) => {
    setActionId(listing.id);
    try {
      if (listing.status === 'reserved') {
        if (!user) return;
        const deal = await getActiveDealForListing(listing.id, user.id, authMode === 'development');
        if (!deal) throw new Error(t('deals.emptyBody'));
        router.push({ pathname: '/deal/[id]', params: { id: deal.id } });
        return;
      }
      const status = listing.status === 'sold' ? 'published' : 'sold';
      await updateListingStatus(listing.id, status, authMode === 'development');
      setListings((current) => current.map((item) => item.id === listing.id ? { ...item, status } : item));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setActionId(null);
    }
  };

  const confirmDelete = (listing: Listing) => {
    Alert.alert(t('myListings.deleteTitle'), t('myListings.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('myListings.delete'),
        style: 'destructive',
        onPress: () => {
          setActionId(listing.id);
          void deleteListing(listing.id, authMode === 'development')
            .then(() => setListings((current) => current.filter((item) => item.id !== listing.id)))
            .catch((nextError) => setError(getErrorMessage(nextError)))
            .finally(() => setActionId(null));
        },
      },
    ]);
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('listing.goBack')} onPress={() => router.back()} style={styles.backButton}>
          <SymbolView name="chevron.left" size={17} tintColor={colors.ink} />
        </Pressable>
        <View style={styles.heading}><AppText variant="title">{t('myListings.title')}</AppText><AppText variant="caption" color={colors.slate}>{t('myListings.subtitle')}</AppText></View>
      </View>

      {loading ? <View style={styles.state}><ActivityIndicator color={colors.orange} /></View> : null}
      {!loading && listings.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}><SymbolView name="shippingbox.fill" size={29} tintColor={colors.orange} /></View>
          <AppText variant="title">{t('myListings.emptyTitle')}</AppText>
          <AppText color={colors.slate} style={styles.emptyText}>{t('myListings.emptyBody')}</AppText>
          <Button label={t('myListings.create')} onPress={() => router.push('/(tabs)/sell')} />
        </View>
      ) : null}

      {listings.map((listing) => (
        <View key={listing.id} style={styles.card}>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })} style={styles.listingRow}>
            <Image source={{ uri: listing.imageUrl }} style={styles.image} contentFit="cover" />
            <View style={styles.copy}>
              <View style={[styles.statusPill, listing.status === 'sold' && styles.soldPill]}>
                <AppText variant="caption" color={listing.status === 'sold' ? colors.slate : colors.success} style={styles.statusText}>{t(`myListings.status.${listing.status ?? 'published'}`)}</AppText>
              </View>
              <AppText variant="bodyStrong" numberOfLines={2}>{listing.title}</AppText>
              <AppText variant="bodyStrong" color={colors.orange}>{formatPrice(listing.price)}</AppText>
            </View>
            <SymbolView name="chevron.right" size={14} tintColor={colors.muted} />
          </Pressable>
          <View style={styles.actions}>
            <Pressable disabled={actionId === listing.id} onPress={() => void changeStatus(listing)} style={styles.actionButton}>
              <SymbolView name={listing.status === 'reserved' ? 'shippingbox.fill' : listing.status === 'sold' ? 'arrow.uturn.backward.circle.fill' : 'checkmark.circle.fill'} size={16} tintColor={colors.orange} />
              <AppText variant="caption" color={colors.orange}>{listing.status === 'reserved' ? t('deals.manage') : listing.status === 'sold' ? t('myListings.republish') : t('myListings.markSold')}</AppText>
            </Pressable>
            <Pressable disabled={actionId === listing.id} onPress={() => confirmDelete(listing)} style={[styles.actionButton, styles.deleteButton]}>
              {actionId === listing.id ? <ActivityIndicator size="small" color={colors.danger} /> : <SymbolView name="trash.fill" size={15} tintColor={colors.danger} />}
              <AppText variant="caption" color={colors.danger}>{t('myListings.delete')}</AppText>
            </Pressable>
          </View>
        </View>
      ))}
      {error ? <AppText color={colors.danger} accessibilityRole="alert">{error}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xxl },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 21, backgroundColor: colors.surface },
  heading: { flex: 1, gap: 2 },
  state: { minHeight: 240, alignItems: 'center', justifyContent: 'center' },
  emptyState: { minHeight: 360, alignItems: 'center', justifyContent: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, padding: spacing.xl },
  emptyIcon: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.orangeSoft },
  emptyText: { textAlign: 'center', lineHeight: 22 },
  card: { overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface },
  listingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  image: { width: 88, height: 100, borderRadius: radii.md, backgroundColor: colors.border },
  copy: { flex: 1, alignItems: 'flex-start', gap: 5 },
  statusPill: { borderRadius: radii.pill, backgroundColor: colors.successSoft, paddingHorizontal: 8, paddingVertical: 4 },
  soldPill: { backgroundColor: colors.background },
  statusText: { fontSize: 8, letterSpacing: 0.4 },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border },
  actionButton: { flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  deleteButton: { borderLeftWidth: 1, borderLeftColor: colors.border },
});
