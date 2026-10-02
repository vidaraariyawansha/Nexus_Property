/**
 * Property Query Service - Deterministic Sri Lankan Real Estate Parser
 * Translates natural language into validated PropertySearchCriteria (SearchQuery).
 * Accurately normalizes Sri Lankan currency (Crore, Lakh, Million, LKR) and locations.
 */

import { PropertyType, SearchQuery } from '../../types/index.js';
import { PropertyQuery } from '../dto/aiAdvisorDto.js';
import { queryAll, queryOne } from '../../db/database.js';

// Comprehensive Sri Lankan Key Locations dictionary
const SRI_LANKAN_LOCATIONS: { name: string; aliases: string[] }[] = [
  // Colombo City & Postal Zones
  { name: 'Colombo 01', aliases: ['colombo 1', 'colombo 01', 'fort', 'echelon square'] },
  { name: 'Colombo 02', aliases: ['colombo 2', 'colombo 02', 'slave island', 'union place'] },
  { name: 'Colombo 03', aliases: ['colombo 3', 'colombo 03', 'kollupitiya', 'colpetty'] },
  { name: 'Colombo 04', aliases: ['colombo 4', 'colombo 04', 'bambalapitiya'] },
  { name: 'Colombo 05', aliases: ['colombo 5', 'colombo 05', 'havelock town', 'havelock city', 'kirulapone', 'narahenpita'] },
  { name: 'Colombo 06', aliases: ['colombo 6', 'colombo 06', 'wellawatte', 'pamankada'] },
  { name: 'Colombo 07', aliases: ['colombo 7', 'colombo 07', 'cinnamon gardens', 'ward place'] },
  { name: 'Colombo 08', aliases: ['colombo 8', 'colombo 08', 'borella'] },
  { name: 'Colombo 09', aliases: ['colombo 9', 'colombo 09', 'dematagoda'] },
  { name: 'Colombo 10', aliases: ['colombo 10', 'colombo 10', 'maradana', 'panchikawatte'] },
  { name: 'Colombo', aliases: ['colombo', 'greater colombo'] },

  // Key Western Province Suburbs
  { name: 'Nugegoda', aliases: ['nugegoda', 'stanley thilakarathne', 'delkanda', 'jubilee post'] },
  { name: 'Rajagiriya', aliases: ['rajagiriya', 'parliament road', 'welikada', 'obeysekerapura'] },
  { name: 'Battaramulla', aliases: ['battaramulla', 'pelawatta', 'palawatta', 'thalangama'] },
  { name: 'Thalawathugoda', aliases: ['thalawathugoda', 'talawathugoda'] },
  { name: 'Dehiwala', aliases: ['dehiwala', 'dehiwela', 'kawdana', 'kalubowila'] },
  { name: 'Mount Lavinia', aliases: ['mount lavinia', 'mt lavinia', 'hotel road', 'galkissa'] },
  { name: 'Moratuwa', aliases: ['moratuwa', 'bolgoda', 'bolgoda lake', 'lunawa', 'rawathawatte'] },
  { name: 'Kaduwela', aliases: ['kaduwela', 'korathota'] },
  { name: 'Malabe', aliases: ['malabe', 'thalahena', 'pothuarawa'] },
  { name: 'Kottawa', aliases: ['kottawa', 'pannipitiya', 'rukmalgama'] },
  { name: 'Maharagama', aliases: ['maharagama', 'navinna', 'pamunuwa'] },
  { name: 'Homagama', aliases: ['homagama', 'pitipana'] },

  // Gampaha District
  { name: 'Negombo', aliases: ['negombo', 'kochchikade', 'poruthota', 'dalupotha'] },
  { name: 'Gampaha', aliases: ['gampaha', 'yakkala'] },
  { name: 'Wattala', aliases: ['wattala', 'mabole', 'hendala'] },
  { name: 'Ja-Ela', aliases: ['ja-ela', 'ja ela', 'kandana'] },
  { name: 'Kelaniya', aliases: ['kelaniya', 'peliyagoda', 'dalugama'] },
  { name: 'Kiribathgoda', aliases: ['kiribathgoda', 'kadawatha'] },

  // Kalutara District
  { name: 'Kalutara', aliases: ['kalutara', 'nagoda'] },
  { name: 'Panadura', aliases: ['panadura', 'walana'] },
  { name: 'Bentota', aliases: ['bentota', 'aluthgama', 'beruwala'] },

  // Central Province
  { name: 'Kandy', aliases: ['kandy', 'hanthana', 'peradeniya', 'katugastota', 'kundasale', 'digana'] },
  { name: 'Nuwara Eliya', aliases: ['nuwara eliya', 'single tree hill', 'lake gregory', 'hatton'] },
  { name: 'Matale', aliases: ['matale', 'dambulla', 'sigiriya'] },

  // Southern Province
  { name: 'Galle', aliases: ['galle', 'galle fort', 'unawatuna', 'hikkaduwa', 'karapitiya'] },
  { name: 'Matara', aliases: ['matara', 'polhena', 'mirissa', 'weligama', 'dikwella'] },
  { name: 'Hambantota', aliases: ['hambantota', 'tangalle', 'tissamaharama'] },

  // Other Major Sri Lankan Cities / Districts
  { name: 'Kurunegala', aliases: ['kurunegala', 'kuliyapitiya'] },
  { name: 'Jaffna', aliases: ['jaffna', 'chundikuli', 'nallur', 'chavakachcheri'] },
  { name: 'Batticaloa', aliases: ['batticaloa', 'pasikudah'] },
  { name: 'Ella', aliases: ['ella', 'badulla', 'passara'] },
];

