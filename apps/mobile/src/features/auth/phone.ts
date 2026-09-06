export const CAMEROON_COUNTRY_CODE = '+237';

export function sanitizeLocalPhone(value: string): string {
  return value.replace(/\D/g, '').replace(/^237/, '').slice(0, 9);
}

export function formatLocalPhone(value: string): string {
  const local = sanitizeLocalPhone(value);
  return [local.slice(0, 3), local.slice(3, 6), local.slice(6, 9)].filter(Boolean).join(' ');
}

export function isValidCameroonMobile(value: string): boolean {
  return /^6\d{8}$/.test(sanitizeLocalPhone(value));
}

export function toE164Cameroon(value: string): string {
  const local = sanitizeLocalPhone(value);
  if (!isValidCameroonMobile(local)) {
    throw new Error('Le numéro doit contenir 9 chiffres et commencer par 6.');
  }
  return `${CAMEROON_COUNTRY_CODE}${local}`;
}

export function maskPhone(phone: string): string {
  const local = sanitizeLocalPhone(phone);
  if (local.length !== 9) return phone;
  return `${CAMEROON_COUNTRY_CODE} ${local.slice(0, 1)}•• •• ${local.slice(-4)}`;
}
