import { describe, expect, it } from 'vitest';

import { isDeletionConfirmationValid, parseConsentStatus } from './account-rules';
import { getLegalDocument, LEGAL_DOCUMENT_VERSION, SIGN_UP_LEGAL_CONSENTS } from './legal-documents';

describe('account data protection rules', () => {
  it('fails closed when a consent response is malformed', () => {
    expect(parseConsentStatus(null)).toEqual({
      hasRequiredConsents: false,
      requiredVersions: {},
    });
    expect(parseConsentStatus({ has_required_consents: 'yes' })).toEqual({
      hasRequiredConsents: false,
      requiredVersions: {},
    });
  });

  it('keeps only valid legal document versions from the server', () => {
    expect(parseConsentStatus({
      has_required_consents: true,
      required_versions: { terms: '2026-10-05', privacy: '2026-10-05', ignored: 42 },
    })).toEqual({
      hasRequiredConsents: true,
      requiredVersions: { terms: '2026-10-05', privacy: '2026-10-05' },
    });
  });

  it('requires the explicit deletion phrase while tolerating case and spaces', () => {
    expect(isDeletionConfirmationValid(' delete ')).toBe(true);
    expect(isDeletionConfirmationValid('DELETE')).toBe(true);
    expect(isDeletionConfirmationValid('SUPPRIMER')).toBe(false);
    expect(isDeletionConfirmationValid('')).toBe(false);
  });

  it('ships matching, readable legal versions in French and English', () => {
    expect(SIGN_UP_LEGAL_CONSENTS).toEqual({
      terms: LEGAL_DOCUMENT_VERSION,
      privacy: LEGAL_DOCUMENT_VERSION,
    });

    for (const language of ['fr', 'en']) {
      for (const type of ['terms', 'privacy'] as const) {
        const document = getLegalDocument(type, language);
        expect(document.version).toBe(LEGAL_DOCUMENT_VERSION);
        expect(document.sections.length).toBeGreaterThanOrEqual(5);
        expect(document.sections.every((section) => section.paragraphs.length > 0)).toBe(true);
      }
    }
  });
});
