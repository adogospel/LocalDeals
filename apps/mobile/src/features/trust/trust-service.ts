import { randomUUID } from 'expo-crypto';

import { getListings, getListingsBySeller } from '@/features/listings/listing-service';
import type { Listing } from '@/features/listings/mock-listings';
import { cacheKeys, getCachedValue, setCachedValue } from '@/lib/cache';
import { supabase } from '@/lib/supabase';
import type { Profile, Report, ReportReason, Review } from '@/types/database';

export type PublicReview = Review & {
  author: { id: string; name: string; avatarPath: string | null };
};

export type PublicProfile = {
  profile: Pick<Profile, 'id' | 'display_name' | 'avatar_path' | 'city' | 'neighborhood' | 'created_at'>;
  averageRating: number;
  reviewCount: number;
  completedSales: number;
  reviews: PublicReview[];
  listings: Listing[];
};

export async function getPublicProfile(
  profileId: string,
  language = 'fr',
  development = false,
  currentProfile?: Profile | null,
): Promise<PublicProfile | null> {
  if (development) {
    const reviews = (getCachedValue<Review[]>(cacheKeys.localReviews) ?? []).filter((review) => review.subject_id === profileId);
    const allListings = await getListings({}, { development: true, language });
    const listings = allListings.filter((listing) => listing.sellerId === profileId);
    const matchingListing = listings[0];
    if (!matchingListing && currentProfile?.id !== profileId && !reviews.length) return null;
    const profile = currentProfile?.id === profileId ? currentProfile : {
      id: profileId,
      display_name: matchingListing?.seller.name ?? 'Membre LocalDeals',
      avatar_path: matchingListing?.seller.avatarPath ?? null,
      city: matchingListing?.city ?? 'Cameroun',
      neighborhood: matchingListing?.neighborhood ?? null,
      created_at: new Date(0).toISOString(),
    };
    const localDeals = getCachedValue<{ seller_id: string; status: string }[]>(cacheKeys.localDeals) ?? [];
    return {
      profile,
      averageRating: reviews.length ? reviews.reduce((sum, review) => sum + review.score, 0) / reviews.length : 0,
      reviewCount: reviews.length,
      completedSales: localDeals.filter((deal) => deal.seller_id === profileId && deal.status === 'completed').length,
      reviews: reviews.map((review) => ({ ...review, author: { id: review.author_id, name: 'Membre LocalDeals', avatarPath: null } })),
      listings,
    };
  }

  const [profileResult, reviewsResult, statsResult, listings] = await Promise.all([
    supabase.from('profiles').select('id, display_name, avatar_path, city, neighborhood, created_at').eq('id', profileId).maybeSingle(),
    supabase.from('reviews').select('*').eq('subject_id', profileId).order('created_at', { ascending: false }).limit(50),
    supabase.rpc('get_public_profile_stats', { p_user_id: profileId }),
    getListingsBySeller(profileId, language),
  ]);
  if (profileResult.error) throw profileResult.error;
  if (reviewsResult.error) throw reviewsResult.error;
  if (statsResult.error) throw statsResult.error;
  if (!profileResult.data) return null;
  const reviews = reviewsResult.data as Review[];
  const authorIds = [...new Set(reviews.map((review) => review.author_id))];
  const authorsResult = authorIds.length
    ? await supabase.from('profiles').select('id, display_name, avatar_path').in('id', authorIds)
    : { data: [], error: null };
  if (authorsResult.error) throw authorsResult.error;
  const authors = new Map(authorsResult.data.map((author) => [author.id, author]));
  const stats = statsResult.data[0];
  return {
    profile: profileResult.data,
    averageRating: Number(stats?.average_rating ?? 0),
    reviewCount: Number(stats?.review_count ?? 0),
    completedSales: Number(stats?.completed_sales ?? 0),
    reviews: reviews.map((review) => {
      const author = authors.get(review.author_id);
      return { ...review, author: { id: review.author_id, name: author?.display_name ?? 'Membre LocalDeals', avatarPath: author?.avatar_path ?? null } };
    }),
    listings,
  };
}

export async function submitReport(
  reporterId: string,
  targetType: 'user' | 'listing' | 'message',
  targetId: string,
  reason: ReportReason,
  details: string,
  development = false,
): Promise<void> {
  const cleanDetails = details.trim();
  if (cleanDetails && (cleanDetails.length < 5 || cleanDetails.length > 1000)) throw new Error('Ajoutez entre 5 et 1 000 caractères de précision.');
  if (!development) {
    const { error } = await supabase.rpc('submit_report', {
      p_target_type: targetType,
      p_target_id: targetId,
      p_reason: reason,
      p_details: cleanDetails || null,
    });
    if (error) throw error;
    return;
  }
  if (targetType === 'user' && targetId === reporterId) throw new Error('Vous ne pouvez pas signaler votre propre profil.');
  const report: Report = {
    id: randomUUID(), reporter_id: reporterId,
    reported_user_id: targetType === 'user' ? targetId : null,
    listing_id: targetType === 'listing' ? targetId : null,
    message_id: targetType === 'message' ? targetId : null,
    reason, details: cleanDetails || null, status: 'open',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  const reports = getCachedValue<Report[]>(cacheKeys.localReports) ?? [];
  setCachedValue(cacheKeys.localReports, [report, ...reports]);
}
