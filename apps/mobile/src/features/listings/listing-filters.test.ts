import { describe, expect, it } from 'vitest';

import { listings } from './mock-listings';
import { filterAndSortListings } from './listing-filters';

describe('marketplace listing filters', () => {
  it('filters development listings by category', () => {
    const phones = filterAndSortListings(listings, { categoryId: 1 });
    expect(phones.map((listing) => listing.id)).toEqual(['iphone-13-pro']);
  });

  it('filters by condition and inclusive price range', () => {
    const results = filterAndSortListings(listings, {
      condition: 'like_new',
      minPrice: 28000,
      maxPrice: 50000,
    });
    expect(results.map((listing) => listing.id)).toEqual(['nike-air-max', 'sac-cuir']);
  });

  it('searches titles, categories and locations without requiring accents', () => {
    expect(filterAndSortListings(listings, { query: 'telephone' })[0]?.id).toBe('iphone-13-pro');
    expect(filterAndSortListings(listings, { query: 'yaounde' })).toHaveLength(2);
  });

  it('sorts prices without mutating the source collection', () => {
    const initialFirst = listings[0].id;
    const sorted = filterAndSortListings(listings, { sort: 'price_asc' });
    expect(sorted[0].id).toBe('sac-cuir');
    expect(listings[0].id).toBe(initialFirst);
  });
});
