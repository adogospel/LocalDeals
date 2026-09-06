import { describe, expect, it } from 'vitest';

import { isListingPurchasable, isListingVisibleInMarketplace } from './listing-status';

describe('listing status rules', () => {
  it('keeps published and reserved listings in the marketplace', () => {
    expect(isListingVisibleInMarketplace('published')).toBe(true);
    expect(isListingVisibleInMarketplace('reserved')).toBe(true);
  });

  it('removes sold, archived and draft listings from buyer feeds', () => {
    expect(isListingVisibleInMarketplace('sold')).toBe(false);
    expect(isListingVisibleInMarketplace('archived')).toBe(false);
    expect(isListingVisibleInMarketplace('draft')).toBe(false);
  });

  it('only allows offers while a listing is published', () => {
    expect(isListingPurchasable('sold')).toBe(false);
    expect(isListingPurchasable('reserved')).toBe(false);
    expect(isListingPurchasable('archived')).toBe(false);
    expect(isListingPurchasable('published')).toBe(true);
  });
});
