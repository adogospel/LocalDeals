import { describe, expect, it } from 'vitest';

import { listingSchema, parsePriceInput } from './listing-schema';

const validListing = {
  title: 'iPhone 13 Pro',
  description: 'Téléphone très bien entretenu avec sa boîte et son chargeur.',
  price: 345000,
  categoryId: 1,
  condition: 'good' as const,
  cityId: 1,
  cityName: 'Douala',
  customCity: '',
  neighborhoodId: 1,
  neighborhoodName: 'Bonapriso',
  customNeighborhood: '',
  photos: [{ uri: 'file://photo.jpg', fileName: 'photo.jpg', mimeType: 'image/jpeg', fileSize: 1200, width: 1200, height: 1200 }],
};

describe('listing validation', () => {
  it('parses locally formatted FCFA prices', () => {
    expect(parsePriceInput('345 000')).toBe(345000);
    expect(parsePriceInput('34O000')).toBeNull();
  });

  it('accepts a complete listing and requires a photo', () => {
    expect(listingSchema.safeParse(validListing).success).toBe(true);
    expect(listingSchema.safeParse({ ...validListing, photos: [] }).success).toBe(false);
  });

  it('requires a custom location when reference ids are absent', () => {
    const result = listingSchema.safeParse({
      ...validListing,
      cityId: null,
      neighborhoodId: null,
      customCity: '',
      customNeighborhood: '',
    });
    expect(result.success).toBe(false);
  });
});
