import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from '@/features/notifications/notification-service';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/providers/auth-provider';
import { colors, radii, spacing } from '@/theme/tokens';
import type { Notification, NotificationKind } from '@/types/database';

const notificationIcons: Record<NotificationKind, SymbolViewProps['name']> = {
  message: 'message.fill', offer_received: 'tag.fill', offer_accepted: 'checkmark.seal.fill',
  offer_declined: 'xmark.circle.fill', deal_created: 'shippingbox.fill', deal_confirmed: 'person.2.fill',
  deal_completed: 'checkmark.circle.fill', deal_cancelled: 'arrow.uturn.backward.circle.fill', review_received: 'star.fill',
};

function formatDate(value: string, language: string): string {
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(date);
  return new Intl.DateTimeFormat(language, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { authMode, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      setNotifications(await getNotifications(user.id, authMode === 'development'));
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
    return subscribeToNotifications(() => { void load(true); });
  }, [authMode, load]);

  const openNotification = async (notification: Notification) => {
    try {
      if (!notification.read_at) {
        await markNotificationRead(notification.id, authMode === 'development');
        setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item));
      }
      if (notification.deal_id) router.push({ pathname: '/deal/[id]', params: { id: notification.deal_id } });
      else if (notification.conversation_id) router.push({ pathname: '/conversation/[id]', params: { id: notification.conversation_id } });
      else if (notification.listing_id) router.push({ pathname: '/listing/[id]', params: { id: notification.listing_id } });
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    }
  };

  const markAll = async () => {
    if (!user) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(user.id, authMode === 'development');
      const now = new Date().toISOString();
      setNotifications((current) => current.map((notification) => ({ ...notification, read_at: notification.read_at ?? now })));
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('listing.goBack')} onPress={() => router.back()} style={styles.backButton}>
          <SymbolView name="chevron.left" size={18} tintColor={colors.ink} />
        </Pressable>
        <View style={styles.headerCopy}>
          <AppText variant="title">{t('notifications.title')}</AppText>
          <AppText variant="caption" color={colors.slate}>{t('notifications.subtitle')}</AppText>
        </View>
        {unreadCount ? (
          <Pressable accessibilityRole="button" disabled={markingAll} onPress={() => void markAll()} style={styles.markAllButton}>
            {markingAll ? <ActivityIndicator size="small" color={colors.orange} /> : <SymbolView name="checkmark.circle.fill" size={18} tintColor={colors.orange} />}
          </Pressable>
        ) : null}
      </View>
      {unreadCount ? (
        <Pressable accessibilityRole="button" disabled={markingAll} onPress={() => void markAll()} style={styles.markAllRow}>
          <AppText variant="caption" color={colors.orange}>{t('notifications.markAll')}</AppText>
          <View style={styles.countBadge}><AppText variant="caption" color={colors.surface}>{unreadCount}</AppText></View>
        </Pressable>
      ) : null}

      {loading ? <View style={styles.center}><ActivityIndicator color={colors.orange} /></View> : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, notifications.length === 0 ? styles.emptyList : null]}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); void load(true); }}
          renderItem={({ item }) => (
            <Pressable onPress={() => void openNotification(item)} style={({ pressed }) => [styles.card, !item.read_at ? styles.unreadCard : null, pressed ? styles.pressed : null]}>
              <View style={[styles.icon, !item.read_at ? styles.unreadIcon : null]}>
                <SymbolView name={notificationIcons[item.kind]} size={20} tintColor={!item.read_at ? colors.orange : colors.slate} />
              </View>
              <View style={styles.cardCopy}>
                <View style={styles.titleRow}>
                  <AppText variant="bodyStrong" style={styles.cardTitle}>{item.title}</AppText>
                  {!item.read_at ? <View style={styles.unreadDot} /> : null}
                </View>
                <AppText variant="caption" color={colors.slate} style={styles.body}>{item.body}</AppText>
                <AppText variant="caption" color={colors.muted} style={styles.date}>{formatDate(item.created_at, i18n.language)}</AppText>
              </View>
              <SymbolView name="chevron.right" size={13} tintColor={colors.muted} />
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={(
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><SymbolView name={error ? 'wifi.exclamationmark' : 'bell.slash.fill'} size={28} tintColor={error ? colors.danger : colors.orange} /></View>
              <AppText variant="title">{error ? t('search.emptyTitle') : t('notifications.emptyTitle')}</AppText>
              <AppText accessibilityRole={error ? 'alert' : undefined} color={error ? colors.danger : colors.slate} style={styles.emptyText}>{error ?? t('notifications.emptyBody')}</AppText>
              {error ? <Button label={t('common.retry')} variant="secondary" onPress={() => void load()} /> : null}
            </View>
          )}
        />
      )}
      {error && notifications.length > 0 ? <AppText accessibilityRole="alert" variant="caption" color={colors.danger} style={styles.error}>{error}</AppText> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.lg, paddingBottom: spacing.md },
  backButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 21, backgroundColor: colors.surface },
  headerCopy: { flex: 1, gap: 2 },
  markAllButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.orangeSoft },
  markAllRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 7, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  countBadge: { minWidth: 21, height: 21, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: colors.orange, paddingHorizontal: 5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  emptyList: { flexGrow: 1 },
  card: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radii.md, padding: 12 },
  unreadCard: { backgroundColor: colors.surface },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  icon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: colors.background },
  unreadIcon: { backgroundColor: colors.orangeSoft },
  cardCopy: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardTitle: { flex: 1 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.orange },
  body: { lineHeight: 18 },
  date: { fontSize: 9 },
  separator: { height: 1, marginLeft: 70, backgroundColor: colors.border },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  emptyIcon: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: 23, backgroundColor: colors.orangeSoft },
  emptyText: { maxWidth: 300, textAlign: 'center' },
  error: { margin: spacing.md, borderRadius: radii.sm, backgroundColor: colors.dangerSoft, padding: 10 },
});
