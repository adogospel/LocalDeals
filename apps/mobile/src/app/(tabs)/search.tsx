import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useDeferredValue, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { ListingCard } from '@/components/listings/listing-card';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import {
  fallbackCategories,
  getCategories,
  getConditionLabel,
  getListings,
  toggleFavorite,
  type ListingSort,
} from '@/features/listings/listing-service';
import { listingConditions, parsePriceInput } from '@/features/listings/listing-schema';
import type { Listing } from '@/features/listings/mock-listings';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import type { Category, ListingCondition } from '@/types/database';

export default function SearchScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const { authMode, user } = useAuth();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [categoryId, setCategoryId] = useState<number | null>(() => {
    const parsed = Number(params.categoryId);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  });
  const [condition, setCondition] = useState<ListingCondition | null>(null);
  const [minPriceText, setMinPriceText] = useState('');
  const [maxPriceText, setMaxPriceText] = useState('');
  const [sort, setSort] = useState<ListingSort>('newest');
  const [draftCondition, setDraftCondition] = useState<ListingCondition | null>(null);
  const [draftMinPriceText, setDraftMinPriceText] = useState('');
  const [draftMaxPriceText, setDraftMaxPriceText] = useState('');
  const [draftSort, setDraftSort] = useState<ListingSort>('newest');
  const [categories, setCategories] = useState<Category[]>(authMode === 'development' ? fallbackCategories : []);
  const [results, setResults] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (params.categoryId === undefined) return;
    const parsed = Number(params.categoryId);
    setCategoryId(Number.isInteger(parsed) && parsed > 0 ? parsed : null);
  }, [params.categoryId]);

  useEffect(() => {
    let active = true;
    void getCategories(authMode === 'development')
      .then((items) => { if (active) setCategories(items); })
      .catch(() => { if (active) setCategories(fallbackCategories); });
    return () => { active = false; };
  }, [authMode]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void getListings({
      query: deferredQuery,
      categoryId,
      condition,
      minPrice: minPriceText ? parsePriceInput(minPriceText) : null,
      maxPrice: maxPriceText ? parsePriceInput(maxPriceText) : null,
      sort,
    }, { development: authMode === 'development', language: i18n.language })
      .then((items) => { if (active) setResults(items); })
      .catch((nextError) => { if (active) setError(getErrorMessage(nextError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authMode, categoryId, condition, deferredQuery, i18n.language, maxPriceText, minPriceText, refreshKey, sort]);

  const openFilters = () => {
    setDraftCondition(condition);
    setDraftMinPriceText(minPriceText);
    setDraftMaxPriceText(maxPriceText);
    setDraftSort(sort);
    setFilterError(null);
    setFiltersOpen(true);
  };

  const closeFilters = () => {
    setFilterError(null);
    setFiltersOpen(false);
  };

  const applyFilters = () => {
    const minimum = draftMinPriceText ? parsePriceInput(draftMinPriceText) : null;
    const maximum = draftMaxPriceText ? parsePriceInput(draftMaxPriceText) : null;
    if (minimum != null && maximum != null && minimum > maximum) {
      setFilterError(t('search.invalidPriceRange'));
      return;
    }
    setCondition(draftCondition);
    setMinPriceText(draftMinPriceText);
    setMaxPriceText(draftMaxPriceText);
    setSort(draftSort);
    closeFilters();
  };

  const resetFilters = () => {
    setQuery('');
    setCategoryId(null);
    setCondition(null);
    setMinPriceText('');
    setMaxPriceText('');
    setSort('newest');
    setDraftCondition(null);
    setDraftMinPriceText('');
    setDraftMaxPriceText('');
    setDraftSort('newest');
    setFilterError(null);
  };

  const resetDraftFilters = () => {
    setDraftCondition(null);
    setDraftMinPriceText('');
    setDraftMaxPriceText('');
    setDraftSort('newest');
    setFilterError(null);
  };

  const changeFavorite = async (listing: Listing) => {
    if (!user) return;
    setFavoriteLoading(listing.id);
    try {
      const nextValue = await toggleFavorite(user.id, listing.id, Boolean(listing.isFavorite), authMode === 'development');
      setResults((current) => current.map((item) => item.id === listing.id ? { ...item, isFavorite: nextValue } : item));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setFavoriteLoading(null);
    }
  };

  const activeFilterCount = Number(categoryId != null) + Number(condition != null) + Number(Boolean(minPriceText)) + Number(Boolean(maxPriceText)) + Number(sort !== 'newest');

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <AppText variant="display" style={styles.title}>{t('search.title')}</AppText>
        <AppText color={colors.slate}>{t('search.subtitle')}</AppText>
      </View>

      <View style={styles.searchBar}>
        <SymbolView name="magnifyingglass" size={19} tintColor={colors.slate} />
        <TextInput
          accessibilityRole="search"
          value={query}
          onChangeText={setQuery}
          placeholder={t('marketplace.searchPlaceholder')}
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          autoCorrect={false}
          style={styles.searchInput}
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('search.clear')} hitSlop={8} onPress={() => setQuery('')}>
            <SymbolView name="xmark.circle.fill" size={18} tintColor={colors.muted} />
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel={t('search.filters')} onPress={openFilters} style={styles.filterButton}>
          <SymbolView name="slider.horizontal.3" size={17} tintColor={colors.orange} />
          {activeFilterCount ? <View style={styles.filterCount}><AppText variant="caption" color={colors.surface} style={styles.filterCountText}>{activeFilterCount}</AppText></View> : null}
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        <CategoryChip label={t('search.all')} selected={!categoryId} onPress={() => setCategoryId(null)} />
        {categories.map((category) => (
          <CategoryChip
            key={category.id}
            label={i18n.language.startsWith('en') ? category.label_en : category.label_fr}
            symbol={category.symbol as SymbolViewProps['name']}
            selected={categoryId === category.id}
            onPress={() => setCategoryId(category.id)}
          />
        ))}
      </ScrollView>

      <View style={styles.resultHeader}>
        <View style={styles.resultCopy}>
          <AppText variant="title" style={styles.resultTitle}>{t('search.results')}</AppText>
          <AppText variant="caption" color={colors.muted}>{t('search.resultCount', { count: results.length })}</AppText>
        </View>
        <View style={styles.sortPill}>
          <SymbolView name="arrow.up.arrow.down" size={12} tintColor={colors.slate} />
          <AppText variant="caption" color={colors.slate}>{t(`search.sort.${sort}`)}</AppText>
        </View>
      </View>

      {loading ? (
        <View style={styles.state}><ActivityIndicator color={colors.orange} /><AppText color={colors.slate}>{t('common.loading')}</AppText></View>
      ) : error ? (
        <View style={styles.state}>
          <SymbolView name="wifi.exclamationmark" size={30} tintColor={colors.danger} />
          <AppText color={colors.danger} style={styles.stateText}>{error}</AppText>
          <Button label={t('common.retry')} variant="secondary" onPress={() => setRefreshKey((value) => value + 1)} />
        </View>
      ) : results.length ? (
        <View style={styles.grid}>
          {results.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              favoriteLoading={favoriteLoading === listing.id}
              onToggleFavorite={() => void changeFavorite(listing)}
              onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
            />
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}><SymbolView name="magnifyingglass" size={29} tintColor={colors.orange} /></View>
          <AppText variant="title">{t('search.emptyTitle')}</AppText>
          <AppText color={colors.slate} style={styles.stateText}>{t('search.emptyBody')}</AppText>
          <Button label={t('search.reset')} variant="secondary" onPress={resetFilters} />
        </View>
      )}

      <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={closeFilters}>
        <KeyboardAvoidingView style={styles.keyboardAvoiding} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.backdrop} onPress={closeFilters}>
          <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View><AppText variant="title">{t('search.filters')}</AppText><AppText variant="caption" color={colors.slate}>{t('search.filtersSubtitle')}</AppText></View>
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={closeFilters} style={styles.closeButton}><SymbolView name="xmark" size={15} tintColor={colors.ink} /></Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.filterSection}>
              <AppText variant="bodyStrong">{t('sell.condition')}</AppText>
              <View style={styles.conditionRow}>
                {listingConditions.map((item) => <CategoryChip key={item} label={getConditionLabel(item, i18n.language)} selected={draftCondition === item} onPress={() => setDraftCondition(draftCondition === item ? null : item)} />)}
              </View>
            </View>
            <View style={styles.priceRow}>
              <View style={styles.priceField}><TextField label={t('search.minPrice')} value={draftMinPriceText} keyboardType="number-pad" placeholder="0" onChangeText={setDraftMinPriceText} /></View>
              <View style={styles.priceField}><TextField label={t('search.maxPrice')} value={draftMaxPriceText} keyboardType="number-pad" placeholder="500 000" onChangeText={setDraftMaxPriceText} /></View>
            </View>
            <View style={styles.filterSection}>
              <AppText variant="bodyStrong">{t('search.sortLabel')}</AppText>
              {(['newest', 'price_asc', 'price_desc'] as ListingSort[]).map((item) => (
                <Pressable key={item} accessibilityRole="radio" accessibilityState={{ checked: draftSort === item }} onPress={() => setDraftSort(item)} style={styles.sortOption}>
                  <AppText variant={draftSort === item ? 'bodyStrong' : 'body'}>{t(`search.sort.${item}`)}</AppText>
                  {draftSort === item ? <SymbolView name="checkmark.circle.fill" size={20} tintColor={colors.orange} /> : null}
                </Pressable>
              ))}
            </View>
            {filterError ? <AppText accessibilityRole="alert" variant="caption" color={colors.danger} style={styles.filterError}>{filterError}</AppText> : null}
            <View style={styles.sheetActions}>
              <Pressable accessibilityRole="button" onPress={resetDraftFilters} style={styles.resetButton}>
                <AppText variant="bodyStrong" color={colors.slate}>{t('search.reset')}</AppText>
              </Pressable>
              <View style={styles.applyButton}><Button label={t('search.showResults')} onPress={applyFilters} /></View>
            </View>
            </ScrollView>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

