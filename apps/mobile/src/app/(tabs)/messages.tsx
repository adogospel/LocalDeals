import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  type ConversationInboxAction,
  type ConversationPreview,
  getConversations,
  subscribeToInbox,
  updateConversationInboxState,
} from '@/features/messaging/messaging-service';
import { formatPrice } from '@/features/listings/mock-listings';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing, typography } from '@/theme/tokens';

type InboxFilter = 'all' | 'buyer' | 'seller' | 'unread' | 'archived';

function formatConversationTime(value: string, language: string): string {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(date);
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return language.startsWith('en') ? 'Yesterday' : 'Hier';
  return new Intl.DateTimeFormat(language, { day: '2-digit', month: 'short' }).format(date);
}

type ConversationActionRowProps = {
  label: string;
  description: string;
  symbol: SymbolViewProps['name'];
  loading: boolean;
  disabled: boolean;
  destructive?: boolean;
  separated?: boolean;
  onPress: () => void;
};

function ConversationActionRow({
  label,
  description,
  symbol,
  loading,
  disabled,
  destructive = false,
  separated = false,
  onPress,
}: ConversationActionRowProps) {
  const tintColor = destructive ? colors.danger : colors.orange;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ busy: loading, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        separated ? styles.actionRowSeparated : null,
        pressed ? styles.actionPressed : null,
      ]}
    >
      <View style={[styles.actionIcon, destructive ? styles.deleteIcon : null]}>
        <SymbolView name={symbol} size={18} tintColor={tintColor} />
      </View>
      <View style={styles.actionCopy}>
        <AppText variant="bodyStrong" color={destructive ? colors.danger : colors.ink}>{label}</AppText>
        <AppText variant="caption" color={colors.slate} style={styles.actionDescription}>{description}</AppText>
      </View>
      {loading ? <ActivityIndicator size="small" color={tintColor} /> : null}
    </Pressable>
  );
}

