import { describe, expect, it } from 'vitest';

import type { Offer } from '@/types/database';

import { getOfferActions, normalizeMessage, parseOfferAmount } from './messaging-rules';

const pendingOffer: Offer = {
  id: 'offer-1',
  conversation_id: 'conversation-1',
  listing_id: 'listing-1',
  buyer_id: 'buyer-1',
  seller_id: 'seller-1',
  amount: 250_000,
  status: 'pending',
  responded_at: null,
  created_at: '2026-08-29T12:00:00.000Z',
  updated_at: '2026-08-29T12:00:00.000Z',
};

describe('messaging rules', () => {
  it('normalizes a valid message', () => {
    expect(normalizeMessage('  Bonjour !  ')).toBe('Bonjour !');
  });

  it('rejects empty and oversized messages', () => {
    expect(() => normalizeMessage('   ')).toThrow();
    expect(() => normalizeMessage('a'.repeat(2001))).toThrow();
  });

  it('parses a formatted offer amount', () => {
    expect(parseOfferAmount('300 000 FCFA')).toBe(300_000);
  });

  it('rejects invalid offer amounts', () => {
    expect(() => parseOfferAmount('50')).toThrow();
    expect(() => parseOfferAmount(1_000_000_001)).toThrow();
  });

  it('only lets the seller respond to a pending offer', () => {
    expect(getOfferActions('seller', 'seller-1', pendingOffer)).toEqual({ canRespond: true, canCancel: false });
    expect(getOfferActions('seller', 'buyer-1', pendingOffer).canRespond).toBe(false);
  });

  it('only lets the originating buyer cancel a pending offer', () => {
    expect(getOfferActions('buyer', 'buyer-1', pendingOffer)).toEqual({ canRespond: false, canCancel: true });
    expect(getOfferActions('buyer', 'seller-1', pendingOffer).canCancel).toBe(false);
    expect(getOfferActions('buyer', 'buyer-1', { ...pendingOffer, status: 'accepted' }).canCancel).toBe(false);
  });
});
