import { randomUUID } from 'expo-crypto';

import { cacheKeys, getCachedValue, setCachedValue } from '@/lib/cache';
import { supabase } from '@/lib/supabase';
import type { Notification, NotificationKind } from '@/types/database';

type DevelopmentNotificationInput = {
  recipientId: string;
  actorId?: string | null;
  kind: NotificationKind;
  listingId?: string | null;
  conversationId?: string | null;
  dealId?: string | null;
  reviewId?: string | null;
  title: string;
  body: string;
};

function getDevelopmentNotifications(): Notification[] {
  return getCachedValue<Notification[]>(cacheKeys.localNotifications) ?? [];
}

export function addDevelopmentNotification(input: DevelopmentNotificationInput): void {
  const notification: Notification = {
    id: randomUUID(),
    recipient_id: input.recipientId,
    actor_id: input.actorId ?? null,
    kind: input.kind,
    listing_id: input.listingId ?? null,
    conversation_id: input.conversationId ?? null,
    deal_id: input.dealId ?? null,
    review_id: input.reviewId ?? null,
    title: input.title,
    body: input.body,
    read_at: null,
    created_at: new Date().toISOString(),
  };
  setCachedValue(cacheKeys.localNotifications, [notification, ...getDevelopmentNotifications()]);
}

export async function getNotifications(userId: string, development = false): Promise<Notification[]> {
  if (development) {
    return getDevelopmentNotifications()
      .filter((notification) => notification.recipient_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return data;
}

export async function markNotificationRead(notificationId: string, development = false): Promise<void> {
  if (development) {
    const now = new Date().toISOString();
    setCachedValue(cacheKeys.localNotifications, getDevelopmentNotifications().map((notification) => (
      notification.id === notificationId ? { ...notification, read_at: notification.read_at ?? now } : notification
    )));
    return;
  }
  const { error } = await supabase.rpc('mark_notification_read', { p_notification_id: notificationId });
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string, development = false): Promise<void> {
  if (development) {
    const now = new Date().toISOString();
    setCachedValue(cacheKeys.localNotifications, getDevelopmentNotifications().map((notification) => (
      notification.recipient_id === userId && !notification.read_at ? { ...notification, read_at: now } : notification
    )));
    return;
  }
  const { error } = await supabase.rpc('mark_all_notifications_read', {});
  if (error) throw error;
}

export function subscribeToNotifications(onChange: () => void): () => void {
  const channel = supabase
    .channel('notifications')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
