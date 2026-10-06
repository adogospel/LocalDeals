import { randomUUID } from 'expo-crypto';

import { createDevelopmentDealFromAcceptedOffer, getDeals, type DealView } from '@/features/deals/deal-service';
import { getListing } from '@/features/listings/listing-service';
import { isListingPurchasable } from '@/features/listings/listing-status';
import type { Listing } from '@/features/listings/mock-listings';
import { addDevelopmentNotification } from '@/features/notifications/notification-service';
import { cacheKeys, getCachedValue, setCachedValue } from '@/lib/cache';
import { supabase } from '@/lib/supabase';
import type {
  Conversation,
  ConversationInboxState,
  ListingImage,
  Message,
  Offer,
  Profile,
} from '@/types/database';

import { normalizeMessage, parseOfferAmount } from './messaging-rules';

export type ConversationRole = 'buyer' | 'seller';

export type ConversationListing = {
  id: string;
  title: string;
  price: number;
  imageUrl: string;
  status: Listing['status'];
};

export type ConversationUser = {
  id: string;
  name: string;
  avatarPath: string | null;
};

export type ConversationPreview = {
  id: string;
  role: ConversationRole;
  listing: ConversationListing;
  otherUser: ConversationUser;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
};

export type ConversationInboxAction = 'pin' | 'unpin' | 'archive' | 'unarchive' | 'delete';

export type ChatMessage = Message & { offer: Offer | null };

export type ConversationDetail = ConversationPreview & {
  messages: ChatMessage[];
  deal: DealView | null;
};

type ConversationListingRow = {
  id: string;
  title: string;
  price: number;
  status: Listing['status'];
  images: Pick<ListingImage, 'storage_path' | 'position'>[] | null;
};

type LocalConversation = Conversation & {
  listing: ConversationListing;
  buyer: ConversationUser;
  seller: ConversationUser;
};

function listingImageUrl(path?: string): string {
  if (!path) return '';
  return supabase.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
}

function summarizeMessage(message: ChatMessage | undefined, language: string): string {
  if (!message) return language.startsWith('en') ? 'New conversation' : 'Nouvelle conversation';
  if (message.kind === 'text') return message.body ?? '';
  if (message.kind === 'offer') {
    return language.startsWith('en') ? 'A new offer was sent' : 'Une nouvelle offre a été envoyée';
  }
  const labels: Record<string, { fr: string; en: string }> = {
    offer_accepted: { fr: 'Offre acceptée', en: 'Offer accepted' },
    offer_declined: { fr: 'Offre refusée', en: 'Offer declined' },
    offer_cancelled: { fr: 'Offre annulée', en: 'Offer cancelled' },
  };
  const label = labels[message.body ?? ''];
  return label ? (language.startsWith('en') ? label.en : label.fr) : (message.body ?? '');
}

function toChatMessages(messages: Message[], offers: Offer[]): ChatMessage[] {
  const offersById = new Map(offers.map((offer) => [offer.id, offer]));
  return messages.map((message) => ({
    ...message,
    offer: message.offer_id ? offersById.get(message.offer_id) ?? null : null,
  }));
}

function buildPreview(
  conversation: Conversation,
  listing: ConversationListing,
  buyer: ConversationUser,
  seller: ConversationUser,
  messages: ChatMessage[],
  userId: string,
  language: string,
  state?: ConversationInboxState,
): ConversationPreview {
  const role: ConversationRole = conversation.buyer_id === userId ? 'buyer' : 'seller';
  const readAt = role === 'buyer' ? conversation.buyer_last_read_at : conversation.seller_last_read_at;
  const latest = messages.at(-1);
  const unreadCount = messages.filter((message) => (
    message.sender_id !== null
    && message.sender_id !== userId
    && (!readAt || message.created_at > readAt)
  )).length;
  return {
    id: conversation.id,
    role,
    listing,
    otherUser: role === 'buyer' ? seller : buyer,
    lastMessage: summarizeMessage(latest, language),
    lastMessageAt: latest?.created_at ?? conversation.last_message_at,
    unreadCount,
    isPinned: Boolean(state?.pinned_at),
    isArchived: Boolean(state?.archived_at),
  };
}

function getLocalConversations(): LocalConversation[] {
  return getCachedValue<LocalConversation[]>(cacheKeys.localConversations) ?? [];
}

function getLocalMessages(): Message[] {
  return getCachedValue<Message[]>(cacheKeys.localMessages) ?? [];
}

function getLocalConversationStates(): ConversationInboxState[] {
  return getCachedValue<ConversationInboxState[]>(cacheKeys.localConversationStates) ?? [];
}

