/**
 * Sri Lankan Utilities Aggregator for Server Services
 */
import { isValidSriLankanPhone, normalizeSriLankanPhone, getWhatsAppNumber } from './sriLankaPhone.js';

export { isValidSriLankanPhone, normalizeSriLankanPhone, getWhatsAppNumber };

export function formatLKR(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'LKR 0';
  return `LKR ${amount.toLocaleString()}`;
}

export function formatSLDate(dateValue: number | string | Date | null | undefined): string {
  if (!dateValue) return '';
  const d = typeof dateValue === 'string' || typeof dateValue === 'number' ? new Date(dateValue) : dateValue;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatSLTime(dateValue: number | string | Date | null | undefined): string {
  if (!dateValue) return '';
  const d = typeof dateValue === 'string' || typeof dateValue === 'number' ? new Date(dateValue) : dateValue;
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Colombo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

export function formatSLDateTime(dateValue: number | string | Date | null | undefined): string {
  if (!dateValue) return '';
  const datePart = formatSLDate(dateValue);
  const timePart = formatSLTime(dateValue);
  return `${datePart} ${timePart}`;
}
