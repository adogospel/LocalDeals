import type { ListingCondition } from '@/types/database';

import type { Listing } from './mock-listings';

export type ListingSort = 'newest' | 'price_asc' | 'price_desc';

export type ListingFilters = {
  query?: string;
  categoryId?: number | null;
  condition?: ListingCondition | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  city?: string | null;
  sort?: ListingSort;
};

function normalizeSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .trim();
}

export function matchesListingFilters(listing: Listing, filters: ListingFilters): boolean {
  const query = normalizeSearchValue(filters.query ?? '');
  if (query) {
    const searchableContent = normalizeSearchValue([
      listing.title,
      listing.description,
      listing.category,
      listing.city,
      listing.neighborhood,
    ].join(' '));
    if (!searchableContent.includes(query)) return false;
  }
  if (filters.categoryId != null && listing.categoryId !== filters.categoryId) return false;
  if (filters.condition != null && listing.conditionCode !== filters.condition) return false;
  if (filters.minPrice != null && listing.price < filters.minPrice) return false;
  if (filters.maxPrice != null && listing.price > filters.maxPrice) return false;
  if (filters.city != null && listing.city !== filters.city) return false;
  return true;
}

export function filterAndSortListings(items: Listing[], filters: ListingFilters): Listing[] {
  const filtered = items.filter((listing) => matchesListingFilters(listing, filters));
  if (filters.sort === 'price_asc') return [...filtered].sort((a, b) => a.price - b.price);
  if (filters.sort === 'price_desc') return [...filtered].sort((a, b) => b.price - a.price);
  return [...filtered].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}