function restoreLocalConversationState(conversationId: string): void {
  const now = new Date().toISOString();
  setCachedValue(cacheKeys.localConversationStates, getLocalConversationStates().map((state) => (
    state.conversation_id === conversationId
      ? { ...state, archived_at: null, deleted_at: null, updated_at: now }
      : state
  )));
}

function getLocalOffers(): Offer[] {
  return getCachedValue<Offer[]>(cacheKeys.localOffers) ?? [];
}

async function getRemoteConversationData(userId: string, language: string) {
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select('*')
    .order('last_message_at', { ascending: false });
  if (conversationsError) throw conversationsError;
  if (!conversations.length) return [];

  const listingIds = [...new Set(conversations.map((conversation) => conversation.listing_id))];
  const profileIds = [...new Set(conversations.flatMap((conversation) => [conversation.buyer_id, conversation.seller_id]))];
  const conversationIds = conversations.map((conversation) => conversation.id);

  const [listingsResult, profilesResult, messagesResult, offersResult, statesResult] = await Promise.all([
    supabase.from('listings').select('id, title, price, status, images:listing_images(storage_path, position)').in('id', listingIds),
    supabase.from('profiles').select('id, display_name, avatar_path').in('id', profileIds),
    supabase.from('messages').select('*').in('conversation_id', conversationIds).order('created_at'),
    supabase.from('offers').select('*').in('conversation_id', conversationIds),
    supabase.from('conversation_user_states').select('*').eq('user_id', userId),
  ]);
  if (listingsResult.error) throw listingsResult.error;
  if (profilesResult.error) throw profilesResult.error;
  if (messagesResult.error) throw messagesResult.error;
  if (offersResult.error) throw offersResult.error;
  if (statesResult.error) throw statesResult.error;

  const listings = listingsResult.data as unknown as ConversationListingRow[];
  const profiles = profilesResult.data as Pick<Profile, 'id' | 'display_name' | 'avatar_path'>[];
  const listingsById = new Map(listings.map((listing) => {
    const firstImage = [...(listing.images ?? [])].sort((a, b) => a.position - b.position)[0];
    return [listing.id, {
      id: listing.id,
      title: listing.title,
      price: listing.price,
      status: listing.status,
      imageUrl: listingImageUrl(firstImage?.storage_path),
    } satisfies ConversationListing];
  }));
  const profilesById = new Map(profiles.map((profile) => [profile.id, {
    id: profile.id,
    name: profile.display_name ?? (language.startsWith('en') ? 'LocalDeals member' : 'Membre LocalDeals'),
    avatarPath: profile.avatar_path,
  } satisfies ConversationUser]));
  const allMessages = messagesResult.data as Message[];
  const allOffers = offersResult.data as Offer[];
  const statesByConversationId = new Map((statesResult.data as ConversationInboxState[]).map((state) => [state.conversation_id, state]));

  return conversations.flatMap((conversation) => {
    const listing = listingsById.get(conversation.listing_id);
    const buyer = profilesById.get(conversation.buyer_id);
    const seller = profilesById.get(conversation.seller_id);
    if (!listing || !buyer || !seller) return [];
    const messages = toChatMessages(
      allMessages.filter((message) => message.conversation_id === conversation.id),
      allOffers.filter((offer) => offer.conversation_id === conversation.id),
    );
    return [{ conversation, listing, buyer, seller, messages, state: statesByConversationId.get(conversation.id) }];
  });
}

function sortConversationPreviews(items: ConversationPreview[]): ConversationPreview[] {
  return items.sort((left, right) => {
    if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
    return right.lastMessageAt.localeCompare(left.lastMessageAt);
  });
}

export async function getConversations(
  userId: string,
  language = 'fr',
  development = false,
): Promise<ConversationPreview[]> {
  if (development) {
    const messages = getLocalMessages();
    const offers = getLocalOffers();
    const statesByConversationId = new Map(
      getLocalConversationStates()
        .filter((state) => state.user_id === userId)
        .map((state) => [state.conversation_id, state]),
    );
    return sortConversationPreviews(getLocalConversations()
      .filter((conversation) => !statesByConversationId.get(conversation.id)?.deleted_at)
      .map((conversation) => buildPreview(
        conversation,
        conversation.listing,
        conversation.buyer,
        conversation.seller,
        toChatMessages(messages.filter((message) => message.conversation_id === conversation.id), offers),
        userId,
        language,
        statesByConversationId.get(conversation.id),
      ))
    );
  }

  const data = await getRemoteConversationData(userId, language);
  return sortConversationPreviews(data
    .filter(({ state }) => !state?.deleted_at)
    .map(({ conversation, listing, buyer, seller, messages, state }) => (
      buildPreview(conversation, listing, buyer, seller, messages, userId, language, state)
    )));
}

