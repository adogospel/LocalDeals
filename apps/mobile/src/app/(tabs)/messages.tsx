import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

export default function MessagesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { authMode, user } = useAuth();
  const [conversations, setConversations] = useState<ConversationPreview[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<InboxFilter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<ConversationPreview | null>(null);
  const [actionLoading, setActionLoading] = useState<ConversationInboxAction | null>(null);

  const loadConversations = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      setConversations(await getConversations(user.id, i18n.language, authMode === 'development'));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authMode, i18n.language, user]);

  useFocusEffect(useCallback(() => { void loadConversations(); }, [loadConversations]));

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
    setError(null);
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
      setError(getErrorMessage(nextError));
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
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

      {loading ? (
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
              onLongPress={() => setSelectedConversation(item)}
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
        animationType="fade"
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
              <View style={styles.actionHeader}>
                <Avatar path={selectedConversation.otherUser.avatarPath} name={selectedConversation.otherUser.name} size={44} />
                <View style={styles.actionHeaderCopy}>
                  <AppText variant="title" numberOfLines={1}>{selectedConversation.otherUser.name}</AppText>
                  <AppText variant="caption" color={colors.slate} numberOfLines={1}>{selectedConversation.listing.title}</AppText>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} disabled={Boolean(actionLoading)} onPress={() => setSelectedConversation(null)} style={styles.closeButton}>
                  <SymbolView name="xmark" size={15} tintColor={colors.ink} />
                </Pressable>
              </View>
            ) : null}

            {selectedConversation?.isArchived ? (
              <Pressable disabled={Boolean(actionLoading)} onPress={() => void applyInboxAction('unarchive')} style={({ pressed }) => [styles.actionRow, pressed ? styles.actionPressed : null]}>
                <View style={styles.actionIcon}><SymbolView name="archivebox.fill" size={18} tintColor={colors.orange} /></View>
                <AppText variant="bodyStrong" style={styles.actionLabel}>{t('messages.unarchive')}</AppText>
                {actionLoading === 'unarchive' ? <ActivityIndicator size="small" color={colors.orange} /> : <SymbolView name="chevron.right" size={13} tintColor={colors.muted} />}
              </Pressable>
            ) : (
              <>
                <Pressable disabled={Boolean(actionLoading)} onPress={() => void applyInboxAction(selectedConversation?.isPinned ? 'unpin' : 'pin')} style={({ pressed }) => [styles.actionRow, pressed ? styles.actionPressed : null]}>
                  <View style={styles.actionIcon}><SymbolView name="pin.fill" size={18} tintColor={colors.orange} /></View>
                  <AppText variant="bodyStrong" style={styles.actionLabel}>{selectedConversation?.isPinned ? t('messages.unpin') : t('messages.pin')}</AppText>
                  {actionLoading === 'pin' || actionLoading === 'unpin' ? <ActivityIndicator size="small" color={colors.orange} /> : <SymbolView name="chevron.right" size={13} tintColor={colors.muted} />}
                </Pressable>
                <Pressable disabled={Boolean(actionLoading)} onPress={() => void applyInboxAction('archive')} style={({ pressed }) => [styles.actionRow, pressed ? styles.actionPressed : null]}>
                  <View style={styles.actionIcon}><SymbolView name="archivebox.fill" size={18} tintColor={colors.orange} /></View>
                  <AppText variant="bodyStrong" style={styles.actionLabel}>{t('messages.archive')}</AppText>
                  {actionLoading === 'archive' ? <ActivityIndicator size="small" color={colors.orange} /> : <SymbolView name="chevron.right" size={13} tintColor={colors.muted} />}
                </Pressable>
              </>
            )}

            <Pressable disabled={Boolean(actionLoading)} onPress={confirmDelete} style={({ pressed }) => [styles.actionRow, styles.deleteAction, pressed ? styles.actionPressed : null]}>
              <View style={[styles.actionIcon, styles.deleteIcon]}><SymbolView name="trash.fill" size={18} tintColor={colors.danger} /></View>
              <AppText variant="bodyStrong" color={colors.danger} style={styles.actionLabel}>{t('messages.delete')}</AppText>
              {actionLoading === 'delete' ? <ActivityIndicator size="small" color={colors.danger} /> : <SymbolView name="chevron.right" size={13} tintColor={colors.muted} />}
            </Pressable>
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
  filters: { gap: 7, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  filter: { minHeight: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, backgroundColor: colors.surface, paddingHorizontal: 12 },
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
  actionSheet: { gap: spacing.sm, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.surface, paddingHorizontal: spacing.lg, paddingTop: 10 },
  sheetHandle: { width: 42, height: 5, alignSelf: 'center', borderRadius: 3, backgroundColor: colors.border },
  actionHeader: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  actionHeaderCopy: { flex: 1, gap: 2 },
  closeButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: colors.background },
  actionRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radii.md, paddingHorizontal: spacing.sm },
  actionPressed: { backgroundColor: colors.background },
  actionIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.orangeSoft },
  actionLabel: { flex: 1 },
  deleteAction: { marginTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, borderRadius: 0, paddingTop: spacing.sm },
  deleteIcon: { backgroundColor: colors.dangerSoft },
});
