/**
 * Sri Lankan Utilities Aggregator for Frontend Components
 */
import { isValidSriLankanPhone, normalizeSriLankanPhone, getWhatsAppNumber } from './sriLankaPhone';
import { formatDateLK, formatTimeLK, formatDateTimeLK } from './dateTime';
import { formatCurrency, formatPerSqFt } from './currency';

export { isValidSriLankanPhone, normalizeSriLankanPhone, getWhatsAppNumber };

export const formatSLDate = formatDateLK;
export const formatSLTime = formatTimeLK;
export const formatSLDateTime = formatDateTimeLK;

export function formatLKR(amount: number): string {
  return formatCurrency(amount);
}

export { formatCurrency, formatPerSqFt };
