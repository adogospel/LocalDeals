import { randomUUID } from 'expo-crypto';

import type { Listing as AppListing } from '@/features/listings/mock-listings';
import { addDevelopmentNotification } from '@/features/notifications/notification-service';
import { cacheKeys, getCachedValue, setCachedValue } from '@/lib/cache';
import { supabase } from '@/lib/supabase';
import type { Deal, ListingImage, Message, Offer, Profile, Review } from '@/types/database';

import { validateReview } from './deal-rules';

export type DealRole = 'buyer' | 'seller';

export type DealParty = {
  id: string;
  name: string;
  avatarPath: string | null;
};

export type DealListing = {
  id: string;
  title: string;
  imageUrl: string;
  status: AppListing['status'];
};

export type DealView = Deal & {
  role: DealRole;
  listing: DealListing;
  buyer: DealParty;
  seller: DealParty;
  otherUser: DealParty;
  reviews: Review[];
  reviewedByMe: boolean;
};

export type LocalDeal = Deal & {
  listing: DealListing;
  buyer: DealParty;
  seller: DealParty;
};

type DealListingRow = {
  id: string;
  title: string;
  status: AppListing['status'];
  images: Pick<ListingImage, 'storage_path' | 'position'>[] | null;
};

type LocalConversationSnapshot = Record<string, unknown> & {
  id: string;
  listing_id: string;
  listing: DealListing & Record<string, unknown>;
};

function imageUrl(path?: string): string {
  if (!path) return '';
  return supabase.storage.from('listing-images').getPublicUrl(path).data.publicUrl;
}

function getLocalDeals(): LocalDeal[] {
  return getCachedValue<LocalDeal[]>(cacheKeys.localDeals) ?? [];
}

function getLocalReviews(): Review[] {
  return getCachedValue<Review[]>(cacheKeys.localReviews) ?? [];
}

function toView(deal: LocalDeal, userId: string, reviews: Review[]): DealView {
  const role: DealRole = deal.buyer_id === userId ? 'buyer' : 'seller';
  return {
    ...deal,
    role,
    otherUser: role === 'buyer' ? deal.seller : deal.buyer,
    reviews,
    reviewedByMe: reviews.some((review) => review.author_id === userId),
  };
}

export function createDevelopmentDealFromAcceptedOffer(
  offer: Offer,
  context: { listing: DealListing; buyer: DealParty; seller: DealParty },
): string {
  const existing = getLocalDeals().find((deal) => deal.offer_id === offer.id);
  if (existing) return existing.id;
  const now = new Date().toISOString();
  const deal: LocalDeal = {
    id: randomUUID(),
    listing_id: offer.listing_id,
    conversation_id: offer.conversation_id,
    offer_id: offer.id,
    buyer_id: offer.buyer_id,
    seller_id: offer.seller_id,
    amount: offer.amount,
    status: 'pending_handover',
    buyer_confirmed_at: null,
    seller_confirmed_at: null,
    completed_at: null,
    cancelled_at: null,
    cancelled_by: null,
    created_at: now,
    updated_at: now,
    ...context,
  };
  setCachedValue(cacheKeys.localDeals, [deal, ...getLocalDeals()]);
  addDevelopmentNotification({
    recipientId: deal.buyer_id,
    actorId: deal.seller_id,
    kind: 'deal_created',
    listingId: deal.listing_id,
    conversationId: deal.conversation_id,
    dealId: deal.id,
    title: 'Transaction à finaliser',
    body: 'Confirmez la remise seulement après avoir vérifié l’article.',
  });
  return deal.id;
}