/**
 * Parses numeric monetary values with Sri Lankan units (crore, lakhs, million, k, LKR).
 * Examples:
 *   "25 million" -> 25,000,000
 *   "2.5 crore"   -> 25,000,000 (1 crore = 10 million)
 *   "15 lakhs"   -> 1,500,000  (1 lakh = 100,000)
 *   "25M"        -> 25,000,000
 *   "500k"       -> 500,000
 */
export function parseSriLankanPrice(text: string): number | null {
  if (!text) return null;
  const lower = text.toLowerCase().replace(/,/g, '');

  // 1. Crore pattern: e.g. "2.5 crore", "2 crore", "2.5 cr", "3 cr"
  const croreMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:crore|crores|cr)\b/i);
  if (croreMatch) {
    const val = parseFloat(croreMatch[1]);
    if (!isNaN(val) && val > 0) {
      return Math.round(val * 10000000);
    }
  }

  // 2. Lakhs pattern: e.g. "15 lakhs", "15 lakh", "15 lacs", "15 lac", "15 lk"
  const lakhMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:lakh|lakhs|lac|lacs|lk)\b/i);
  if (lakhMatch) {
    const val = parseFloat(lakhMatch[1]);
    if (!isNaN(val) && val > 0) {
      return Math.round(val * 100000);
    }
  }

  // 3. Million pattern: e.g. "30 million", "30m", "28.5 m", "25 million", "30 mil"
  const millionMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:million|mil|m)\b/i);
  if (millionMatch) {
    const val = parseFloat(millionMatch[1]);
    if (!isNaN(val) && val > 0) {
      return Math.round(val * 1000000);
    }
  }

  // 4. Thousand / k pattern: e.g. "500k", "500 thousand"
  const kMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:thousand|k)\b/i);
  if (kMatch) {
    const val = parseFloat(kMatch[1]);
    if (!isNaN(val) && val > 0) {
      return Math.round(val * 1000);
    }
  }

  // 5. Explicit currency with digits: e.g. "lkr 30000000", "rs. 25000000"
  const lkrMatch = lower.match(/(?:lkr|rs\.?)\s*(\d{5,})/i);
  if (lkrMatch) {
    const val = parseInt(lkrMatch[1], 10);
    if (!isNaN(val) && val > 0) return val;
  }

  // 6. Large bare integer (>= 100,000)
  const bareNumberMatch = lower.match(/\b(\d{6,})\b/);
  if (bareNumberMatch) {
    const val = parseInt(bareNumberMatch[1], 10);
    if (!isNaN(val) && val > 0) return val;
  }

  return null;
}

/**
 * Extracts price boundaries (minPrice, maxPrice) from natural phrasing.
 */
