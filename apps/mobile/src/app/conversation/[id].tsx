import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import {
  cancelOffer,
  type ChatMessage,
  type ConversationDetail,
  createOffer,
  getConversation,
  markConversationRead,
  respondToOffer,
  sendMessage,
  subscribeToConversation,
} from '@/features/messaging/messaging-service';
import { formatPrice } from '@/features/listings/mock-listings';
import { isListingPurchasable } from '@/features/listings/listing-status';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';
import type { OfferStatus } from '@/types/database';
import { getOfferActions, parseOfferAmount } from '@/features/messaging/messaging-rules';

const offerPalettes: Record<OfferStatus, { color: string; background: string }> = {
  pending: { color: colors.warning, background: colors.warningSoft },
  accepted: { color: colors.success, background: colors.successSoft },
  declined: { color: colors.danger, background: colors.dangerSoft },
  cancelled: { color: colors.slate, background: colors.background },
};

function formatMessageTime(value: string, language: string): string {
  return new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export default function ConversationScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { id, offer: offerParam } = useLocalSearchParams<{ id: string; offer?: string }>();
  const { authMode, user } = useAuth();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const openedInitialOffer = useRef(false);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [message, setMessage] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadConversation = useCallback(async (silent = false) => {
    if (!user || !id) return;
    if (!silent) setLoading(true);
    try {
      const nextConversation = await getConversation(id, user.id, i18n.language, authMode === 'development');
      setConversation(nextConversation);
      if (nextConversation) await markConversationRead(id, user.id, authMode === 'development');
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [authMode, i18n.language, id, user]);

  useEffect(() => { void loadConversation(); }, [loadConversation]);

  useEffect(() => {
    if (authMode !== 'supabase' || !id) return;
    return subscribeToConversation(id, () => { void loadConversation(true); });
  }, [authMode, id, loadConversation]);

  useEffect(() => {
    if (
      conversation?.role === 'buyer'
      && isListingPurchasable(conversation.listing.status)
      && offerParam === 'true'
      && !openedInitialOffer.current
    ) {
      openedInitialOffer.current = true;
      setOfferAmount(String(Math.round(conversation.listing.price * 0.9)));
      setOfferModalVisible(true);
    }
  }, [conversation, offerParam]);

  const submitMessage = async () => {
    if (!user || !message.trim() || sending) return;
    const nextMessage = message.trim();
    setMessage('');
    setSending(true);
    setError(null);
    try {
      await sendMessage(id, user.id, nextMessage, authMode === 'development');
      await loadConversation(true);
    } catch (nextError) {
      setMessage(nextMessage);
      setError(getErrorMessage(nextError));
    } finally {
      setSending(false);
    }
  };

  const submitOffer = async () => {
    if (!user) return;
    let amount: number;
    try {
      amount = parseOfferAmount(offerAmount);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      return;
    }
    setSending(true);
    setError(null);
    try {
      await createOffer(id, user.id, amount, authMode === 'development');
      setOfferModalVisible(false);
      setOfferAmount('');
      await loadConversation(true);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setSending(false);
    }
  };

  const handleOfferAction = async (offerId: string, action: 'accept' | 'decline' | 'cancel') => {
    setActionId(offerId);
    setError(null);
    try {
      if (!user) return;
      if (action === 'cancel') await cancelOffer(offerId, user.id, authMode === 'development');
      else await respondToOffer(offerId, user.id, action === 'accept', authMode === 'development');
      await loadConversation(true);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setActionId(null);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    if (item.kind === 'system') {
      const systemLabels: Record<string, string> = {
        offer_accepted: t('messages.offerAccepted'),
        offer_declined: t('messages.offerDeclined'),
        offer_cancelled: t('messages.offerCancelled'),
        deal_completed: t('deals.completedTitle'),
        deal_cancelled: t('deals.cancelledTitle'),
      };
      return (
        <View style={styles.systemMessage}>
          <SymbolView name="checkmark.seal.fill" size={13} tintColor={colors.slate} />
          <AppText variant="caption" color={colors.slate}>{systemLabels[item.body ?? ''] ?? item.body}</AppText>
        </View>
      );
    }

    const isMine = item.sender_id === user?.id;
    if (item.kind === 'offer' && item.offer) {
      const offer = item.offer;
      const palette = offerPalettes[offer.status];
      const { canRespond, canCancel } = getOfferActions(conversation?.role ?? 'buyer', user?.id ?? '', offer);
      return (
        <View style={[styles.offerMessageWrap, isMine ? styles.alignRight : styles.alignLeft]}>
          <View style={styles.offerCard}>
            <View style={styles.offerHeader}>
              <View style={styles.offerIcon}><SymbolView name="tag.fill" size={17} tintColor={colors.orange} /></View>
              <View style={styles.offerHeaderCopy}>
                <AppText variant="caption" color={colors.slate}>{isMine ? t('messages.offerSent') : t('messages.offer')}</AppText>
                <AppText variant="title" style={styles.offerPrice}>{formatPrice(offer.amount)}</AppText>
              </View>
              <View style={[styles.statusPill, { backgroundColor: palette.background }]}>
                <AppText variant="caption" color={palette.color} style={styles.statusText}>{t(`messages.${offer.status}`)}</AppText>
              </View>
            </View>
            <View style={styles.offerDivider} />
            <View style={styles.askingPriceRow}>
              <AppText variant="caption" color={colors.muted}>{t('messages.askingPrice')}</AppText>
              <AppText variant="caption" color={colors.slate}>{conversation ? formatPrice(conversation.listing.price) : ''}</AppText>
            </View>
            {canRespond ? (
              <View style={styles.offerActions}>
                <Pressable disabled={actionId === offer.id} onPress={() => void handleOfferAction(offer.id, 'decline')} style={[styles.smallAction, styles.declineAction]}>
                  <AppText variant="caption" color={colors.danger}>{t('messages.decline')}</AppText>
                </Pressable>
                <Pressable disabled={actionId === offer.id} onPress={() => void handleOfferAction(offer.id, 'accept')} style={[styles.smallAction, styles.acceptAction]}>
                  {actionId === offer.id ? <ActivityIndicator size="small" color={colors.surface} /> : <AppText variant="caption" color={colors.surface}>{t('messages.accept')}</AppText>}
                </Pressable>
              </View>
            ) : null}
            {canCancel ? (
              <Pressable disabled={actionId === offer.id} onPress={() => void handleOfferAction(offer.id, 'cancel')} style={styles.cancelOfferButton}>
                {actionId === offer.id ? <ActivityIndicator size="small" color={colors.slate} /> : <AppText variant="caption" color={colors.slate}>{t('messages.cancelOffer')}</AppText>}
              </Pressable>
            ) : null}
          </View>
          <AppText variant="caption" color={colors.muted} style={styles.bubbleTime}>{formatMessageTime(item.created_at, i18n.language)}</AppText>
        </View>
      );
    }

    return (
      <View style={[styles.bubbleWrap, isMine ? styles.alignRight : styles.alignLeft]}>
        <View style={[styles.bubble, isMine ? styles.ownBubble : styles.otherBubble]}>
          <AppText color={isMine ? colors.surface : colors.ink}>{item.body}</AppText>
        </View>
        <AppText variant="caption" color={colors.muted} style={styles.bubbleTime}>{formatMessageTime(item.created_at, i18n.language)}</AppText>
      </View>
    );
  };

  if (loading) return <SafeAreaView style={styles.centerState}><ActivityIndicator color={colors.orange} /></SafeAreaView>;
  if (!conversation) {
    return (
      <SafeAreaView style={styles.centerState}>
        <SymbolView name="exclamationmark.bubble.fill" size={36} tintColor={colors.muted} />
        <AppText variant="title">{t('messages.unavailable')}</AppText>
        <Button label={t('listing.goBack')} onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const canMakeOffer = conversation.role === 'buyer' && isListingPurchasable(conversation.listing.status) && !conversation.deal;
  const listingStatusLabel = conversation.listing.status === 'sold'
    ? t('myListings.status.sold')
    : conversation.listing.status === 'reserved'
      ? t('myListings.status.reserved')
      : t('messages.offer');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('listing.goBack')} onPress={() => router.back()} style={styles.headerButton}>
            <SymbolView name="chevron.left" size={18} tintColor={colors.ink} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/profile/[id]', params: { id: conversation.otherUser.id } })}>
            <Avatar path={conversation.otherUser.avatarPath} name={conversation.otherUser.name} size={38} />
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/profile/[id]', params: { id: conversation.otherUser.id } })} style={styles.headerCopy}>
            <AppText variant="bodyStrong" numberOfLines={1}>{conversation.otherUser.name}</AppText>
            <View style={styles.onlineRow}><View style={styles.onlineDot} /><AppText variant="caption" color={colors.success}>LocalDeals</AppText></View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('report.title')}
            onPress={() => router.push({ pathname: '/report', params: { targetType: 'user', targetId: conversation.otherUser.id, label: conversation.otherUser.name } })}
            style={styles.headerButton}
          >
            <SymbolView name="shield.fill" size={18} tintColor={colors.success} />
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/listing/[id]', params: { id: conversation.listing.id } })}
          style={({ pressed }) => [styles.listingBanner, pressed ? styles.pressed : null]}
        >
          <Image source={{ uri: conversation.listing.imageUrl }} style={styles.bannerImage} contentFit="cover" />
          <View style={styles.bannerCopy}>
            <AppText variant="caption" color={conversation.listing.status === 'sold' ? colors.danger : colors.muted}>{listingStatusLabel}</AppText>
            <AppText variant="bodyStrong" numberOfLines={1}>{conversation.listing.title}</AppText>
          </View>
          <AppText variant="bodyStrong" color={colors.orange}>{formatPrice(conversation.listing.price)}</AppText>
          <SymbolView name="chevron.right" size={13} tintColor={colors.muted} />
        </Pressable>

        <View style={styles.safetyStrip}>
          <SymbolView name="lock.shield.fill" size={13} tintColor={colors.success} />
          <AppText variant="caption" color={colors.slate} style={styles.safetyText}>{t('messages.safety')}</AppText>
        </View>

        {conversation.deal ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/deal/[id]', params: { id: conversation.deal!.id } })}
            style={({ pressed }) => [styles.dealBanner, pressed ? styles.pressed : null]}
          >
            <View style={styles.dealIcon}><SymbolView name="shippingbox.fill" size={18} tintColor={colors.orange} /></View>
            <View style={styles.dealCopy}>
              <AppText variant="caption" color={colors.orange}>{t(`deals.${conversation.deal.status}`)}</AppText>
              <AppText variant="bodyStrong">{t('deals.manage')}</AppText>
            </View>
            <SymbolView name="chevron.right" size={14} tintColor={colors.muted} />
          </Pressable>
        ) : null}

        <FlatList
          ref={listRef}
          data={conversation.messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListHeaderComponent={<AppText variant="caption" color={colors.muted} style={styles.dateLabel}>{t('messages.newConversation')}</AppText>}
        />

        {error ? <AppText variant="caption" color={colors.danger} accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}

        <SafeAreaView edges={['bottom']} style={styles.composerSafeArea}>
          <View style={styles.composer}>
            {canMakeOffer ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('messages.makeOffer')}
                onPress={() => {
                  setOfferAmount(String(Math.round(conversation.listing.price * 0.9)));
                  setOfferModalVisible(true);
                }}
                style={styles.offerComposerButton}
              >
                <SymbolView name="tag.fill" size={18} tintColor={colors.orange} />
              </Pressable>
            ) : null}
            <View style={styles.inputWrap}>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder={t('messages.composerPlaceholder')}
                placeholderTextColor={colors.muted}
                selectionColor={colors.orange}
                multiline
                maxLength={2000}
                style={styles.input}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('messages.send')}
                disabled={!message.trim() || sending}
                onPress={() => void submitMessage()}
                style={[styles.sendButton, (!message.trim() || sending) ? styles.sendDisabled : null]}
              >
                {sending ? <ActivityIndicator size="small" color={colors.surface} /> : <SymbolView name="arrow.up" size={18} tintColor={colors.surface} />}
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <Modal visible={offerModalVisible} transparent animationType="slide" onRequestClose={() => setOfferModalVisible(false)}>
        <KeyboardAvoidingView
          style={styles.modalKeyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.modalBackdrop}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setOfferModalVisible(false)} accessibilityLabel={t('common.cancel')} />
            <SafeAreaView edges={['bottom']} style={styles.offerSheet}>
              <ScrollView
                contentContainerStyle={styles.offerSheetContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <AppText variant="title">{t('messages.offerTitle')}</AppText>
                <AppText variant="caption" color={colors.slate} style={styles.sheetSubtitle}>{t('messages.offerSubtitle')}</AppText>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => setOfferModalVisible(false)} style={styles.closeButton}>
                <SymbolView name="xmark" size={15} tintColor={colors.ink} />
              </Pressable>
            </View>
            <View style={styles.priceReference}>
              <AppText variant="caption" color={colors.slate}>{t('messages.askingPrice')}</AppText>
              <AppText variant="bodyStrong">{formatPrice(conversation.listing.price)}</AppText>
            </View>
            <View style={styles.amountField}>
              <AppText variant="caption" color={colors.slate}>{t('messages.amount')}</AppText>
              <View style={styles.amountRow}>
                <TextInput
                  value={offerAmount}
                  onChangeText={(value) => setOfferAmount(value.replace(/\D/g, ''))}
                  placeholder={t('messages.amountPlaceholder')}
                  placeholderTextColor={colors.muted}
                  selectionColor={colors.orange}
                  keyboardType="number-pad"
                  maxLength={10}
                  style={styles.amountInput}
                  autoFocus
                />
                <AppText variant="bodyStrong" color={colors.slate}>FCFA</AppText>
              </View>
            </View>
            <View style={styles.suggestions}>
              {[0.8, 0.9, 0.95].map((ratio) => {
                const amount = Math.round(conversation.listing.price * ratio);
                return <Pressable key={ratio} onPress={() => setOfferAmount(String(amount))} style={styles.suggestion}><AppText variant="caption">{formatPrice(amount)}</AppText></Pressable>;
              })}
            </View>
            <Button label={t('messages.sendOffer')} loading={sending} disabled={Number(offerAmount) < 100} onPress={() => void submitOffer()} trailingIcon="arrow.right" />
              </ScrollView>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboard: { flex: 1 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, backgroundColor: colors.background, padding: spacing.lg },
  header: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  headerButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.background },
  headerCopy: { flex: 1, gap: 1 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success },
  listingBanner: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: 9 },
  bannerImage: { width: 50, height: 50, borderRadius: 13, backgroundColor: colors.border },
  bannerCopy: { flex: 1, gap: 2 },
  pressed: { opacity: 0.72 },
  safetyStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.successSoft, paddingHorizontal: spacing.md, paddingVertical: 7 },
  safetyText: { flexShrink: 1, fontSize: 9, textAlign: 'center' },
  dealBanner: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: spacing.md, paddingVertical: 8 },
  dealIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.orangeSoft },
  dealCopy: { flex: 1, gap: 1 },
  messages: { flexGrow: 1, gap: 12, padding: spacing.md, paddingBottom: spacing.lg },
  dateLabel: { alignSelf: 'center', marginBottom: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 5 },
  bubbleWrap: { maxWidth: '82%', gap: 3 },
  alignRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  alignLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  ownBubble: { borderBottomRightRadius: 6, backgroundColor: colors.ink },
  otherBubble: { borderBottomLeftRadius: 6, backgroundColor: colors.surface, shadowColor: colors.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 9, elevation: 1 },
  bubbleTime: { paddingHorizontal: 4, fontSize: 9 },
  systemMessage: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radii.pill, backgroundColor: colors.border, paddingHorizontal: 10, paddingVertical: 6 },
  offerMessageWrap: { width: '88%', gap: 3 },
  offerCard: { width: '100%', gap: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, padding: spacing.md, shadowColor: colors.ink, shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 2 },
  offerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  offerIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.orangeSoft },
  offerHeaderCopy: { flex: 1, gap: 1 },
  offerPrice: { fontSize: 19, lineHeight: 25 },
  statusPill: { borderRadius: radii.pill, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { fontSize: 8 },
  offerDivider: { height: 1, backgroundColor: colors.border },
  askingPriceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  offerActions: { flexDirection: 'row', gap: 8 },
  smallAction: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  declineAction: { backgroundColor: colors.dangerSoft },
  acceptAction: { backgroundColor: colors.success },
  cancelOfferButton: { minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.background },
  error: { marginHorizontal: spacing.md, marginBottom: 4, borderRadius: radii.sm, backgroundColor: colors.dangerSoft, padding: 9 },
  composerSafeArea: { borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 9, paddingHorizontal: spacing.md, paddingTop: 10 },
  offerComposerButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.orangeSoft },
  inputWrap: { flex: 1, minHeight: 46, maxHeight: 116, flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 18, backgroundColor: colors.background, paddingLeft: 14, paddingRight: 5, paddingVertical: 4 },
  input: { flex: 1, minHeight: 36, maxHeight: 100, color: colors.ink, fontFamily: typography.regular, fontSize: 14, paddingTop: 8, paddingBottom: 6 },
  sendButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.orange },
  sendDisabled: { backgroundColor: colors.muted },
  modalKeyboard: { flex: 1 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,32,51,0.42)' },
  offerSheet: { maxHeight: '92%', overflow: 'hidden', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.surface },
  offerSheetContent: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: spacing.md },
  sheetHandle: { width: 42, height: 5, alignSelf: 'center', borderRadius: 3, backgroundColor: colors.border },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  sheetSubtitle: { maxWidth: 300, marginTop: 4, lineHeight: 18 },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.background },
  priceReference: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: radii.md, backgroundColor: colors.orangeSoft, padding: 13 },
  amountField: { gap: 7 },
  amountRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.orange, borderRadius: radii.md, paddingHorizontal: spacing.md },
  amountInput: { flex: 1, minHeight: 58, color: colors.ink, fontFamily: typography.bold, fontSize: 24 },
  suggestions: { flexDirection: 'row', gap: 7 },
  suggestion: { flex: 1, minHeight: 37, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.background },
});
