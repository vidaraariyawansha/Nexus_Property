/**
 * Server-side Currency & Monetary Formatting Service
 */

export function formatCurrencyLKR(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'LKR 0';
  return `LKR ${amount.toLocaleString()}`;
}

export function validatePriceLKR(price: number): boolean {
  return typeof price === 'number' && !isNaN(price) && price > 0;
}
