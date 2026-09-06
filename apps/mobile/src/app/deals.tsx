import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { type DealView, getDeals, subscribeToDeals } from '@/features/deals/deal-service';
import { formatPrice } from '@/features/listings/mock-listings';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';
import type { DealStatus } from '@/types/database';

type DealFilter = 'all' | 'buyer' | 'seller';

const statusPalettes: Record<DealStatus, { color: string; background: string }> = {
  pending_handover: { color: colors.warning, background: colors.warningSoft },
  completed: { color: colors.success, background: colors.successSoft },
  cancelled: { color: colors.slate, background: colors.border },
};

export default function DealsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { authMode, user } = useAuth();
  const [deals, setDeals] = useState<DealView[]>([]);
  const [filter, setFilter] = useState<DealFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      setDeals(await getDeals(user.id, authMode === 'development'));
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authMode, user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => {
    if (authMode !== 'supabase') return;
    return subscribeToDeals(() => { void load(true); });
  }, [authMode, load]);

  const filtered = useMemo(() => deals.filter((deal) => filter === 'all' || deal.role === filter), [deals, filter]);
  const filters: { id: DealFilter; label: string }[] = [
    { id: 'all', label: t('deals.all') }, { id: 'buyer', label: t('deals.buying') }, { id: 'seller', label: t('deals.selling') },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('listing.goBack')} onPress={() => router.back()} style={styles.backButton}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.ink} />
        </Pressable>
        <View style={styles.headerCopy}><AppText variant="title">{t('deals.title')}</AppText><AppText variant="caption" color={colors.slate}>{t('deals.subtitle')}</AppText></View>
      </View>
      <View style={styles.filters}>
        {filters.map((item) => (
          <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: filter === item.id }} onPress={() => setFilter(item.id)} style={[styles.filter, filter === item.id ? styles.filterActive : null]}>
            <AppText variant="caption" color={filter === item.id ? colors.surface : colors.slate}>{item.label}</AppText>
          </Pressable>
        ))}
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator color={colors.orange} /></View> : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, filtered.length === 0 ? styles.emptyList : null]}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); void load(true); }}
          renderItem={({ item }) => {
            const palette = statusPalettes[item.status];
            return (
              <Pressable onPress={() => router.push({ pathname: '/deal/[id]', params: { id: item.id } })} style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}>
                <Image source={{ uri: item.listing.imageUrl }} style={styles.image} contentFit="cover" />
                <View style={styles.cardCopy}>
                  <View style={[styles.status, { backgroundColor: palette.background }]}><AppText variant="caption" color={palette.color} style={styles.statusText}>{t(`deals.${item.status}`)}</AppText></View>
                  <AppText variant="bodyStrong" numberOfLines={2}>{item.listing.title}</AppText>
                  <View style={styles.metaRow}><AppText variant="caption" color={colors.slate}>{item.role === 'buyer' ? t('deals.buying') : t('deals.selling')} · {item.otherUser.name}</AppText></View>
                  <AppText variant="bodyStrong" color={colors.orange}>{formatPrice(item.amount)}</AppText>
                </View>
                <SymbolView name="chevron.right" size={14} tintColor={colors.muted} />
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={(
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><SymbolView name={error ? 'wifi.exclamationmark' : 'shippingbox.fill'} size={29} tintColor={error ? colors.danger : colors.orange} /></View>
              <AppText variant="title">{error ? t('search.emptyTitle') : t('deals.emptyTitle')}</AppText>
              <AppText accessibilityRole={error ? 'alert' : undefined} color={error ? colors.danger : colors.slate} style={styles.emptyText}>{error ?? t('deals.emptyBody')}</AppText>
              <Button label={error ? t('common.retry') : t('deals.explore')} variant={error ? 'secondary' : 'primary'} onPress={() => error ? void load() : router.push('/(tabs)/search')} />
            </View>
          )}
        />
      )}
      {error && deals.length > 0 ? <AppText accessibilityRole="alert" variant="caption" color={colors.danger} style={styles.error}>{error}</AppText> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.lg, paddingBottom: spacing.md },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 21, backgroundColor: colors.surface },
  headerCopy: { flex: 1, gap: 2 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  filter: { minHeight: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, backgroundColor: colors.surface, paddingHorizontal: 15 },
  filterActive: { borderColor: colors.ink, backgroundColor: colors.ink },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  emptyList: { flexGrow: 1 },
  card: { minHeight: 132, flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, padding: 12 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  image: { width: 88, height: 106, borderRadius: radii.md, backgroundColor: colors.border },
  cardCopy: { flex: 1, alignItems: 'flex-start', gap: 5 },
  status: { borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyIcon: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: 23, backgroundColor: colors.orangeSoft },
  emptyText: { maxWidth: 310, textAlign: 'center' },
  error: { margin: spacing.md, borderRadius: radii.sm, backgroundColor: colors.dangerSoft, padding: 10 },
});
