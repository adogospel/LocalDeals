import { describe, expect, it } from 'vitest';

import type { Deal, Review } from '@/types/database';

import { canCancelDeal, canConfirmDeal, canReviewDeal, validateReview } from './deal-rules';

const deal: Deal = {
  id: 'deal-1', listing_id: 'listing-1', conversation_id: 'conversation-1', offer_id: 'offer-1',
  buyer_id: 'buyer-1', seller_id: 'seller-1', amount: 200000, status: 'pending_handover',
  buyer_confirmed_at: null, seller_confirmed_at: null, completed_at: null, cancelled_at: null,
  cancelled_by: null, created_at: '2026-08-29T00:00:00Z', updated_at: '2026-08-29T00:00:00Z',
};

describe('deal rules', () => {
  it('lets each participant confirm once', () => {
    expect(canConfirmDeal(deal, 'buyer-1')).toBe(true);
    expect(canConfirmDeal({ ...deal, buyer_confirmed_at: deal.created_at }, 'buyer-1')).toBe(false);
    expect(canConfirmDeal(deal, 'stranger')).toBe(false);
  });

  it('blocks cancellation after either confirmation', () => {
    expect(canCancelDeal(deal, 'seller-1')).toBe(true);
    expect(canCancelDeal({ ...deal, seller_confirmed_at: deal.created_at }, 'buyer-1')).toBe(false);
  });

  it('allows one review per participant after completion', () => {
    const completed = { ...deal, status: 'completed' as const };
    expect(canReviewDeal(completed, 'buyer-1', [])).toBe(true);
    expect(canReviewDeal(completed, 'buyer-1', [{ deal_id: deal.id, author_id: 'buyer-1' } as Review])).toBe(false);
  });

  it('validates review scores and comments', () => {
    expect(validateReview(5, '  Excellent échange  ')).toEqual({ score: 5, comment: 'Excellent échange' });
    expect(() => validateReview(0, 'Bien')).toThrow();
    expect(() => validateReview(4, 'x')).toThrow();
  });
});