function CategoryChip({ label, symbol, selected, onPress }: { label: string; symbol?: SymbolViewProps['name']; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.categoryChip, selected ? styles.categoryChipSelected : null]}>
      {symbol ? <SymbolView name={symbol} size={14} tintColor={selected ? colors.surface : colors.orange} /> : null}
      <AppText variant="caption" color={selected ? colors.surface : colors.ink}>{label}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: 100 },
  header: { gap: spacing.xs },
  title: { fontSize: 31, lineHeight: 39, letterSpacing: -0.8 },
  searchBar: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, paddingLeft: spacing.md, paddingRight: 7, shadowColor: colors.ink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 18 },
  searchInput: { flex: 1, minHeight: 52, color: colors.ink, fontFamily: typography.regular, fontSize: 15 },
  filterButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.orangeSoft },
  filterCount: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface, borderRadius: 9, backgroundColor: colors.orange },
  filterCountText: { fontSize: 8 },
  categories: { gap: spacing.sm, paddingRight: spacing.lg },
  categoryChip: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, backgroundColor: colors.surface, paddingHorizontal: 13 },
  categoryChipSelected: { borderColor: colors.orange, backgroundColor: colors.orange },
  resultHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resultCopy: { gap: 2 },
  resultTitle: { fontSize: 19, lineHeight: 26 },
  sortPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radii.pill, backgroundColor: colors.background, paddingHorizontal: 9, paddingVertical: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  state: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  stateText: { textAlign: 'center', lineHeight: 21 },
  emptyState: { minHeight: 300, alignItems: 'center', justifyContent: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, padding: spacing.xl },
  emptyIcon: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.orangeSoft },
  keyboardAvoiding: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,32,51,0.38)' },
  sheet: { maxHeight: '88%', gap: spacing.lg, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.surface, padding: spacing.lg, paddingBottom: spacing.md },
  sheetContent: { gap: spacing.lg, paddingBottom: spacing.xl },
  sheetHandle: { width: 44, height: 4, alignSelf: 'center', borderRadius: radii.pill, backgroundColor: colors.border },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.background },
  filterSection: { gap: spacing.sm },
  conditionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  priceRow: { flexDirection: 'row', gap: spacing.sm },
  priceField: { flex: 1 },
  sortOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  filterError: { borderRadius: radii.sm, backgroundColor: colors.dangerSoft, paddingHorizontal: 11, paddingVertical: 9 },
  sheetActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  resetButton: { minHeight: 52, justifyContent: 'center', paddingHorizontal: spacing.sm },
  applyButton: { flex: 1 },
});