export function extractPriceRange(text: string): { minPrice?: number; maxPrice?: number } {
  const lower = text.toLowerCase();
  let minPrice: number | undefined;
  let maxPrice: number | undefined;

  // "between X and Y" or "from X to Y"
  const betweenMatch = lower.match(/(?:between|from)\s+(.+?)\s+(?:and|to)\s+(.+?)(?:\s+(?:lkr|in|with|for)|\.|$)/i);
  if (betweenMatch) {
    const val1 = parseSriLankanPrice(betweenMatch[1]);
    const val2 = parseSriLankanPrice(betweenMatch[2]);
    if (val1 && val2) {
      minPrice = Math.min(val1, val2);
      maxPrice = Math.max(val1, val2);
      return { minPrice, maxPrice };
    }
  }

  // Max price triggers: "under 30M", "below 25 million", "less than 25M", "within 30m", "up to 30M", "max 30M", "budget 30M"
  const maxMatch = lower.match(/(?:under|below|less\s+than|within|up\s+to|max|maximum|budget(?:\s+of)?)\s+([^\s,]+(?:\s+(?:million|crore|lakhs|lakh|cr|lac|lacs|m|k|lkr))?)/i);
  if (maxMatch) {
    const parsed = parseSriLankanPrice(maxMatch[1]) || parseSriLankanPrice(maxMatch[0]);
    if (parsed) maxPrice = parsed;
  }

  // Min price triggers: "above 20M", "over 20 million", "more than 20M", "min 20M", "at least 20M"
  const minMatch = lower.match(/(?:above|over|more\s+than|min|minimum|at\s+least|starting\s+from)\s+([^\s,]+(?:\s+(?:million|crore|lakhs|lakh|cr|lac|lacs|m|k|lkr))?)/i);
  if (minMatch) {
    const parsed = parseSriLankanPrice(minMatch[1]) || parseSriLankanPrice(minMatch[0]);
    if (parsed) minPrice = parsed;
  }

  // Fallback: If no max or min trigger keyword was matched but text contains a price like "for 25M" or "25M", treat as max price ceiling if preceded by "under/in/for"
  if (!maxPrice && !minPrice) {
    const generalPriceMatch = lower.match(/(?:for|around|approx(?:\.)?)\s+([^\s,]+(?:\s+(?:million|crore|lakhs|lakh|cr|lac|lacs|m|k))?)/i);
    if (generalPriceMatch) {
      const parsed = parseSriLankanPrice(generalPriceMatch[1]);
      if (parsed) maxPrice = parsed;
    }
  }

  return { minPrice, maxPrice };
}

/**
 * Extracts normalized Sri Lankan location from query text.
 */
