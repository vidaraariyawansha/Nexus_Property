/**
 * Generates dynamic initials fallback from a full name according to naming standards.
 * Examples:
 *  - "Victoria Vance" -> "VV"
 *  - "Akila S.P.D."   -> "AS"
 *  - "Silva Perera"   -> "SP"
 *  - "Admin"          -> "AD"
 */
export function getInitials(name?: string | null): string {
  if (!name || typeof name !== 'string') return 'NP';

  // Replace punctuation like dots, dashes with space, then split into words
  const clean = name.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
  const words = clean.split(/\s+/).filter(Boolean);

  if (words.length === 0) return 'NP';
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  // First letters of the first two significant parts
  return (words[0][0] + words[1][0]).toUpperCase();
}
