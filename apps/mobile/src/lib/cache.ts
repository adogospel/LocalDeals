import 'expo-sqlite/localStorage/install';

const PREFIX = 'localdeals:';

export const cacheKeys = {
  language: `${PREFIX}language`,
  lastPhone: `${PREFIX}last-phone`,
  profileDraft: `${PREFIX}profile-draft`,
  developmentSession: `${PREFIX}development-session`,
  localListings: `${PREFIX}development-listings`,
  localFavorites: `${PREFIX}development-favorites`,
  localConversations: `${PREFIX}development-conversations`,
  localMessages: `${PREFIX}development-messages`,
  localOffers: `${PREFIX}development-offers`,
  localDeals: `${PREFIX}development-deals`,
  localNotifications: `${PREFIX}development-notifications`,
  localReviews: `${PREFIX}development-reviews`,
  localReports: `${PREFIX}development-reports`,
  listingDraft: (userId: string) => `${PREFIX}listing-draft:${userId}`,
} as const;

export function getCachedValue<T>(key: string): T | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export function setCachedValue<T>(key: string, value: T): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A full device should not block the main user journey.
  }
}

export function removeCachedValue(key: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  } catch {
    // Cache cleanup is best effort.
  }
}
