/**
 * Sri Lankan Currency & Monetary Formatter
 * Primary Display Convention: LKR 25,000,000
 * Local Symbols: Rs., රු., ரூ.
 */

export function formatCurrency(
  amount: number,
  _location?: string,
  options?: { symbol?: 'LKR' | 'Rs' | 'රු' | 'ரூ'; compact?: boolean; lang?: string }
): string {
  if (amount === undefined || amount === null || isNaN(amount)) return 'LKR 0';

  // If compact display requested (e.g. "LKR 38.5M")
  if (options?.compact) {
    if (amount >= 1000000) {
      const millions = Math.round((amount / 1000000) * 10) / 10;
      return `LKR ${millions}M`;
    }
  }

  // Symbol handling
  let prefix = 'LKR ';
  if (options?.lang === 'si' || options?.symbol === 'රු') {
    prefix = 'රු. ';
  } else if (options?.lang === 'ta' || options?.symbol === 'ரூ') {
    prefix = 'ரூ. ';
  } else if (options?.symbol === 'Rs') {
    prefix = 'Rs. ';
  }

  return `${prefix}${amount.toLocaleString()}`;
}

export function formatPerSqFt(
  amount: number,
  area: number,
  _location?: string,
  propertyType?: string
): string {
  if (!area || area <= 0 || !amount || amount <= 0) return '';

  const isLand = propertyType === 'LAND';
  if (isLand) {
    // 1 perch = 272.25 sq ft
    const perches = area / 272.25;
    if (perches > 0) {
      const perPerch = Math.round(amount / perches);
      return `LKR ${perPerch.toLocaleString()} / Perch`;
    }
  }

  const unit = Math.round(amount / area);
  return `LKR ${unit.toLocaleString()}/sq ft`;
}