export default function MessagesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { authMode, user } = useAuth();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const hasLoadedConversations = useRef(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationPreview | null>(null);
  const [actionLoading, setActionLoading] = useState<ConversationInboxAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadConversations = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      setConversations(await getConversations(user.id, i18n.language, authMode === 'development'));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      hasLoadedConversations.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  }, [authMode, i18n.language, user]);

  useFocusEffect(useCallback(() => {
    void loadConversations(hasLoadedConversations.current);
  }, [loadConversations]));

  useEffect(() => {
    if (authMode !== 'supabase') return;
    return subscribeToInbox(() => { void loadConversations(true); });
  }, [authMode, loadConversations]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(i18n.language);
    return conversations.filter((conversation) => {
      if (filter === 'archived') {
        if (!conversation.isArchived) return false;
      } else if (conversation.isArchived) return false;
      if (filter === 'buyer' && conversation.role !== 'buyer') return false;
      if (filter === 'seller' && conversation.role !== 'seller') return false;
      if (filter === 'unread' && conversation.unreadCount === 0) return false;
      if (!normalized) return true;
      return `${conversation.otherUser.name} ${conversation.listing.title} ${conversation.lastMessage}`
        .toLocaleLowerCase(i18n.language)
        .includes(normalized);
    });
  }, [conversations, filter, i18n.language, query]);

  const filters: { id: InboxFilter; label: string }[] = [
    { id: 'all', label: t('messages.all') },
    { id: 'buyer', label: t('messages.buying') },
    { id: 'seller', label: t('messages.selling') },
    { id: 'unread', label: t('messages.unread') },
    { id: 'archived', label: t('messages.archived') },
  ];

  const applyInboxAction = async (action: ConversationInboxAction) => {
    if (!selectedConversation || !user || actionLoading) return;
    setActionLoading(action);
    setActionError(null);
    try {
      await updateConversationInboxState(
        selectedConversation.id,
        user.id,
        action,
        authMode === 'development',
      );
      setSelectedConversation(null);
      await loadConversations(true);
    } catch (nextError) {
      setActionError(getErrorMessage(nextError));
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDelete = () => {
    Alert.alert(t('messages.deleteTitle'), t('messages.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('messages.delete'), style: 'destructive', onPress: () => void applyInboxAction('delete') },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText variant="display" style={styles.title}>{t('messages.title')}</AppText>
          <AppText variant="caption" color={colors.slate}>{t('messages.subtitle')}</AppText>
        </View>
        <View style={styles.headerIcon}><SymbolView name="message.fill" size={20} tintColor={colors.orange} /></View>
      </View>

      <View style={styles.searchBar}>
        <SymbolView name="magnifyingglass" size={18} tintColor={colors.slate} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('messages.search')}
          placeholderTextColor={colors.muted}
          selectionColor={colors.orange}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel={t('search.clear')} onPress={() => setQuery('')} hitSlop={8}>
            <SymbolView name="xmark.circle.fill" size={18} tintColor={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.filterScroller}
        contentContainerStyle={styles.filters}
      >
        {filters.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === item.id }}
            onPress={() => setFilter(item.id)}
            style={[styles.filter, filter === item.id ? styles.filterActive : null]}
          >
            <AppText variant="caption" color={filter === item.id ? colors.surface : colors.slate}>{item.label}</AppText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.longPressHint}>
        <SymbolView name="ellipsis.circle" size={14} tintColor={colors.muted} />
        <AppText variant="caption" color={colors.muted}>{t('messages.longPressHint')}</AppText>
      </View>

      {loading && conversations.length === 0 ? (
        <View style={styles.centerState}><ActivityIndicator color={colors.orange} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.list, filtered.length === 0 ? styles.emptyList : null]}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); void loadConversations(true); }}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.otherUser.name}, ${item.listing.title}`}
              accessibilityHint={t('messages.longPressHint')}
              onPress={() => router.push({ pathname: '/conversation/[id]', params: { id: item.id } })}
              onLongPress={() => {
                setActionError(null);
                setSelectedConversation(item);
              }}
              delayLongPress={450}
              style={({ pressed }) => [styles.card, item.isPinned ? styles.cardPinned : null, pressed ? styles.cardPressed : null]}
            >
              <View style={styles.visuals}>
                <Image source={{ uri: item.listing.imageUrl }} style={styles.listingImage} contentFit="cover" />
                <View style={styles.avatarWrap}><Avatar path={item.otherUser.avatarPath} name={item.otherUser.name} size={34} /></View>
              </View>
              <View style={styles.cardCopy}>
                <View style={styles.nameRow}>
                  <AppText variant="bodyStrong" numberOfLines={1} style={styles.name}>{item.otherUser.name}</AppText>
                  {item.isPinned ? <SymbolView name="pin.fill" size={12} tintColor={colors.orange} /> : null}
                  <AppText variant="caption" color={item.unreadCount ? colors.orange : colors.muted} style={styles.time}>{formatConversationTime(item.lastMessageAt, i18n.language)}</AppText>
                </View>
                <View style={styles.listingRow}>
                  <AppText variant="caption" color={colors.slate} numberOfLines={1} style={styles.listingTitle}>{item.listing.title}</AppText>
                  <AppText variant="caption" color={colors.ink}>{formatPrice(item.listing.price)}</AppText>
                </View>
                <View style={styles.messageRow}>
                  <AppText variant={item.unreadCount ? 'bodyStrong' : 'body'} color={item.unreadCount ? colors.ink : colors.slate} numberOfLines={1} style={styles.lastMessage}>{item.lastMessage}</AppText>
                  {item.unreadCount ? (
                    <View style={styles.unreadBadge}><AppText variant="caption" color={colors.surface} style={styles.unreadText}>{Math.min(item.unreadCount, 9)}</AppText></View>
                  ) : <SymbolView name="chevron.right" size={12} tintColor={colors.muted} />}
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={(
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><SymbolView name={error ? 'wifi.exclamationmark' : 'bubble.left.and.bubble.right.fill'} size={28} tintColor={error ? colors.danger : colors.orange} /></View>
              <AppText variant="title" style={styles.emptyTitle}>{error ? t('search.emptyTitle') : query || filter !== 'all' ? t('messages.noMatch') : t('messages.emptyTitle')}</AppText>
              {error ? <AppText accessibilityRole="alert" color={colors.danger} style={styles.emptyBody}>{error}</AppText> : null}
              {!error && !query && filter === 'all' ? <AppText color={colors.slate} style={styles.emptyBody}>{t('messages.emptyBody')}</AppText> : null}
              {error ? <Button label={t('common.retry')} variant="secondary" onPress={() => void loadConversations()} /> : null}
              {!error && !query && filter === 'all' ? <Button label={t('messages.explore')} onPress={() => router.push('/(tabs)/search')} /> : null}
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
      {error && conversations.length > 0 ? <AppText variant="caption" color={colors.danger} accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}

      <Modal
        visible={selectedConversation !== null}
        transparent
        animationType="slide"
        onRequestClose={() => { if (!actionLoading) setSelectedConversation(null); }}
      >
        <View style={styles.actionBackdrop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('common.cancel')}
            disabled={Boolean(actionLoading)}
            onPress={() => setSelectedConversation(null)}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={['bottom']} style={styles.actionSheet}>
            <View style={styles.sheetHandle} />
            {selectedConversation ? (
              <>
                <View style={styles.actionHeader}>
                  <View style={styles.actionVisuals}>
                    <Image source={{ uri: selectedConversation.listing.imageUrl }} style={styles.actionListingImage} contentFit="cover" />
                    <View style={styles.actionAvatarWrap}>
                      <Avatar path={selectedConversation.otherUser.avatarPath} name={selectedConversation.otherUser.name} size={28} />
                    </View>
                  </View>
                  <View style={styles.actionHeaderCopy}>
                    <AppText variant="caption" color={colors.orange} style={styles.actionEyebrow}>{t('messages.actionsTitle')}</AppText>
                    <AppText variant="title" numberOfLines={1}>{selectedConversation.otherUser.name}</AppText>
                    <AppText variant="caption" color={colors.slate} numberOfLines={1}>{selectedConversation.listing.title}</AppText>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} disabled={Boolean(actionLoading)} onPress={() => setSelectedConversation(null)} style={styles.closeButton}>
                    <SymbolView name="xmark" size={15} tintColor={colors.ink} />
                  </Pressable>
                </View>

                <View style={styles.actionGroup}>
                  {selectedConversation.isArchived ? (
                    <ConversationActionRow
                      label={t('messages.unarchive')}
                      description={t('messages.unarchiveHint')}
                      symbol="archivebox.fill"
                      loading={actionLoading === 'unarchive'}
                      disabled={Boolean(actionLoading)}
                      onPress={() => void applyInboxAction('unarchive')}
                    />
                  ) : (
                    <>
                      <ConversationActionRow
                        label={selectedConversation.isPinned ? t('messages.unpin') : t('messages.pin')}
                        description={selectedConversation.isPinned ? t('messages.unpinHint') : t('messages.pinHint')}
                        symbol="pin.fill"
                        loading={actionLoading === 'pin' || actionLoading === 'unpin'}
                        disabled={Boolean(actionLoading)}
                        onPress={() => void applyInboxAction(selectedConversation.isPinned ? 'unpin' : 'pin')}
                      />
                      <ConversationActionRow
                        label={t('messages.archive')}
                        description={t('messages.archiveHint')}
                        symbol="archivebox.fill"
                        loading={actionLoading === 'archive'}
                        disabled={Boolean(actionLoading)}
                        separated
                        onPress={() => void applyInboxAction('archive')}
                      />
                    </>
                  )}
                </View>

                <View style={[styles.actionGroup, styles.deleteGroup]}>
                  <ConversationActionRow
                    label={t('messages.delete')}
                    description={t('messages.deleteHint')}
                    symbol="trash.fill"
                    loading={actionLoading === 'delete'}
                    disabled={Boolean(actionLoading)}
                    destructive
                    onPress={confirmDelete}
                  />
                </View>

                {actionError ? (
                  <View style={styles.actionError}>
                    <SymbolView name="exclamationmark.circle.fill" size={16} tintColor={colors.danger} />
                    <AppText accessibilityRole="alert" variant="caption" color={colors.danger} style={styles.actionErrorText}>{actionError}</AppText>
                  </View>
                ) : null}

                <Pressable accessibilityRole="button" disabled={Boolean(actionLoading)} onPress={() => setSelectedConversation(null)} style={({ pressed }) => [styles.cancelButton, pressed ? styles.actionPressed : null]}>
                  <AppText variant="bodyStrong" color={colors.slate}>{t('common.cancel')}</AppText>
                </Pressable>
              </>
            ) : null}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md },
  headerCopy: { flex: 1, gap: 2 },
  title: { fontSize: 28, lineHeight: 36 },
  headerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.orangeSoft },
  searchBar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, minHeight: 50, color: colors.ink, fontFamily: typography.regular, fontSize: 14 },
  filterScroller: { flexGrow: 0, flexShrink: 0, height: 58 },
  filters: { alignItems: 'center', gap: 7, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  filter: { height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, backgroundColor: colors.surface, paddingHorizontal: 13 },
  filterActive: { borderColor: colors.ink, backgroundColor: colors.ink },
  longPressHint: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  emptyList: { flexGrow: 1 },
  card: { minHeight: 104, flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 13 },
  cardPinned: { borderRadius: radii.md, backgroundColor: colors.orangeSoft, paddingHorizontal: spacing.sm },
  cardPressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
  visuals: { width: 72, height: 76 },
  listingImage: { width: 66, height: 72, borderRadius: 17, backgroundColor: colors.border },
  avatarWrap: { position: 'absolute', right: 0, bottom: -2, padding: 2, borderRadius: 20, backgroundColor: colors.surface },
  cardCopy: { flex: 1, gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1 },
  time: { fontSize: 10 },
  listingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  listingTitle: { flex: 1, fontSize: 10 },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  lastMessage: { flex: 1, fontSize: 12, lineHeight: 18 },
  unreadBadge: { minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: colors.orange, paddingHorizontal: 5 },
  unreadText: { fontSize: 9 },
  separator: { height: 1, marginLeft: 85, backgroundColor: colors.border },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  emptyIcon: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: 23, backgroundColor: colors.orangeSoft },
  emptyTitle: { textAlign: 'center', fontSize: 20 },
  emptyBody: { maxWidth: 300, textAlign: 'center' },
  error: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.md, borderRadius: radii.sm, backgroundColor: colors.dangerSoft, padding: 10 },
  actionBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(23,32,51,0.42)' },
  actionSheet: { maxHeight: '84%', gap: 12, overflow: 'hidden', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingTop: 10, paddingBottom: spacing.sm },
  sheetHandle: { width: 42, height: 5, alignSelf: 'center', borderRadius: 3, backgroundColor: colors.border },
  actionHeader: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionVisuals: { width: 62, height: 58 },
  actionListingImage: { width: 54, height: 54, borderRadius: 16, backgroundColor: colors.border },
  actionAvatarWrap: { position: 'absolute', right: 0, bottom: 0, padding: 2, borderRadius: 18, backgroundColor: colors.surface },
  actionHeaderCopy: { flex: 1, gap: 1 },
  actionEyebrow: { fontSize: 9, letterSpacing: 0.7 },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.background },
  actionGroup: { overflow: 'hidden', borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  deleteGroup: { borderColor: '#F5D0D0', backgroundColor: '#FFFDFD' },
  actionRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10 },
  actionRowSeparated: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  actionPressed: { backgroundColor: colors.background },
  actionIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.orangeSoft },
  actionCopy: { flex: 1, gap: 2 },
  actionDescription: { lineHeight: 17 },
  deleteIcon: { backgroundColor: colors.dangerSoft },
  actionError: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radii.sm, backgroundColor: colors.dangerSoft, padding: 10 },
  actionErrorText: { flex: 1 },
  cancelButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md },
});
