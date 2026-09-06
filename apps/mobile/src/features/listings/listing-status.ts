import type { ListingStatus } from '@/types/database';

export function isListingVisibleInMarketplace(status?: ListingStatus): boolean {
  return status === undefined || status === 'published' || status === 'reserved';
}

export function isListingPurchasable(status?: ListingStatus): boolean {
  return status === undefined || status === 'published';
}
