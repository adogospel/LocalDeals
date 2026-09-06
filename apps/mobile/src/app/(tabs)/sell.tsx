import { useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ListingPhotoPicker } from '@/components/listings/listing-photo-picker';
import { LocationFields, type LocationValues } from '@/components/profile/location-fields';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import {
  createDevelopmentListing,
  createPublishedListing,
  fallbackCategories,
  getCategories,
  getConditionLabel,
  pickListingPhotos,
  takeListingPhoto,
} from '@/features/listings/listing-service';
import { listingConditions, listingSchema, parsePriceInput, type ListingDraft } from '@/features/listings/listing-schema';
import { cacheKeys, getCachedValue, removeCachedValue, setCachedValue } from '@/lib/cache';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';
import type { Category } from '@/types/database';

function emptyDraft(location: LocationValues): ListingDraft {
  return { title: '', description: '', priceText: '', categoryId: 0, condition: 'good', ...location, photos: [] };
}

function SectionHeading({ step, title, subtitle }: { step: string; title: string; subtitle: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.stepNumber}><AppText variant="caption" color={colors.surface}>{step}</AppText></View>
      <View style={styles.sectionCopy}>
        <AppText variant="title" style={styles.sectionTitle}>{title}</AppText>
        <AppText variant="caption" color={colors.slate}>{subtitle}</AppText>
      </View>
    </View>
  );
}