export async function getConversation(
  conversationId: string,
  userId: string,
  language = 'fr',
  development = false,
): Promise<ConversationDetail | null> {
  if (development) {
    const conversation = getLocalConversations().find((item) => item.id === conversationId);
    if (!conversation || ![conversation.buyer_id, conversation.seller_id].includes(userId)) return null;
    const state = getLocalConversationStates().find((item) => item.conversation_id === conversationId && item.user_id === userId);
    if (state?.deleted_at) return null;
    const messages = toChatMessages(
      getLocalMessages().filter((message) => message.conversation_id === conversation.id),
      getLocalOffers().filter((offer) => offer.conversation_id === conversation.id),
    );
    const deal = (await getDeals(userId, true)).find((item) => item.conversation_id === conversation.id && item.status !== 'cancelled') ?? null;
    return {
      ...buildPreview(conversation, conversation.listing, conversation.buyer, conversation.seller, messages, userId, language, state),
      messages,
      deal,
    };
  }

  const data = await getRemoteConversationData(userId, language);
  const match = data.find(({ conversation }) => conversation.id === conversationId);
  if (!match || match.state?.deleted_at) return null;
  const deal = (await getDeals(userId)).find((item) => item.conversation_id === conversationId && item.status !== 'cancelled') ?? null;
  return {
    ...buildPreview(match.conversation, match.listing, match.buyer, match.seller, match.messages, userId, language, match.state),
    messages: match.messages,
    deal,
  };
}

export async function getOrCreateConversation(
  listingId: string,
  userId: string,
  development = false,
): Promise<string> {
  if (!development) {
    const { data, error } = await supabase.rpc('get_or_create_conversation', { p_listing_id: listingId });
    if (error) throw error;
    const { error: stateError } = await supabase.rpc('set_conversation_inbox_state', { p_action: 'unarchive', p_conversation_id: data });
    if (stateError) throw stateError;
    return data;
  }

  const existing = getLocalConversations().find((conversation) => (
    conversation.listing_id === listingId && conversation.buyer_id === userId
  ));
  if (existing) {
    await updateConversationInboxState(existing.id, userId, 'unarchive', true);
    return existing.id;
  }

  const listing = await getListing(listingId, { development: true });
  if (!listing) throw new Error('Cette annonce n’est plus disponible.');
  const sellerId = listing.sellerId ?? listing.seller.id;
  if (!sellerId || sellerId === userId) throw new Error('Vous ne pouvez pas vous contacter sur votre propre annonce.');

  const now = new Date().toISOString();
  const id = randomUUID();
  const conversation: LocalConversation = {
    id,
    listing_id: listing.id,
    buyer_id: userId,
    seller_id: sellerId,
    buyer_last_read_at: now,
    seller_last_read_at: null,
    last_message_at: now,
    created_at: now,
    updated_at: now,
    listing: {
      id: listing.id,
      title: listing.title,
      price: listing.price,
      imageUrl: listing.imageUrl,
      status: listing.status,
    },
    buyer: { id: userId, name: 'Vous', avatarPath: null },
    seller: { id: sellerId, name: listing.seller.name, avatarPath: listing.seller.avatarPath ?? null },
  };
  setCachedValue(cacheKeys.localConversations, [conversation, ...getLocalConversations()]);
  const welcome: Message = {
    id: randomUUID(),
    conversation_id: id,
    sender_id: sellerId,
    kind: 'text',
    body: 'Bonjour 👋 L’article est toujours disponible. Comment puis-je vous aider ?',
    offer_id: null,
    created_at: new Date(Date.now() + 1).toISOString(),
  };
  setCachedValue(cacheKeys.localMessages, [...getLocalMessages(), welcome]);
  return id;
}

