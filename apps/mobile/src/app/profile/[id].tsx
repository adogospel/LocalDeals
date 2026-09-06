import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/features/listings/mock-listings';
import { getPublicProfile, type PublicProfile } from '@/features/trust/trust-service';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';

function formatMemberDate(value: string, language: string): string {
  return new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(new Date(value));
}

function formatReviewDate(value: string, language: string): string {
  return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export default function PublicProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authMode, profile: currentProfile, user } = useAuth();
  const [data, setData] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      setData(await getPublicProfile(id, i18n.language, authMode === 'development', currentProfile));
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [authMode, currentProfile, i18n.language, id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.orange} /></SafeAreaView>;
  if (!data) {
    return (
      <SafeAreaView style={styles.center}>
        <SymbolView name="person.crop.circle.fill" size={42} tintColor={colors.muted} />
        <AppText variant="title" style={styles.centerText}>{t('publicProfile.unavailable')}</AppText>
        {error ? <AppText color={colors.danger} style={styles.centerText}>{error}</AppText> : null}
        <Button label={t('listing.goBack')} onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const name = data.profile.display_name ?? 'Membre LocalDeals';
  const location = [data.profile.neighborhood, data.profile.city].filter(Boolean).join(', ');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('listing.goBack')} onPress={() => router.back()} style={styles.headerButton}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.ink} />
        </Pressable>
        <AppText variant="bodyStrong" style={styles.headerTitle}>{name}</AppText>
        {user?.id !== data.profile.id ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('publicProfile.report')}
            onPress={() => router.push({ pathname: '/report', params: { targetType: 'user', targetId: data.profile.id, label: name } })}
            style={styles.headerButton}
          >
            <SymbolView name="exclamationmark.triangle.fill" size={17} tintColor={colors.slate} />
          </Pressable>
        ) : <View style={styles.headerButtonPlaceholder} />}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.avatarRing}><Avatar path={data.profile.avatar_path} name={name} size={86} /></View>
          <AppText variant="title">{name}</AppText>
          {location ? (
            <View style={styles.locationRow}>
              <SymbolView name="location.fill" size={13} tintColor={colors.orange} />
              <AppText variant="caption" color={colors.slate}>{location}</AppText>
            </View>
          ) : null}
          <View style={styles.verifiedPill}>
            <SymbolView name="checkmark.seal.fill" size={14} tintColor={colors.success} />
            <AppText variant="caption" color={colors.success}>{t('publicProfile.memberSince', { date: formatMemberDate(data.profile.created_at, i18n.language) })}</AppText>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.stat}>
            <View style={styles.ratingValue}><SymbolView name="star.fill" size={16} tintColor="#F4A423" /><AppText variant="title">{data.reviewCount ? data.averageRating.toFixed(1) : '—'}</AppText></View>
            <AppText variant="caption" color={colors.muted}>{t('publicProfile.rating')}</AppText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><AppText variant="title">{data.reviewCount}</AppText><AppText variant="caption" color={colors.muted}>{t('publicProfile.reviews')}</AppText></View>
          <View style={styles.statDivider} />
          <View style={styles.stat}><AppText variant="title">{data.completedSales}</AppText><AppText variant="caption" color={colors.muted}>{t('publicProfile.sales')}</AppText></View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <AppText variant="title" style={styles.sectionTitle}>{t('publicProfile.activeListings')}</AppText>
            <View style={styles.countPill}><AppText variant="caption" color={colors.orange}>{data.listings.length}</AppText></View>
          </View>
          {data.listings.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listingsRow}>
              {data.listings.map((listing) => (
                <Pressable
                  key={listing.id}
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/listing/[id]', params: { id: listing.id } })}
                  style={({ pressed }) => [styles.listingCard, pressed ? styles.pressed : null]}
                >
                  <Image source={{ uri: listing.imageUrl }} style={styles.listingImage} contentFit="cover" />
                  <View style={styles.listingCopy}>
                    <AppText variant="bodyStrong" numberOfLines={2} style={styles.listingTitle}>{listing.title}</AppText>
                    <AppText variant="bodyStrong" color={colors.orange}>{formatPrice(listing.price)}</AppText>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : <AppText color={colors.slate}>{t('publicProfile.noListings')}</AppText>}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeading}>
            <AppText variant="title" style={styles.sectionTitle}>{t('publicProfile.verifiedReviews')}</AppText>
            <SymbolView name="checkmark.seal.fill" size={19} tintColor={colors.success} />
          </View>
          {data.reviews.length ? data.reviews.map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <Avatar path={review.author.avatarPath} name={review.author.name} size={42} />
              <View style={styles.reviewCopy}>
                <View style={styles.reviewHeader}>
                  <AppText variant="bodyStrong" numberOfLines={1} style={styles.reviewName}>{review.author.name}</AppText>
                  <AppText variant="caption" color={colors.muted}>{formatReviewDate(review.created_at, i18n.language)}</AppText>
                </View>
                <View style={styles.reviewMeta}>
                  <View style={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((value) => <SymbolView key={value} name="star.fill" size={12} tintColor={value <= review.score ? '#F4A423' : colors.border} />)}
                  </View>
                  <AppText variant="caption" color={colors.success}>{t('publicProfile.verifiedDeal')}</AppText>
                </View>
                {review.comment ? <AppText color={colors.slate} style={styles.reviewBody}>{review.comment}</AppText> : null}
              </View>
            </View>
          )) : <AppText color={colors.slate}>{t('publicProfile.noReviews')}</AppText>}
        </View>

        {user?.id !== data.profile.id ? (
          <Button
            label={t('publicProfile.report')}
            variant="ghost"
            onPress={() => router.push({ pathname: '/report', params: { targetType: 'user', targetId: data.profile.id, label: name } })}
          />
        ) : null}
        {error ? <AppText variant="caption" color={colors.danger} accessibilityRole="alert">{error}</AppText> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, backgroundColor: colors.background, padding: spacing.lg },
  centerText: { textAlign: 'center' },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.background },
  headerButtonPlaceholder: { width: 40, height: 40 },
  headerTitle: { flex: 1, textAlign: 'center' },
  content: { gap: spacing.xl, padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: { alignItems: 'center', gap: 8, paddingTop: spacing.sm },
  avatarRing: { borderWidth: 4, borderColor: colors.surface, borderRadius: 50, shadowColor: colors.ink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 16 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  verifiedPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radii.pill, backgroundColor: colors.successSoft, paddingHorizontal: 10, paddingVertical: 6 },
  statsCard: { minHeight: 92, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, paddingVertical: spacing.md },
  stat: { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 42, backgroundColor: colors.border },
  ratingValue: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  section: { gap: spacing.md },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 19, lineHeight: 26 },
  countPill: { minWidth: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.orangeSoft, paddingHorizontal: 7 },
  listingsRow: { gap: 12, paddingRight: spacing.lg },
  listingCard: { width: 174, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  listingImage: { width: '100%', height: 150, backgroundColor: colors.border },
  listingCopy: { gap: 6, padding: 11 },
  listingTitle: { minHeight: 44 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  reviewCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 14 },
  reviewCopy: { flex: 1, gap: 6 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reviewName: { flex: 1 },
  reviewMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  reviewStars: { flexDirection: 'row', gap: 2 },
  reviewBody: { lineHeight: 21 },
});
