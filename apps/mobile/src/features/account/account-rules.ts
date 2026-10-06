import type { Json } from '@/types/database';

export type ConsentStatus = {
  hasRequiredConsents: boolean;
  requiredVersions: Record<string, string>;
};

type ConsentStatusPayload = {
  has_required_consents?: unknown;
  required_versions?: unknown;
};

export function parseConsentStatus(value: Json): ConsentStatus {
  const payload = (value && typeof value === 'object' && !Array.isArray(value)
    ? value
    : {}) as ConsentStatusPayload;
  const versions = payload.required_versions && typeof payload.required_versions === 'object'
    && !Array.isArray(payload.required_versions)
    ? Object.fromEntries(Object.entries(payload.required_versions).filter((entry): entry is [string, string] => (
      typeof entry[1] === 'string'
    )))
    : {};

  return {
    hasRequiredConsents: payload.has_required_consents === true,
    requiredVersions: versions,
  };
}

export function isDeletionConfirmationValid(value: string): boolean {
  return value.trim().toUpperCase() === 'DELETE';
}
