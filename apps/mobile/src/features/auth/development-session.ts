import type { Profile } from '@/types/database';

export type DevelopmentSession = {
  email: string;
  profile: Profile;
};

function displayNameFromEmail(email: string): string {
  const localPart = email.split('@')[0] ?? 'LocalDealer';
  const words = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`);

  return words.join(' ') || 'LocalDealer';
}

export function createDevelopmentSession(email: string): DevelopmentSession {
  const now = new Date().toISOString();

  return {
    email,
    profile: {
      id: `development:${email}`,
      display_name: displayNameFromEmail(email),
      avatar_path: null,
      city: 'Douala',
      neighborhood: 'Bonapriso',
      city_id: null,
      neighborhood_id: null,
      custom_city: 'Douala',
      custom_neighborhood: 'Bonapriso',
      preferred_language: 'fr',
      onboarding_completed: true,
      account_status: 'active',
      deleted_at: null,
      created_at: now,
      updated_at: now,
    },
  };
}
