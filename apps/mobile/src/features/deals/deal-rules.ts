import type { Deal, Review } from '@/types/database';

export function canConfirmDeal(deal: Deal, userId: string): boolean {
  if (deal.status !== 'pending_handover') return false;
  if (deal.buyer_id === userId) return deal.buyer_confirmed_at === null;
  if (deal.seller_id === userId) return deal.seller_confirmed_at === null;
  return false;
}

export function canCancelDeal(deal: Deal, userId: string): boolean {
  return deal.status === 'pending_handover'
    && [deal.buyer_id, deal.seller_id].includes(userId)
    && deal.buyer_confirmed_at === null
    && deal.seller_confirmed_at === null;
}

export function canReviewDeal(deal: Deal, userId: string, reviews: Review[]): boolean {
  return deal.status === 'completed'
    && [deal.buyer_id, deal.seller_id].includes(userId)
    && !reviews.some((review) => review.deal_id === deal.id && review.author_id === userId);
}

export function validateReview(score: number, comment: string): { score: number; comment: string | null } {
  const cleanComment = comment.trim();
  if (!Number.isInteger(score) || score < 1 || score > 5) throw new Error('La note doit être comprise entre 1 et 5.');
  if (cleanComment && (cleanComment.length < 3 || cleanComment.length > 500)) {
    throw new Error('Le commentaire doit contenir entre 3 et 500 caractères.');
  }
  return { score, comment: cleanComment || null };
}