export async function getDeals(userId: string, development = false): Promise<DealView[]> {
  if (development) {
    const reviews = getLocalReviews();
    return getLocalDeals()
      .filter((deal) => [deal.buyer_id, deal.seller_id].includes(userId))
      .map((deal) => toView(deal, userId, reviews.filter((review) => review.deal_id === deal.id)))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const { data: deals, error: dealsError } = await supabase.from('deals').select('*').order('created_at', { ascending: false });
  if (dealsError) throw dealsError;
  if (!deals.length) return [];
  const listingIds = [...new Set(deals.map((deal) => deal.listing_id))];
  const profileIds = [...new Set(deals.flatMap((deal) => [deal.buyer_id, deal.seller_id]))];
  const dealIds = deals.map((deal) => deal.id);
  const [listingsResult, profilesResult, reviewsResult] = await Promise.all([
    supabase.from('listings').select('id, title, status, images:listing_images(storage_path, position)').in('id', listingIds),
    supabase.from('profiles').select('id, display_name, avatar_path').in('id', profileIds),
    supabase.from('reviews').select('*').in('deal_id', dealIds),
  ]);
  if (listingsResult.error) throw listingsResult.error;
  if (profilesResult.error) throw profilesResult.error;
  if (reviewsResult.error) throw reviewsResult.error;

  const listings = listingsResult.data as unknown as DealListingRow[];
  const profiles = profilesResult.data as Pick<Profile, 'id' | 'display_name' | 'avatar_path'>[];
  const listingsById = new Map(listings.map((listing) => {
    const firstImage = [...(listing.images ?? [])].sort((a, b) => a.position - b.position)[0];
    return [listing.id, { id: listing.id, title: listing.title, status: listing.status, imageUrl: imageUrl(firstImage?.storage_path) } satisfies DealListing];
  }));
  const profilesById = new Map(profiles.map((profile) => [profile.id, {
    id: profile.id,
    name: profile.display_name ?? 'Membre LocalDeals',
    avatarPath: profile.avatar_path,
  } satisfies DealParty]));
  const reviews = reviewsResult.data as Review[];

  return deals.flatMap((deal) => {
    const listing = listingsById.get(deal.listing_id);
    const buyer = profilesById.get(deal.buyer_id);
    const seller = profilesById.get(deal.seller_id);
    if (!listing || !buyer || !seller) return [];
    return [toView({ ...deal, listing, buyer, seller }, userId, reviews.filter((review) => review.deal_id === deal.id))];
  });
}

export async function getDeal(dealId: string, userId: string, development = false): Promise<DealView | null> {
  return (await getDeals(userId, development)).find((deal) => deal.id === dealId) ?? null;
}

export async function getActiveDealForListing(listingId: string, userId: string, development = false): Promise<DealView | null> {
  return (await getDeals(userId, development)).find((deal) => deal.listing_id === listingId && deal.status === 'pending_handover') ?? null;
}

export async function confirmDeal(dealId: string, userId: string, development = false): Promise<void> {
  if (!development) {
    const { error } = await supabase.rpc('confirm_deal_handover', { p_deal_id: dealId });
    if (error) throw error;
    return;
  }
  const deals = getLocalDeals();
  const selected = deals.find((deal) => deal.id === dealId);
  if (!selected || ![selected.buyer_id, selected.seller_id].includes(userId)) throw new Error('Transaction indisponible.');
  if (selected.status !== 'pending_handover') throw new Error('Cette transaction n’est plus en attente.');
  const now = new Date().toISOString();
  const updated: LocalDeal = {
    ...selected,
    buyer_confirmed_at: selected.buyer_id === userId ? selected.buyer_confirmed_at ?? now : selected.buyer_confirmed_at,
    seller_confirmed_at: selected.seller_id === userId ? selected.seller_confirmed_at ?? now : selected.seller_confirmed_at,
    updated_at: now,
  };
  const completed = Boolean(updated.buyer_confirmed_at && updated.seller_confirmed_at);
  const finalDeal: LocalDeal = completed ? { ...updated, status: 'completed', completed_at: now } : updated;
  setCachedValue(cacheKeys.localDeals, deals.map((deal) => deal.id === dealId ? finalDeal : deal));

  const otherId = userId === selected.buyer_id ? selected.seller_id : selected.buyer_id;
  addDevelopmentNotification({
    recipientId: otherId,
    actorId: userId,
    kind: 'deal_confirmed',
    listingId: selected.listing_id,
    conversationId: selected.conversation_id,
    dealId,
    title: 'Remise confirmée',
    body: userId === selected.buyer_id ? 'L’acheteur a confirmé la réception.' : 'Le vendeur a confirmé la remise.',
  });

  if (completed) {
    const listings = getCachedValue<AppListing[]>(cacheKeys.localListings) ?? [];
    setCachedValue(cacheKeys.localListings, listings.map((listing) => listing.id === selected.listing_id ? { ...listing, status: 'sold' } : listing));
    const conversations = getCachedValue<LocalConversationSnapshot[]>(cacheKeys.localConversations) ?? [];
    setCachedValue(cacheKeys.localConversations, conversations.map((conversation) => (
      conversation.listing_id === selected.listing_id ? { ...conversation, listing: { ...conversation.listing, status: 'sold' } } : conversation
    )));
    const messages = getCachedValue<Message[]>(cacheKeys.localMessages) ?? [];
    setCachedValue(cacheKeys.localMessages, [...messages, {
      id: randomUUID(), conversation_id: selected.conversation_id, sender_id: null,
      kind: 'system', body: 'deal_completed', offer_id: null, created_at: now,
    }]);
    for (const recipientId of [selected.buyer_id, selected.seller_id]) {
      addDevelopmentNotification({ recipientId, kind: 'deal_completed', listingId: selected.listing_id, conversationId: selected.conversation_id, dealId, title: 'Transaction terminée', body: 'Vous pouvez maintenant laisser un avis vérifié.' });
    }
  }
}

export async function cancelDeal(dealId: string, userId: string, development = false): Promise<void> {
  if (!development) {
    const { error } = await supabase.rpc('cancel_deal', { p_deal_id: dealId });
    if (error) throw error;
    return;
  }
  const deals = getLocalDeals();
  const selected = deals.find((deal) => deal.id === dealId);
  if (!selected || ![selected.buyer_id, selected.seller_id].includes(userId)) throw new Error('Transaction indisponible.');
  if (selected.status !== 'pending_handover' || selected.buyer_confirmed_at || selected.seller_confirmed_at) throw new Error('Cette transaction ne peut plus être annulée.');
  const now = new Date().toISOString();
  setCachedValue(cacheKeys.localDeals, deals.map((deal) => deal.id === dealId ? { ...deal, status: 'cancelled', cancelled_at: now, cancelled_by: userId, updated_at: now } : deal));
  const offers = getCachedValue<Offer[]>(cacheKeys.localOffers) ?? [];
  setCachedValue(cacheKeys.localOffers, offers.map((offer) => offer.id === selected.offer_id ? { ...offer, status: 'cancelled', responded_at: now, updated_at: now } : offer));
  const listings = getCachedValue<AppListing[]>(cacheKeys.localListings) ?? [];
  setCachedValue(cacheKeys.localListings, listings.map((listing) => listing.id === selected.listing_id ? { ...listing, status: 'published' } : listing));
  const conversations = getCachedValue<LocalConversationSnapshot[]>(cacheKeys.localConversations) ?? [];
  setCachedValue(cacheKeys.localConversations, conversations.map((conversation) => (
    conversation.listing_id === selected.listing_id ? { ...conversation, listing: { ...conversation.listing, status: 'published' } } : conversation
  )));
  const messages = getCachedValue<Message[]>(cacheKeys.localMessages) ?? [];
  setCachedValue(cacheKeys.localMessages, [...messages, {
    id: randomUUID(), conversation_id: selected.conversation_id, sender_id: null,
    kind: 'system', body: 'deal_cancelled', offer_id: null, created_at: now,
  }]);
  const recipientId = userId === selected.buyer_id ? selected.seller_id : selected.buyer_id;
  addDevelopmentNotification({ recipientId, actorId: userId, kind: 'deal_cancelled', listingId: selected.listing_id, conversationId: selected.conversation_id, dealId, title: 'Transaction annulée', body: 'L’article est de nouveau disponible.' });
}

export async function submitReview(dealId: string, userId: string, score: number, comment: string, development = false): Promise<void> {
  const values = validateReview(score, comment);
  if (!development) {
    const { error } = await supabase.rpc('submit_deal_review', { p_deal_id: dealId, p_score: values.score, p_comment: values.comment });
    if (error) throw error;
    return;
  }
  const deal = getLocalDeals().find((item) => item.id === dealId);
  if (!deal || deal.status !== 'completed' || ![deal.buyer_id, deal.seller_id].includes(userId)) throw new Error('Une transaction terminée est requise.');
  const reviews = getLocalReviews();
  if (reviews.some((review) => review.deal_id === dealId && review.author_id === userId)) throw new Error('Vous avez déjà laissé un avis.');
  const subjectId = userId === deal.buyer_id ? deal.seller_id : deal.buyer_id;
  const review: Review = { id: randomUUID(), deal_id: dealId, author_id: userId, subject_id: subjectId, score: values.score, comment: values.comment, created_at: new Date().toISOString() };
  setCachedValue(cacheKeys.localReviews, [review, ...reviews]);
  addDevelopmentNotification({ recipientId: subjectId, actorId: userId, kind: 'review_received', listingId: deal.listing_id, conversationId: deal.conversation_id, dealId, reviewId: review.id, title: 'Nouvel avis', body: `Vous avez reçu un avis vérifié de ${score}/5.` });
}

export function subscribeToDeals(onChange: () => void): () => void {
  const channel = supabase.channel('deals')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'deals' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, onChange)
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
