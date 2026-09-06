import type { ConversationRole } from './messaging-service';
import type { Offer } from '@/types/database';

export const MAX_MESSAGE_LENGTH = 2000;
export const MIN_OFFER_AMOUNT = 100;
export const MAX_OFFER_AMOUNT = 1_000_000_000;

export function normalizeMessage(value: string): string {
  const message = value.trim();
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    throw new Error('Le message doit contenir entre 1 et 2 000 caractères.');
  }
  return message;
}

export function parseOfferAmount(value: string | number): number {
  const amount = typeof value === 'number' ? value : Number(value.replace(/\D/g, ''));
  if (!Number.isInteger(amount) || amount < MIN_OFFER_AMOUNT || amount > MAX_OFFER_AMOUNT) {
    throw new Error('Saisissez un montant valide.');
  }
  return amount;
}

export function getOfferActions(role: ConversationRole, userId: string, offer: Offer) {
  const pending = offer.status === 'pending';
  return {
    canRespond: pending && role === 'seller' && offer.seller_id === userId,
    canCancel: pending && role === 'buyer' && offer.buyer_id === userId,
  };
}