export async function sendMessage(
  conversationId: string,
  userId: string,
  body: string,
  development = false,
): Promise<void> {
  const cleanBody = normalizeMessage(body);
  if (!development) {
    const { error } = await supabase.rpc('send_conversation_message', {
      p_conversation_id: conversationId,
      p_body: cleanBody,
    });
    if (error) throw error;
    return;
  }
  const conversation = getLocalConversations().find((item) => item.id === conversationId);
  if (!conversation || ![conversation.buyer_id, conversation.seller_id].includes(userId)) throw new Error('Conversation indisponible.');
  const message: Message = {
    id: randomUUID(), conversation_id: conversationId, sender_id: userId,
    kind: 'text', body: cleanBody, offer_id: null, created_at: new Date().toISOString(),
  };
  setCachedValue(cacheKeys.localMessages, [...getLocalMessages(), message]);
  restoreLocalConversationState(conversationId);
  const recipientId = userId === conversation.buyer_id ? conversation.seller_id : conversation.buyer_id;
  addDevelopmentNotification({
    recipientId,
    actorId: userId,
    kind: 'message',
    listingId: conversation.listing_id,
    conversationId,
    title: 'Nouveau message',
    body: cleanBody.slice(0, 240),
  });
}

export async function createOffer(
  conversationId: string,
  userId: string,
  amount: number,
  development = false,
): Promise<void> {
  const validatedAmount = parseOfferAmount(amount);
  if (!development) {
    const { error } = await supabase.rpc('create_conversation_offer', { p_conversation_id: conversationId, p_amount: validatedAmount });
    if (error) throw error;
    return;
  }
  const conversations = getLocalConversations();
  const conversation = conversations.find((item) => item.id === conversationId);
  if (!conversation || conversation.buyer_id !== userId) throw new Error('Seul l’acheteur peut faire une offre.');
  const listing = await getListing(conversation.listing_id, { development: true });
  if (!listing || !isListingPurchasable(listing.status)) throw new Error('Cette annonce n’accepte plus de nouvelles offres.');
  const now = new Date().toISOString();
  const currentOffers = getLocalOffers().map((offer) => (
    offer.conversation_id === conversationId && offer.status === 'pending'
      ? { ...offer, status: 'cancelled' as const, responded_at: now, updated_at: now }
      : offer
  ));
  const offer: Offer = {
    id: randomUUID(), conversation_id: conversationId, listing_id: conversation.listing_id,
    buyer_id: conversation.buyer_id, seller_id: conversation.seller_id, amount: validatedAmount,
    status: 'pending', responded_at: null, created_at: now, updated_at: now,
  };
  setCachedValue(cacheKeys.localOffers, [...currentOffers, offer]);
  setCachedValue(cacheKeys.localMessages, [...getLocalMessages(), {
    id: randomUUID(), conversation_id: conversationId, sender_id: userId,
    kind: 'offer', body: null, offer_id: offer.id, created_at: now,
  } satisfies Message]);
  restoreLocalConversationState(conversationId);
  addDevelopmentNotification({
    recipientId: conversation.seller_id,
    actorId: userId,
    kind: 'offer_received',
    listingId: conversation.listing_id,
    conversationId,
    title: 'Nouvelle offre',
    body: 'Un acheteur vous propose un nouveau prix.',
  });
}

export async function respondToOffer(offerId: string, userId: string, accept: boolean, development = false): Promise<void> {
  if (!development) {
    const { error } = await supabase.rpc('respond_to_conversation_offer', { p_offer_id: offerId, p_accept: accept });
    if (error) throw error;
    return;
  }
  const now = new Date().toISOString();
  const currentOffers = getLocalOffers();
  const selectedOffer = currentOffers.find((offer) => offer.id === offerId);
  if (!selectedOffer || selectedOffer.seller_id !== userId) throw new Error('Seul le vendeur peut répondre à cette offre.');
  if (selectedOffer.status !== 'pending') throw new Error('Cette offre n’est plus en attente.');
  setCachedValue(cacheKeys.localOffers, currentOffers.map((offer) => {
    if (offer.id === offerId) return { ...offer, status: accept ? 'accepted' : 'declined', responded_at: now, updated_at: now };
    if (accept && offer.listing_id === selectedOffer.listing_id && offer.status === 'pending') {
      return { ...offer, status: 'declined' as const, responded_at: now, updated_at: now };
    }
    return offer;
  }));
  if (accept) {
    const selectedConversation = getLocalConversations().find((conversation) => conversation.id === selectedOffer.conversation_id);
    setCachedValue(cacheKeys.localConversations, getLocalConversations().map((conversation) => (
      conversation.listing_id === selectedOffer.listing_id
        ? { ...conversation, listing: { ...conversation.listing, status: 'reserved' as const } }
        : conversation
    )));
    if (selectedConversation) {
      createDevelopmentDealFromAcceptedOffer(selectedOffer, {
        listing: { ...selectedConversation.listing, status: 'reserved' },
        buyer: selectedConversation.buyer,
        seller: selectedConversation.seller,
      });
    }
  }
  setCachedValue(cacheKeys.localMessages, [...getLocalMessages(), {
    id: randomUUID(), conversation_id: selectedOffer.conversation_id, sender_id: null,
    kind: 'system', body: accept ? 'offer_accepted' : 'offer_declined', offer_id: null, created_at: now,
  } satisfies Message]);
  restoreLocalConversationState(selectedOffer.conversation_id);
  addDevelopmentNotification({
    recipientId: selectedOffer.buyer_id,
    actorId: userId,
    kind: accept ? 'offer_accepted' : 'offer_declined',
    listingId: selectedOffer.listing_id,
    conversationId: selectedOffer.conversation_id,
    title: accept ? 'Offre acceptée' : 'Offre refusée',
    body: accept ? 'Organisez maintenant la remise de l’article.' : 'Le vendeur n’a pas retenu cette proposition.',
  });
}