export default function SellScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { authMode, profile, user } = useAuth();
  const draftKey = user ? cacheKeys.listingDraft(user.id) : '';
  const profileLocation: LocationValues = {
    cityId: profile?.city_id ?? null,
    cityName: profile?.city ?? '',
    customCity: profile?.city_id ? '' : profile?.custom_city ?? profile?.city ?? '',
    neighborhoodId: profile?.neighborhood_id ?? null,
    neighborhoodName: profile?.neighborhood ?? '',
    customNeighborhood: profile?.neighborhood_id ? '' : profile?.custom_neighborhood ?? profile?.neighborhood ?? '',
  };
  const [draft, setDraft] = useState<ListingDraft>(() => (
    draftKey ? getCachedValue<ListingDraft>(draftKey) ?? emptyDraft(profileLocation) : emptyDraft(profileLocation)
  ));
  const [categories, setCategories] = useState<Category[]>(authMode === 'development' ? fallbackCategories : []);
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getCategories(authMode === 'development')
      .then((items) => { if (active) setCategories(items); })
      .catch((nextError) => { if (active) setError(getErrorMessage(nextError)); });
    return () => { active = false; };
  }, [authMode]);

  useEffect(() => {
    if (!draftKey) return;
    const timeout = setTimeout(() => setCachedValue(draftKey, draft), 450);
    return () => clearTimeout(timeout);
  }, [draft, draftKey]);

  const choosePhotos = async () => {
    setPhotoLoading(true);
    setError(null);
    try {
      const photos = await pickListingPhotos(draft.photos.length);
      setDraft((current) => ({ ...current, photos: [...current.photos, ...photos] }));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setPhotoLoading(false);
    }
  };

  const takePhoto = async () => {
    setPhotoLoading(true);
    setError(null);
    try {
      const photo = await takeListingPhoto(draft.photos.length);
      if (photo) setDraft((current) => ({ ...current, photos: [...current.photos, photo] }));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setPhotoLoading(false);
    }
  };

  const publish = async () => {
    if (!user || !profile) return;
    const result = listingSchema.safeParse({ ...draft, price: parsePriceInput(draft.priceText) });
    if (!result.success) {
      setError(result.error.issues[0].path[0] === 'photos' ? t('sell.photoRequired') : t('sell.formIncomplete'));
      return;
    }
    const category = categories.find((item) => item.id === result.data.categoryId);
    if (!category) {
      setError(t('sell.categoryRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const listingId = authMode === 'development'
        ? createDevelopmentListing(user.id, profile.display_name ?? 'LocalDealer', result.data, category, i18n.language)
        : await createPublishedListing(user.id, result.data);
      if (draftKey) removeCachedValue(draftKey);
      setDraft(emptyDraft(profileLocation));
      Alert.alert(t('sell.successTitle'), t('sell.successBody'));
      router.push({ pathname: '/listing/[id]', params: { id: listingId } });
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.eyebrow}>
          <View style={styles.eyebrowDot} />
          <AppText variant="caption" color={colors.orange} style={styles.eyebrowText}>{t('sell.eyebrow')}</AppText>
        </View>
        <AppText variant="display" style={styles.title}>{t('sell.title')}</AppText>
        <AppText color={colors.slate} style={styles.subtitle}>{t('sell.subtitle')}</AppText>
        <View style={styles.draftPill}>
          <SymbolView name="checkmark.circle.fill" size={14} tintColor={colors.success} />
          <AppText variant="caption" color={colors.success} style={styles.draftText}>{t('sell.draftSaved')}</AppText>
        </View>
      </View>

      {authMode === 'development' ? (
        <View style={styles.developmentNotice}>
          <SymbolView name="hammer.fill" size={17} tintColor={colors.orange} />
          <AppText variant="caption" color={colors.orange} style={styles.noticeCopy}>{t('sell.developmentNotice')}</AppText>
        </View>
      ) : null}

      <View style={styles.card}>
        <SectionHeading step="1" title={t('sell.photosTitle')} subtitle={t('sell.photosSubtitle')} />
        <ListingPhotoPicker photos={draft.photos} disabled={photoLoading || loading} onPick={() => void choosePhotos()} onCamera={() => void takePhoto()} onRemove={(index) => setDraft((current) => ({ ...current, photos: current.photos.filter((_photo, photoIndex) => photoIndex !== index) }))} />
      </View>

      <View style={styles.card}>
        <SectionHeading step="2" title={t('sell.detailsTitle')} subtitle={t('sell.detailsSubtitle')} />
        <TextField label={t('sell.itemTitle')} placeholder={t('sell.itemTitlePlaceholder')} value={draft.title} maxLength={100} onChangeText={(title) => { setDraft((current) => ({ ...current, title })); setError(null); }} />
        <TextField label={t('sell.price')} placeholder="35 000" value={draft.priceText} keyboardType="number-pad" rightAccessory={<AppText variant="bodyStrong" color={colors.slate}>FCFA</AppText>} onChangeText={(priceText) => { setDraft((current) => ({ ...current, priceText })); setError(null); }} />

        <View style={styles.fieldGroup}>
          <AppText variant="bodyStrong">{t('sell.category')}</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {categories.map((category) => {
              const selected = draft.categoryId === category.id;
              const label = i18n.language.startsWith('en') ? category.label_en : category.label_fr;
              return (
                <Pressable key={category.id} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setDraft((current) => ({ ...current, categoryId: category.id }))} style={[styles.categoryChip, selected && styles.categoryChipSelected]}>
                  <SymbolView name={category.symbol as SymbolViewProps['name']} size={16} tintColor={selected ? colors.surface : colors.orange} />
                  <AppText variant="caption" color={selected ? colors.surface : colors.ink}>{label}</AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.fieldGroup}>
          <AppText variant="bodyStrong">{t('sell.condition')}</AppText>
          <View style={styles.conditionGrid}>
            {listingConditions.map((condition) => {
              const selected = draft.condition === condition;
              return (
                <Pressable key={condition} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setDraft((current) => ({ ...current, condition }))} style={[styles.conditionChip, selected && styles.conditionChipSelected]}>
                  <View style={[styles.radioDot, selected && styles.radioDotSelected]} />
                  <AppText variant={selected ? 'bodyStrong' : 'body'}>{getConditionLabel(condition, i18n.language)}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextField label={t('sell.description')} placeholder={t('sell.descriptionPlaceholder')} value={draft.description} multiline textAlignVertical="top" maxLength={2000} style={styles.descriptionInput} onChangeText={(description) => { setDraft((current) => ({ ...current, description })); setError(null); }} />
        <AppText variant="caption" color={colors.muted} style={styles.counter}>{draft.description.length}/2000</AppText>
      </View>

      <View style={styles.card}>
        <SectionHeading step="3" title={t('sell.locationTitle')} subtitle={t('sell.locationSubtitle')} />
        <LocationFields value={draft} onChange={(location) => setDraft((current) => ({ ...current, ...location }))} />
      </View>

      <View style={styles.safetyCard}>
        <View style={styles.safetyIcon}><SymbolView name="shield.checkered" size={20} tintColor={colors.success} /></View>
        <View style={styles.safetyCopy}>
          <AppText variant="bodyStrong">{t('sell.securityTitle')}</AppText>
          <AppText variant="caption" color={colors.slate}>{t('sell.securityBody')}</AppText>
        </View>
      </View>
      {error ? <AppText color={colors.danger} accessibilityRole="alert">{error}</AppText> : null}
      <Button label={t('sell.publish')} trailingIcon="arrow.up.circle.fill" loading={loading} disabled={photoLoading} onPress={() => void publish()} />
      <AppText variant="caption" color={colors.muted} style={styles.legal}>{t('sell.legal')}</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: 110 },
  header: { gap: spacing.sm },
  eyebrow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: radii.pill, backgroundColor: colors.orangeSoft, paddingHorizontal: 10, paddingVertical: 6 },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.orange },
  eyebrowText: { fontSize: 9, letterSpacing: 0.7 },
  title: { fontSize: 31, lineHeight: 39, letterSpacing: -0.8 },
  subtitle: { lineHeight: 22 },
  draftPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radii.pill, backgroundColor: colors.successSoft, paddingHorizontal: 10, paddingVertical: 6 },
  draftText: { fontSize: 9 },
  developmentNotice: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#FFD2BA', borderRadius: radii.md, backgroundColor: colors.orangeSoft, padding: spacing.md },
  noticeCopy: { flex: 1, lineHeight: 18 },
  card: { gap: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, padding: spacing.lg, shadowColor: colors.ink, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.04, shadowRadius: 24, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNumber: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.orange },
  sectionCopy: { flex: 1, gap: 2 },
  sectionTitle: { fontSize: 17, lineHeight: 23 },
  fieldGroup: { gap: spacing.sm },
  chips: { gap: spacing.sm, paddingRight: spacing.lg },
  categoryChip: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, backgroundColor: colors.background, paddingHorizontal: 13 },
  categoryChipSelected: { borderColor: colors.orange, backgroundColor: colors.orange },
  conditionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  conditionChip: { width: '48.5%', minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: 12 },
  conditionChipSelected: { borderColor: '#FFBE99', backgroundColor: colors.orangeSoft },
  radioDot: { width: 14, height: 14, borderWidth: 1.5, borderColor: colors.muted, borderRadius: 7 },
  radioDotSelected: { borderWidth: 4, borderColor: colors.orange, backgroundColor: colors.surface },
  descriptionInput: { minHeight: 128, paddingTop: spacing.md },
  counter: { marginTop: -spacing.md, textAlign: 'right' },
  safetyCard: { flexDirection: 'row', gap: 12, borderRadius: radii.md, backgroundColor: colors.successSoft, padding: spacing.md },
  safetyIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.surface },
  safetyCopy: { flex: 1, gap: 4 },
  legal: { textAlign: 'center', lineHeight: 17, paddingHorizontal: spacing.md },
});
