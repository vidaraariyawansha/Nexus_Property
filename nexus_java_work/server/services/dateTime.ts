/**
 * Server-side Sri Lankan Date/Time Service (Asia/Colombo timezone)
 */

export const SRI_LANKA_TIMEZONE = 'Asia/Colombo';

export function formatDateLK(dateValue: number | string | Date): string {
  const d = typeof dateValue === 'string' || typeof dateValue === 'number' ? new Date(dateValue) : dateValue;
  if (isNaN(d.getTime())) return '';

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: SRI_LANKA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateTimeLK(dateValue: number | string | Date): string {
  const d = typeof dateValue === 'string' || typeof dateValue === 'number' ? new Date(dateValue) : dateValue;
  if (isNaN(d.getTime())) return '';

  const datePart = new Intl.DateTimeFormat('en-GB', {
    timeZone: SRI_LANKA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);

  const timePart = new Intl.DateTimeFormat('en-US', {
    timeZone: SRI_LANKA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);

  return `${datePart} ${timePart}`;
}
