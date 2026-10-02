/**
 * Sri Lankan Land and Floor Area Units Utility
 * 
 * Standard Conversions:
 * - 1 Perch = 272.25 sq ft
 * - 1 Acre = 160 Perches = 43,560 sq ft
 * - 1 Rood = 40 Perches (historical survey unit)
 */

export const SQFT_PER_PERCH = 272.25;
export const PERCHES_PER_ACRE = 160;
export const SQFT_PER_ACRE = 43560;

/**
 * Converts square feet into Sri Lankan Perches with 1 decimal precision
 */
export function sqFtToPerches(sqFt: number): number {
  if (!sqFt || sqFt <= 0) return 0;
  return Math.round((sqFt / SQFT_PER_PERCH) * 10) / 10;
}

/**
 * Converts perches to square feet
 */
export function perchesToSqFt(perches: number): number {
  if (!perches || perches <= 0) return 0;
  return Math.round(perches * SQFT_PER_PERCH);
}

/**
 * Formats property area appropriate to its property type.
 * - LAND: Displays "12 Perches (3,267 sq ft)" or "X Acres"
 * - HOUSE / VILLA: Displays "2,100 sq ft" (plus land size if land specified)
 * - APARTMENT / CONDO / COMMERCIAL: Displays "1,850 sq ft"
 */
export function formatPropertyArea(
  areaSqFt: number,
  propertyType?: string,
  options?: { compact?: boolean; lang?: string }
): string {
  if (!areaSqFt || isNaN(areaSqFt) || areaSqFt <= 0) {
    return '0 sq ft';
  }

  const isLand = propertyType === 'LAND';

  if (isLand) {
    const perches = sqFtToPerches(areaSqFt);
    if (perches >= PERCHES_PER_ACRE) {
      const acres = Math.round((perches / PERCHES_PER_ACRE) * 10) / 10;
      if (options?.compact) return `${acres} Acres`;
      return `${acres} Acres (${perches} Perches)`;
    }
    if (options?.compact) return `${perches} Perches`;
    return `${perches} Perches (${areaSqFt.toLocaleString()} sq ft)`;
  }

  // Building or residential residence
  return `${areaSqFt.toLocaleString()} sq ft`;
}
