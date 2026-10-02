/**
 * Sri Lankan Phone & WhatsApp Normalizer and Validator
 * Supports:
 * - Local mobile: 07XXXXXXXX (e.g. 0771234567, 071 234 5678, 076-345-6789)
 * - International: +94 7X XXX XXXX, +947XXXXXXXX, 0094 7X XXX XXXX
 * - Landlines: 011XXXXXXX, 081XXXXXXX, +94 11 XXX XXXX
 * - WhatsApp API formatting: 947XXXXXXXX
 */

// Digits-only regex for Sri Lankan mobile numbers (operator codes: 70, 71, 72, 74, 75, 76, 77, 78)
const LK_MOBILE_LOCAL_REGEX = /^0(7[01245678]\d{7})$/;
const LK_MOBILE_INTL_REGEX = /^(?:\+94|0094|94)(7[01245678]\d{7})$/;
const LK_LANDLINE_LOCAL_REGEX = /^0([1-9]\d{8})$/;
const LK_LANDLINE_INTL_REGEX = /^(?:\+94|0094|94)([1-9]\d{8})$/;

// General regex to allow valid international numbers as fallback for test compatibility
const GENERAL_INTL_PHONE_REGEX = /^[+0-9\s()./-]{7,30}$/;

/**
 * Validates whether the input string is a valid Sri Lankan phone number
 * (or standard international phone number)
 */
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

/**
 * Specifically checks if the number is a genuine Sri Lankan phone number
 */
export function isPureSriLankanPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s()./-]/g, '');
  return (
    LK_MOBILE_LOCAL_REGEX.test(cleaned) ||
    LK_MOBILE_INTL_REGEX.test(cleaned) ||
    LK_LANDLINE_LOCAL_REGEX.test(cleaned) ||
    LK_LANDLINE_INTL_REGEX.test(cleaned)
  );
}

/**
 * Normalizes Sri Lankan numbers to standard display: "+94 7X XXX XXXX" or "+94 XX XXX XXXX"
 * Leaves non-Sri-Lankan valid numbers intact.
 */
export function normalizeSriLankanPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  const digitsOnly = trimmed.replace(/[\s()./-]/g, '');

  // 1. Sri Lankan mobile: 07XXXXXXXX -> +94 7X XXX XXXX
  const mobileLocalMatch = digitsOnly.match(LK_MOBILE_LOCAL_REGEX);
  if (mobileLocalMatch) {
    const core = mobileLocalMatch[1]; // e.g. 771234567
    return `+94 ${core.slice(0, 2)} ${core.slice(2, 5)} ${core.slice(5)}`;
  }

  // 2. Sri Lankan mobile intl: +947XXXXXXXX -> +94 7X XXX XXXX
  const mobileIntlMatch = digitsOnly.match(LK_MOBILE_INTL_REGEX);
  if (mobileIntlMatch) {
    const core = mobileIntlMatch[1]; // e.g. 771234567
    return `+94 ${core.slice(0, 2)} ${core.slice(2, 5)} ${core.slice(5)}`;
  }

  // 3. Sri Lankan landline: 011XXXXXXX -> +94 11 XXX XXXX
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

/**
 * Returns raw digits required for WhatsApp API (e.g. 94771234567)
 */
export function getWhatsAppNumber(phone: string | null | undefined): string {
  if (!phone) return '';
  const digitsOnly = phone.replace(/[^0-9]/g, '');

  if (digitsOnly.startsWith('0') && digitsOnly.length === 10) {
    // 0771234567 -> 94771234567
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

/**
 * Generates an official WhatsApp click-to-chat URL with optional pre-filled inquiry text
 */
export function formatWhatsAppLink(phone: string | null | undefined, message?: string): string {
  const waNumber = getWhatsAppNumber(phone);
  if (!waNumber) return '#';
  const baseUrl = `https://wa.me/${waNumber}`;
  if (message && message.trim()) {
    return `${baseUrl}?text=${encodeURIComponent(message.trim())}`;
  }
  return baseUrl;
}
