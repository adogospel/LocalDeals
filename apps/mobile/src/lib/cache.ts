import './install-local-storage';

const PREFIX = 'localdeals:';

export const cacheKeys = {
  language: `${PREFIX}language`,
  lastPhone: `${PREFIX}last-phone`,
  profileDraft: `${PREFIX}profile-draft`,
  developmentSession: `${PREFIX}development-session`,
  localListings: `${PREFIX}development-listings`,
  localFavorites: `${PREFIX}development-favorites`,
  localConversations: `${PREFIX}development-conversations`,
  localConversationStates: `${PREFIX}development-conversation-states`,
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

export function clearCachedAccountData(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const keysToRemove: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(PREFIX) && key !== cacheKeys.language) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    // Account deletion already happened on the server; local cleanup is best effort.
  }
}