export async function cancelOffer(offerId: string, userId: string, development = false): Promise<void> {
  if (!development) {
    const { error } = await supabase.rpc('cancel_conversation_offer', { p_offer_id: offerId });
    if (error) throw error;
    return;
  }
  const now = new Date().toISOString();
  const selectedOffer = getLocalOffers().find((offer) => offer.id === offerId);
  if (!selectedOffer || selectedOffer.buyer_id !== userId) throw new Error('Seul l’acheteur peut annuler cette offre.');
  if (selectedOffer.status !== 'pending') throw new Error('Cette offre n’est plus en attente.');
  setCachedValue(cacheKeys.localOffers, getLocalOffers().map((offer) => (
    offer.id === offerId ? { ...offer, status: 'cancelled', responded_at: now, updated_at: now } : offer
  )));
  setCachedValue(cacheKeys.localMessages, [...getLocalMessages(), {
    id: randomUUID(), conversation_id: selectedOffer.conversation_id, sender_id: null,
    kind: 'system', body: 'offer_cancelled', offer_id: null, created_at: now,
  } satisfies Message]);
  restoreLocalConversationState(selectedOffer.conversation_id);
}

export async function updateConversationInboxState(
  conversationId: string,
  userId: string,
  action: ConversationInboxAction,
  development = false,
): Promise<void> {
  if (!development) {
    const { error } = await supabase.rpc('set_conversation_inbox_state', {
      p_action: action,
      p_conversation_id: conversationId,
    });
    if (error) throw error;
    return;
  }

  const conversation = getLocalConversations().find((item) => item.id === conversationId);
  if (!conversation || ![conversation.buyer_id, conversation.seller_id].includes(userId)) {
    throw new Error('Conversation indisponible.');
  }

  const now = new Date().toISOString();
  const states = getLocalConversationStates();
  const current = states.find((state) => state.conversation_id === conversationId && state.user_id === userId) ?? {
    conversation_id: conversationId,
    user_id: userId,
    pinned_at: null,
    archived_at: null,
    deleted_at: null,
    created_at: now,
    updated_at: now,
  };
  const next: ConversationInboxState = {
    ...current,
    pinned_at: action === 'pin' ? now : ['unpin', 'archive', 'delete'].includes(action) ? null : current.pinned_at,
    archived_at: action === 'archive' ? now : ['pin', 'unarchive', 'delete'].includes(action) ? null : current.archived_at,
    deleted_at: action === 'delete' ? now : ['pin', 'archive', 'unarchive'].includes(action) ? null : current.deleted_at,
    updated_at: now,
  };
  setCachedValue(cacheKeys.localConversationStates, [
    next,
    ...states.filter((state) => state.conversation_id !== conversationId || state.user_id !== userId),
  ]);
}

export async function markConversationRead(
  conversationId: string,
  userId: string,
  development = false,
): Promise<void> {
  if (!development) {
    const { error } = await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId });
    if (error) throw error;
    return;
  }
  const now = new Date().toISOString();
  setCachedValue(cacheKeys.localConversations, getLocalConversations().map((conversation) => (
    conversation.id !== conversationId ? conversation : {
      ...conversation,
      buyer_last_read_at: conversation.buyer_id === userId ? now : conversation.buyer_last_read_at,
      seller_last_read_at: conversation.seller_id === userId ? now : conversation.seller_last_read_at,
    }
  )));
}

export function subscribeToConversation(conversationId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'offers', filter: `conversation_id=eq.${conversationId}` }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

export function subscribeToInbox(onChange: () => void): () => void {
  const channel = supabase
    .channel('inbox')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_user_states' }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
