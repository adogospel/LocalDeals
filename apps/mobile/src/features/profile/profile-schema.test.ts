import { describe, expect, it } from 'vitest';

import { profileSchema } from './profile-schema';

describe('profileSchema', () => {
  it('accepts a complete LocalDeals profile', () => {
    expect(
      profileSchema.safeParse({
        displayName: 'Amina',
        cityId: 1,
        cityName: 'Douala',
        customCity: '',
        neighborhoodId: 2,
        neighborhoodName: 'Bonapriso',
        customNeighborhood: '',
        preferredLanguage: 'fr',
      }).success,
    ).toBe(true);
  });

  it('rejects an empty display name and city', () => {
    expect(
      profileSchema.safeParse({
        displayName: ' ',
        cityId: null,
        cityName: '',
        customCity: '',
        neighborhoodId: null,
        neighborhoodName: '',
        customNeighborhood: '',
        preferredLanguage: 'fr',
      }).success,
    ).toBe(false);
  });
});