export function extractLocation(text: string): string | undefined {
  const lower = text.toLowerCase();

  for (const loc of SRI_LANKAN_LOCATIONS) {
    for (const alias of loc.aliases) {
      // Word boundary match to prevent substrings like "fort" in "comfortable"
      const regex = new RegExp(`\\b${alias.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (regex.test(lower)) {
        return loc.name;
      }
    }
  }

  // Also check provinces
  const provinces = ['Western', 'Central', 'Southern', 'Northern', 'Eastern', 'North Western', 'North Central', 'Uva', 'Sabaragamuwa'];
  for (const prov of provinces) {
    const provRegex = new RegExp(`\\b${prov.toLowerCase()}(?:\\s+province)?\\b`, 'i');
    if (provRegex.test(lower)) {
      return prov;
    }
  }

  return undefined;
}

/**
 * Extracts PropertyType from natural terms.
 */
export function extractPropertyType(text: string): PropertyType | undefined {
  const lower = text.toLowerCase();

  if (/\b(?:apartment|apartments|flat|flats|studio)\b/i.test(lower)) return 'APARTMENT';
  if (/\b(?:condo|condos|condominium|condominiums|penthouse|penthouses)\b/i.test(lower)) return 'CONDO';
  if (/\b(?:villa|villas|bungalow|bungalows|chalet|chalets|lodge)\b/i.test(lower)) return 'VILLA';
  if (/\b(?:land|lands|plot|plots|parcel|parcels|perch|perches|acre|acres|estate|estates)\b/i.test(lower)) {
    // Avoid classifying "commercial office building" as land if "commercial" takes precedence
    if (!/\bcommercial\b/i.test(lower)) return 'LAND';
  }
  if (/\b(?:commercial|office|offices|headquarters|retail|warehouse|shop)\b/i.test(lower)) return 'COMMERCIAL';
  if (/\b(?:house|houses|home|homes|townhouse|townhouses|residence|residences)\b/i.test(lower)) return 'HOUSE';

  return undefined;
}

/**
 * Extracts bedroom criteria.
 * e.g. "3-bedroom", "3 bedroom", "3 bed", "3 beds", "at least 3 bedrooms"
 */
export function extractBedrooms(text: string): number | undefined {
  const lower = text.toLowerCase();

  const bedMatch = lower.match(/(?:at\s+least|minimum|min)?\s*(\d+)\s*(?:-| )?\s*(?:bedroom|bedrooms|bed|beds)\b/i);
  if (bedMatch) {
    const beds = parseInt(bedMatch[1], 10);
    if (!isNaN(beds) && beds >= 0) return beds;
  }

  if (/\b(?:single\s+bedroom|1\s+bedroom|one\s+bedroom)\b/i.test(lower)) return 1;
  if (/\b(?:two\s+bedroom|2\s+bedroom)\b/i.test(lower)) return 2;
  if (/\b(?:three\s+bedroom|3\s+bedroom)\b/i.test(lower)) return 3;
  if (/\b(?:four\s+bedroom|4\s+bedroom)\b/i.test(lower)) return 4;
  if (/\b(?:five\s+bedroom|5\s+bedroom)\b/i.test(lower)) return 5;

  return undefined;
}

/**
 * Extracts amenities mentioned in query.
 */
export function extractAmenities(text: string): string[] {
  const lower = text.toLowerCase();
  const amenities: string[] = [];

  if (/\b(?:parking|garage|car\s+park|covered\s+parking)\b/i.test(lower)) amenities.push('Parking');
  if (/\b(?:pool|swimming\s+pool|plunge\s+pool)\b/i.test(lower)) amenities.push('Pool');
  if (/\b(?:solar|solar\s+panels|solar\s+power)\b/i.test(lower)) amenities.push('Solar Panels');
  if (/\b(?:gym|fitness|gymnasium)\b/i.test(lower)) amenities.push('Fitness Center');
  if (/\b(?:garden|lawn|courtyard|landscaped)\b/i.test(lower)) amenities.push('Garden');
  if (/\b(?:security|24\/7\s+security|gated|guard)\b/i.test(lower)) amenities.push('Security');
  if (/\b(?:ocean\s+view|sea\s+view|beachfront|coastal)\b/i.test(lower)) amenities.push('Ocean View');
  if (/\b(?:balcony|terrace|verandah)\b/i.test(lower)) amenities.push('Balcony');
  if (/\b(?:backup\s+generator|generator)\b/i.test(lower)) amenities.push('Backup Generator');
  if (/\b(?:elevator|lift)\b/i.test(lower)) amenities.push('Elevator');
  if (/\b(?:fiber|high\s+speed\s+internet|wifi)\b/i.test(lower)) amenities.push('Fiber Internet');

  return amenities;
}

/**
 * Extracts sorting direction if explicitly mentioned.
 */
export function extractSortOrder(text: string): { sortBy?: 'price' | 'createdAt' | 'area'; sortOrder?: 'ASC' | 'DESC' } {
  const lower = text.toLowerCase();

  if (/\b(?:cheapest|lowest\s+price|most\s+affordable|budget\s+friendly)\b/i.test(lower)) {
    return { sortBy: 'price', sortOrder: 'ASC' };
  }
  if (/\b(?:most\s+expensive|highest\s+price|luxury|premium)\b/i.test(lower)) {
    return { sortBy: 'price', sortOrder: 'DESC' };
  }
  if (/\b(?:newest|latest|most\s+recent|recently\s+listed)\b/i.test(lower)) {
    return { sortBy: 'createdAt', sortOrder: 'DESC' };
  }
  if (/\b(?:largest|biggest|most\s+spacious)\b/i.test(lower)) {
    return { sortBy: 'area', sortOrder: 'DESC' };
  }

  return {};
}

/**
 * Resolves referenced property ID or numbers from natural text.
 * Handles patterns such as:
 *   "property 102"
 *   "prop_sl_02"
 *   "property 101 and 105"
 *   "property 1"
 */
export async function resolveReferencedPropertyIds(text: string): Promise<string[]> {
  const lower = text.toLowerCase();
  const ids: string[] = [];

  // 1. Direct IDs like "prop_01", "prop_sl_01"
  const directMatches = lower.match(/\b(prop(?:_sl)?_\d+)\b/gi);
  if (directMatches) {
    for (const dm of directMatches) {
      const canonical = dm.toLowerCase();
      const exists = await queryOne<{ id: string }>('SELECT id FROM properties WHERE LOWER(id) = ?', [canonical]);
      if (exists && !ids.includes(exists.id)) {
        ids.push(exists.id);
      }
    }
  }

  // 2. User-friendly numbers: "property 101", "property 102", "property 1", "property 2", etc.
  const helperResolveNum = async (num: number) => {
    let candidateId: string | null = null;
    if (num >= 101 && num <= 150) {
      const offset = num - 100;
      candidateId = `prop_sl_${offset.toString().padStart(2, '0')}`;
    } else if (num >= 1 && num <= 99) {
      candidateId = `prop_${num.toString().padStart(2, '0')}`;
    }

    if (candidateId) {
      const row = await queryOne<{ id: string }>('SELECT id FROM properties WHERE id = ?', [candidateId]);
      if (row && !ids.includes(row.id)) {
        ids.push(row.id);
      } else if (num >= 1 && num <= 99) {
        const slId = `prop_sl_${num.toString().padStart(2, '0')}`;
        const slRow = await queryOne<{ id: string }>('SELECT id FROM properties WHERE id = ?', [slId]);
        if (slRow && !ids.includes(slRow.id)) {
          ids.push(slRow.id);
        }
      }
    }
  };

  // Check multi-property phrasing e.g. "property 101 and 102", "properties 101, 102", "property 101 vs 105"
  const multiMatches = [...lower.matchAll(/\b(?:properties|property|props|prop|listings|listing|id)\s*#?\s*(\d+)\s*(?:and|,|vs|versus|to|with)\s*#?\s*(?:(?:properties|property|props|prop)\s*)?(\d+)\b/gi)];
  for (const mm of multiMatches) {
    const n1 = parseInt(mm[1], 10);
    const n2 = parseInt(mm[2], 10);
    if (!isNaN(n1)) await helperResolveNum(n1);
    if (!isNaN(n2)) await helperResolveNum(n2);
  }

  // Single property phrasing e.g. "property 101"
  const propNumMatches = [...lower.matchAll(/\b(?:property|prop|listing|id)\s*#?\s*(\d+)\b/gi)];
  for (const m of propNumMatches) {
    const num = parseInt(m[1], 10);
    if (!isNaN(num)) {
      await helperResolveNum(num);
    }
  }

  // If query is a comparison ("compare 101 and 102" without word "property" before second number)
  if (ids.length < 2 && /\b(?:compare|comparison|versus|vs)\b/i.test(lower)) {
    const genericNums = [...lower.matchAll(/\b(\d{1,3})\b/g)];
    for (const gn of genericNums) {
      const num = parseInt(gn[1], 10);
      if (!isNaN(num)) {
        await helperResolveNum(num);
      }
    }
  }

  // If user referenced a specific number like "property 999" but it wasn't in DB,
  // return the requested property identifier so downstream can report "couldn't find property 999"
  if (ids.length === 0) {
    const rawNumMatches = [...lower.matchAll(/\b(?:property|prop|listing|id)\s*#?\s*(\d+|[a-z0-9_-]+)\b/gi)];
    for (const rnm of rawNumMatches) {
      const rawVal = rnm[1];
      if (rawVal && !ids.includes(rawVal)) {
        ids.push(rawVal);
      }
    }
  }

  return ids;
}

/**
 * Builds structured PropertyQuery from text, incorporating contextual criteria if present.
 */
export function buildPropertyQuery(text: string, contextCriteria?: PropertyQuery): PropertyQuery {
  const { minPrice, maxPrice } = extractPriceRange(text);
  const location = extractLocation(text);
  const propertyType = extractPropertyType(text);
  const bedrooms = extractBedrooms(text);
  const amenities = extractAmenities(text);
  const sort = extractSortOrder(text);

  // Inherit or override context
  const query: PropertyQuery = {
    location: location || contextCriteria?.location,
    propertyType: propertyType || contextCriteria?.propertyType,
    minPrice: minPrice !== undefined ? minPrice : contextCriteria?.minPrice,
    maxPrice: maxPrice !== undefined ? maxPrice : contextCriteria?.maxPrice,
    minBedrooms: bedrooms !== undefined ? bedrooms : contextCriteria?.minBedrooms,
    amenities: amenities.length > 0 ? amenities : contextCriteria?.amenities,
    sortBy: sort.sortBy || contextCriteria?.sortBy,
    sortOrder: sort.sortOrder || contextCriteria?.sortOrder,
  };

  // If user included descriptive keyword like "modern", "luxury", "sea-view", capture it
  const lower = text.toLowerCase();
  const descriptiveWords = ['modern', 'luxury', 'colonial', 'heritage', 'beachfront', 'waterfront', 'seaside', 'contemporary'];
  for (const word of descriptiveWords) {
    if (lower.includes(word) && (!location || !location.toLowerCase().includes(word))) {
      query.keyword = word;
      break;
    }
  }

  return query;
}
