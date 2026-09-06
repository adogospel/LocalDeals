import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { canCancelDeal, canConfirmDeal, canReviewDeal } from '@/features/deals/deal-rules';
import {
  cancelDeal,
  confirmDeal,
  type DealView,
  getDeal,
  submitReview,
  subscribeToDeals,
} from '@/features/deals/deal-service';
import { formatPrice } from '@/features/listings/mock-listings';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';

function ConfirmationStep({ confirmed, label }: { confirmed: boolean; label: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.step}>
      <View style={[styles.stepIcon, confirmed ? styles.stepIconDone : null]}>
        <SymbolView name={confirmed ? 'checkmark' : 'circle'} size={14} tintColor={confirmed ? colors.surface : colors.muted} />
      </View>
      <View style={styles.stepCopy}>
        <AppText variant="bodyStrong">{label}</AppText>
        <AppText variant="caption" color={confirmed ? colors.success : colors.muted}>
          {confirmed ? t('deals.confirmed') : t('deals.waiting')}
        </AppText>
      </View>
    </View>
  );
}

export default function DealDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { authMode, user } = useAuth();
  const [deal, setDeal] = useState<DealView | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<'confirm' | 'cancel' | 'review' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewVisible, setReviewVisible] = useState(false);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!id || !user) return;
    if (!silent) setLoading(true);
    try {
      setDeal(await getDeal(id, user.id, authMode === 'development'));
      setError(null);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [authMode, id, user]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => {
    if (authMode !== 'supabase') return;
    return subscribeToDeals(() => { void load(true); });
  }, [authMode, load]);

  const confirm = () => {
    if (!deal || !user) return;
    Alert.alert(t('deals.confirmTitle'), t('deals.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: deal.role === 'buyer' ? t('deals.confirmBuyer') : t('deals.confirmSeller'),
        onPress: () => {
          setAction('confirm');
          void confirmDeal(deal.id, user.id, authMode === 'development')
            .then(() => load(true))
            .catch((nextError) => setError(getErrorMessage(nextError)))
            .finally(() => setAction(null));
        },
      },
    ]);
  };

  const cancel = () => {
    if (!deal || !user) return;
    Alert.alert(t('deals.cancelTitle'), t('deals.cancelBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('deals.cancel'),
        style: 'destructive',
        onPress: () => {
          setAction('cancel');
          void cancelDeal(deal.id, user.id, authMode === 'development')
            .then(() => load(true))
            .catch((nextError) => setError(getErrorMessage(nextError)))
            .finally(() => setAction(null));
        },
      },
    ]);
  };

  const publishReview = async () => {
    if (!deal || !user) return;
    setAction('review');
    setError(null);
    try {
      await submitReview(deal.id, user.id, score, comment, authMode === 'development');
      setReviewVisible(false);
      setComment('');
      await load(true);
      Alert.alert(t('deals.reviewSent'));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setAction(null);
    }
  };

  if (loading) return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.orange} /></SafeAreaView>;
  if (!deal || !user) {
    return (
      <SafeAreaView style={styles.center}>
        <SymbolView name="shippingbox.fill" size={36} tintColor={colors.muted} />
        <AppText variant="title">{t('deals.emptyTitle')}</AppText>
        <Button label={t('listing.goBack')} onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const confirmedByMe = deal.role === 'buyer' ? Boolean(deal.buyer_confirmed_at) : Boolean(deal.seller_confirmed_at);
  const canConfirm = canConfirmDeal(deal, user.id);
  const canCancel = canCancelDeal(deal, user.id);
  const canReview = canReviewDeal(deal, user.id, deal.reviews);
  const statusTone = deal.status === 'completed'
    ? { color: colors.success, background: colors.successSoft }
    : deal.status === 'cancelled'
      ? { color: colors.slate, background: colors.border }
      : { color: colors.warning, background: colors.warningSoft };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('listing.goBack')} onPress={() => router.back()} style={styles.headerButton}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.ink} />
        </Pressable>
        <View style={styles.headerCopy}>
          <AppText variant="bodyStrong">{t('deals.manage')}</AppText>
          <AppText variant="caption" color={colors.muted}>#{deal.id.slice(0, 8).toUpperCase()}</AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('deals.openChat')}
          onPress={() => router.push({ pathname: '/conversation/[id]', params: { id: deal.conversation_id } })}
          style={styles.headerButton}
        >
          <SymbolView name="message.fill" size={18} tintColor={colors.orange} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.productCard}>
          <Image source={{ uri: deal.listing.imageUrl }} style={styles.productImage} contentFit="cover" />
          <View style={styles.productCopy}>
            <View style={[styles.statusPill, { backgroundColor: statusTone.background }]}>
              <AppText variant="caption" color={statusTone.color} style={styles.statusText}>{t(`deals.${deal.status}`)}</AppText>
            </View>
            <AppText variant="bodyStrong" numberOfLines={2}>{deal.listing.title}</AppText>
            <AppText variant="caption" color={colors.slate}>{t('deals.agreedPrice')}</AppText>
            <AppText variant="title" color={colors.orange}>{formatPrice(deal.amount)}</AppText>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/profile/[id]', params: { id: deal.otherUser.id } })}
          style={({ pressed }) => [styles.personCard, pressed ? styles.pressed : null]}
        >
          <Avatar path={deal.otherUser.avatarPath} name={deal.otherUser.name} size={48} />
          <View style={styles.personCopy}>
            <AppText variant="caption" color={colors.muted}>{deal.role === 'buyer' ? t('listing.seller') : t('deals.buyer')}</AppText>
            <AppText variant="bodyStrong">{deal.otherUser.name}</AppText>
          </View>
          <SymbolView name="chevron.right" size={14} tintColor={colors.muted} />
        </Pressable>

        {deal.status === 'pending_handover' ? (
          <View style={styles.handoverCard}>
            <View style={styles.cardHeading}>
              <View style={styles.headingIcon}><SymbolView name="person.2.fill" size={20} tintColor={colors.orange} /></View>
              <View style={styles.headingCopy}>
                <AppText variant="title" style={styles.sectionTitle}>{t('deals.handoverTitle')}</AppText>
                <AppText variant="caption" color={colors.slate}>{t('deals.handoverBody')}</AppText>
              </View>
            </View>
            <View style={styles.steps}>
              <ConfirmationStep confirmed={Boolean(deal.buyer_confirmed_at)} label={t('deals.buyerStep')} />
              <View style={styles.stepLine} />
              <ConfirmationStep confirmed={Boolean(deal.seller_confirmed_at)} label={t('deals.sellerStep')} />
            </View>
            {canConfirm ? (
              <Button
                label={deal.role === 'buyer' ? t('deals.confirmBuyer') : t('deals.confirmSeller')}
                loading={action === 'confirm'}
                onPress={confirm}
                trailingIcon="checkmark"
              />
            ) : confirmedByMe ? (
              <View style={styles.confirmedBanner}>
                <SymbolView name="checkmark.circle.fill" size={20} tintColor={colors.success} />
                <AppText variant="caption" color={colors.success} style={styles.flexText}>{t('deals.alreadyConfirmed')}</AppText>
              </View>
            ) : null}
            {canCancel ? <Button label={t('deals.cancel')} variant="ghost" loading={action === 'cancel'} onPress={cancel} /> : null}
            {!canCancel && !confirmedByMe ? <AppText variant="caption" color={colors.slate}>{t('deals.cannotCancel')}</AppText> : null}
          </View>
        ) : (
          <View style={[styles.resultCard, deal.status === 'completed' ? styles.completedCard : styles.cancelledCard]}>
            <SymbolView name={deal.status === 'completed' ? 'checkmark.circle.fill' : 'xmark.circle.fill'} size={34} tintColor={deal.status === 'completed' ? colors.success : colors.slate} />
            <View style={styles.resultCopy}>
              <AppText variant="title" style={styles.sectionTitle}>{t(`deals.${deal.status}Title`)}</AppText>
              <AppText variant="caption" color={colors.slate}>{t(`deals.${deal.status}Body`)}</AppText>
            </View>
          </View>
        )}

        {canReview ? <Button label={t('deals.leaveReview')} onPress={() => setReviewVisible(true)} trailingIcon="star.fill" /> : null}
        {deal.reviewedByMe ? (
          <View style={styles.reviewedBanner}>
            <SymbolView name="checkmark.seal.fill" size={19} tintColor={colors.success} />
            <AppText variant="caption" color={colors.success}>{t('deals.reviewSent')}</AppText>
          </View>
        ) : null}

        <View style={styles.securityCard}>
          <View style={styles.securityIcon}><SymbolView name="shield.fill" size={22} tintColor={colors.success} /></View>
          <View style={styles.securityCopy}>
            <AppText variant="bodyStrong">{t('deals.securityTitle')}</AppText>
            <AppText variant="caption" color={colors.slate}>{t('deals.securityBody')}</AppText>
          </View>
        </View>
        <Button label={t('deals.openChat')} variant="secondary" onPress={() => router.push({ pathname: '/conversation/[id]', params: { id: deal.conversation_id } })} trailingIcon="message.fill" />
        {error ? <AppText variant="caption" color={colors.danger} accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}
      </ScrollView>

      <Modal visible={reviewVisible} transparent animationType="slide" onRequestClose={() => setReviewVisible(false)}>
        <KeyboardAvoidingView style={styles.modalKeyboard} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalBackdrop}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} style={StyleSheet.absoluteFill} onPress={() => setReviewVisible(false)} />
            <SafeAreaView edges={['bottom']} style={styles.reviewSheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View style={styles.headingCopy}>
                  <AppText variant="title">{t('deals.reviewTitle')}</AppText>
                  <AppText variant="caption" color={colors.slate}>{t('deals.reviewSubtitle')}</AppText>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => setReviewVisible(false)} style={styles.closeButton}>
                  <SymbolView name="xmark" size={15} tintColor={colors.ink} />
                </Pressable>
              </View>
              <View style={styles.stars} accessibilityRole="radiogroup">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: score === value }} onPress={() => setScore(value)} style={styles.starButton}>
                    <SymbolView name="star.fill" size={31} tintColor={value <= score ? '#F4A423' : colors.border} />
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={comment}
                onChangeText={setComment}
                placeholder={t('deals.reviewPlaceholder')}
                placeholderTextColor={colors.muted}
                selectionColor={colors.orange}
                multiline
                maxLength={500}
                style={styles.reviewInput}
              />
              <Button label={t('deals.publishReview')} loading={action === 'review'} onPress={() => void publishReview()} trailingIcon="arrow.right" />
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, backgroundColor: colors.background, padding: spacing.lg },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: colors.background },
  headerCopy: { flex: 1, alignItems: 'center', gap: 1 },
  content: { gap: spacing.md, padding: spacing.lg, paddingBottom: spacing.xxl },
  productCard: { flexDirection: 'row', gap: 14, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, padding: 12 },
  productImage: { width: 100, height: 126, borderRadius: radii.md, backgroundColor: colors.border },
  productCopy: { flex: 1, alignItems: 'flex-start', justifyContent: 'center', gap: 5 },
  statusPill: { borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 8, letterSpacing: 0.25 },
  personCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, padding: 13 },
  personCopy: { flex: 1, gap: 2 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  handoverCard: { gap: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surface, padding: spacing.lg },
  cardHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headingIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.orangeSoft },
  headingCopy: { flex: 1, gap: 4 },
  sectionTitle: { fontSize: 18, lineHeight: 25 },
  steps: { paddingLeft: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepIcon: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.background },
  stepIconDone: { borderColor: colors.success, backgroundColor: colors.success },
  stepCopy: { flex: 1, gap: 1 },
  stepLine: { width: 1, height: 25, marginLeft: 14, backgroundColor: colors.border },
  confirmedBanner: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: radii.md, backgroundColor: colors.successSoft, paddingHorizontal: 13 },
  flexText: { flex: 1 },
  resultCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: radii.lg, padding: spacing.lg },
  completedCard: { backgroundColor: colors.successSoft },
  cancelledCard: { backgroundColor: colors.surface },
  resultCopy: { flex: 1, gap: 4 },
  reviewedBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radii.md, backgroundColor: colors.successSoft, padding: 13 },
  securityCard: { flexDirection: 'row', gap: 12, borderRadius: radii.md, backgroundColor: colors.successSoft, padding: spacing.md },
  securityIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.surface },
  securityCopy: { flex: 1, gap: 4 },
  error: { borderRadius: radii.sm, backgroundColor: colors.dangerSoft, padding: 11 },
  modalKeyboard: { flex: 1 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,32,51,0.42)' },
  reviewSheet: { gap: spacing.lg, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.surface, padding: spacing.lg, paddingTop: 10 },
  sheetHandle: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: colors.border },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.background },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  starButton: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center' },
  reviewInput: { minHeight: 112, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.background, padding: spacing.md, color: colors.ink, fontFamily: typography.regular, fontSize: 15, textAlignVertical: 'top' },
});
