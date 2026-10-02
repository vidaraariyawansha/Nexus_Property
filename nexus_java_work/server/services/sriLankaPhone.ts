/**
 * Server-side Sri Lankan Phone Normalizer & Validator
 */

const LK_MOBILE_LOCAL_REGEX = /^0(7[01245678]\d{7})$/;
const LK_MOBILE_INTL_REGEX = /^(?:\+94|0094|94)(7[01245678]\d{7})$/;
const LK_LANDLINE_LOCAL_REGEX = /^0([1-9]\d{8})$/;
const LK_LANDLINE_INTL_REGEX = /^(?:\+94|0094|94)([1-9]\d{8})$/;
const GENERAL_INTL_PHONE_REGEX = /^[+0-9\s()./-]{7,30}$/;

export function isValidSriLankanPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s()./-]/g, '');
  if (LK_MOBILE_LOCAL_REGEX.test(cleaned) || LK_MOBILE_INTL_REGEX.test(cleaned)) {
    return true;
  }
  if (LK_LANDLINE_LOCAL_REGEX.test(cleaned) || LK_LANDLINE_INTL_REGEX.test(cleaned)) {
    return true;
  }
  return GENERAL_INTL_PHONE_REGEX.test(phone.trim());
}

export function normalizeSriLankanPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  const digitsOnly = trimmed.replace(/[\s()./-]/g, '');

  const mobileLocalMatch = digitsOnly.match(LK_MOBILE_LOCAL_REGEX);
  if (mobileLocalMatch) {
    const core = mobileLocalMatch[1];
    return `+94 ${core.slice(0, 2)} ${core.slice(2, 5)} ${core.slice(5)}`;
  }

  const mobileIntlMatch = digitsOnly.match(LK_MOBILE_INTL_REGEX);
  if (mobileIntlMatch) {
    const core = mobileIntlMatch[1];
    return `+94 ${core.slice(0, 2)} ${core.slice(2, 5)} ${core.slice(5)}`;
  }

  const landlineLocalMatch = digitsOnly.match(LK_LANDLINE_LOCAL_REGEX);
  if (landlineLocalMatch) {
    const core = landlineLocalMatch[1];
    return `+94 ${core.slice(0, 2)} ${core.slice(2, 5)} ${core.slice(5)}`;
  }

  const landlineIntlMatch = digitsOnly.match(LK_LANDLINE_INTL_REGEX);
  if (landlineIntlMatch) {
    const core = landlineIntlMatch[1];
    return `+94 ${core.slice(0, 2)} ${core.slice(2, 5)} ${core.slice(5)}`;
  }

  return trimmed;
}

export function getWhatsAppNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  const digitsOnly = phone.replace(/[^0-9]/g, '');

  if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
    return `94${digitsOnly.slice(1)}`;
  }
  if (digitsOnly.startsWith('94') && digitsOnly.length === 11) {
    return digitsOnly;
  }
  if (digitsOnly.startsWith('0094') && digitsOnly.length === 13) {
    return digitsOnly.slice(2);
  }
  return digitsOnly;
}

export function formatWhatsAppLink(phone: string | null | undefined, message?: string): string {
  const waNumber = getWhatsAppNumber(phone);
  if (!waNumber) return '#';
  const baseUrl = `https://wa.me/${waNumber}`;
  if (message && message.trim()) {
    return `${baseUrl}?text=${encodeURIComponent(message.trim())}`;
  }
  return baseUrl;
}
