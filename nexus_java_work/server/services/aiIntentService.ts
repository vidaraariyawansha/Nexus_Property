import { AdvisorIntent, AdvisorSearchCriteria } from '../types/aiAdvisor.js';
import { PropertyType } from '../types/index.js';
import { SRI_LANKA_DISTRICTS, SRI_LANKA_PROVINCES } from './sriLankaGeo.js';

// Number words to digits
const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  single: 1,
  double: 2,
};

/**
 * Parses Sri Lankan currency and budget expressions.
 * Understands:
 * - "30M", "30 million", "30 m", "30 mil", "30 mn"
 * - "under 30M", "below 30 million", "less than 25M"
 * - "above 20M", "over 20 million", "more than 15M"
 * - "between 20 and 40 million", "20M - 40M", "20 to 40M"
 * - "2 crore" (1 crore = 10M LKR)
 * - "Rs. 25,000,000", "LKR 30M"
 */
export function parsePriceRange(text: string): { minPrice?: number; maxPrice?: number } {
  const clean = text.toLowerCase().replace(/,/g, '');

  // 1. Check for Range: "between X and Y", "X to Y", "X - Y"
  const rangeRegex = /(?:between\s+|from\s+)?(?:rs\.?|lkr)?\s*(\d+(?:\.\d+)?)\s*(m|million|mn|mil|crore|koti)?\s*(?:and|to|-)\s*(?:rs\.?|lkr)?\s*(\d+(?:\.\d+)?)\s*(m|million|mn|mil|crore|koti)/i;
  const rangeMatch = clean.match(rangeRegex);
  if (rangeMatch) {
    const rawVal1 = parseFloat(rangeMatch[1]);
    const unit1 = rangeMatch[2] || rangeMatch[4] || 'm';
    const rawVal2 = parseFloat(rangeMatch[3]);
    const unit2 = rangeMatch[4] || unit1 || 'm';

    const mult1 = unit1 === 'crore' || unit1 === 'koti' ? 10000000 : (unit1.startsWith('m') ? 1000000 : 1);
    const mult2 = unit2 === 'crore' || unit2 === 'koti' ? 10000000 : (unit2.startsWith('m') ? 1000000 : 1);

    const p1 = Math.round(rawVal1 * mult1);
    const p2 = Math.round(rawVal2 * mult2);
    return {
      minPrice: Math.min(p1, p2),
      maxPrice: Math.max(p1, p2),
    };
  }

  // 2. Check for Max Price ("under", "below", "less than", "up to", "max", "maximum", "within")
  const maxRegex = /(?:under|below|less than|up to|max|maximum|within|budget of|budget around|around)\s*(?:rs\.?|lkr)?\s*(\d+(?:\.\d+)?)\s*(m|million|mn|mil|crore|koti)?/i;
  const maxMatch = clean.match(maxRegex);
  if (maxMatch) {
    const val = parseFloat(maxMatch[1]);
    const unit = maxMatch[2] || (val < 1000 ? 'm' : '');
    const mult = unit === 'crore' || unit === 'koti' ? 10000000 : (unit.startsWith('m') ? 1000000 : 1);
    const calculated = Math.round(val * mult);
    return { maxPrice: calculated };
  }

  // 3. Check for Min Price ("above", "over", "more than", "at least", "min", "minimum")
  const minRegex = /(?:above|over|more than|at least|min|minimum|greater than)\s*(?:rs\.?|lkr)?\s*(\d+(?:\.\d+)?)\s*(m|million|mn|mil|crore|koti)?/i;
  const minMatch = clean.match(minRegex);
  if (minMatch) {
    const val = parseFloat(minMatch[1]);
    const unit = minMatch[2] || (val < 1000 ? 'm' : '');
    const mult = unit === 'crore' || unit === 'koti' ? 10000000 : (unit.startsWith('m') ? 1000000 : 1);
    const calculated = Math.round(val * mult);
    return { minPrice: calculated };
  }

  // 4. Standalone price mentions like "30M" or "25 million" or "LKR 40M"
  const standaloneRegex = /(?:rs\.?|lkr)?\s*(\d+(?:\.\d+)?)\s*(m|million|mn|mil|crore|koti)\b/i;
  const standaloneMatch = clean.match(standaloneRegex);
  if (standaloneMatch) {
    const val = parseFloat(standaloneMatch[1]);
    const unit = standaloneMatch[2];
    const mult = unit === 'crore' || unit === 'koti' ? 10000000 : 1000000;
    const calculated = Math.round(val * mult);
    // If not specified as min, default to max budget constraint
    return { maxPrice: calculated };
  }

  return {};
}

/**
 * Extracts bedroom specifications from text:
 * "3 bedroom", "3 bed", "3 beds", "three bedroom", "4 bedrooms", "2 beds"
 */
export function parseBedrooms(text: string): number | undefined {
  const clean = text.toLowerCase();

  // "3 bedroom", "3 beds", "3-bedroom"
  const digitMatch = clean.match(/(\d+)\s*(?:-| )?\s*(?:bed|beds|bedroom|bedrooms|br)\b/i);
  if (digitMatch) {
    return parseInt(digitMatch[1], 10);
  }

  // Word digits: "three bedroom", "four beds"
  const wordRegex = /\b(one|two|three|four|five|six|seven|eight|nine|ten|single|double)\s*(?:-| )?\s*(?:bed|beds|bedroom|bedrooms|br)\b/i;
  const wordMatch = clean.match(wordRegex);
  if (wordMatch) {
    return NUMBER_WORDS[wordMatch[1].toLowerCase()];
  }

  // "only 3 bedrooms" or "3 bedrooms only"
  const onlyMatch = clean.match(/only\s*(\d+)/i);
  if (onlyMatch && clean.includes('bed')) {
    return parseInt(onlyMatch[1], 10);
  }

  return undefined;
}

/**
 * Extracts property type from text:
 * HOUSE, APARTMENT, CONDO, VILLA, LAND, COMMERCIAL
 */
export function parsePropertyType(text: string): PropertyType | undefined {
  const clean = text.toLowerCase();

  if (/\b(?:apartment|apartments|flat|flats|annex)\b/i.test(clean)) {
    return 'APARTMENT';
  }
  if (/\b(?:condo|condos|condominium|condominiums)\b/i.test(clean)) {
    return 'CONDO';
  }
  if (/\b(?:villa|villas)\b/i.test(clean)) {
    return 'VILLA';
  }
  if (/\b(?:house|houses|bungalow|bungalows|residence|home|homes)\b/i.test(clean)) {
    return 'HOUSE';
  }
  if (/\b(?:land|lands|plot|plots|bare land|estate|coconut land|tea estate)\b/i.test(clean)) {
    return 'LAND';
  }
  if (/\b(?:commercial|office|offices|shop|shops|building|warehouse)\b/i.test(clean)) {
    return 'COMMERCIAL';
  }

  return undefined;
}

/**
 * Matches known Sri Lankan locations from the database / geo directory:
 * Districts, Provinces, and Key Cities.
 */
export function parseSriLankanLocation(text: string): { location?: string; district?: string; province?: string } {
  const clean = text.toLowerCase();

  // Check specific Colombo postal zones first (Colombo 03, Colombo 07, etc.)
  const colomboZoneMatch = clean.match(/\b(colombo\s*(?:0?[1-9]|1[0-5]))\b/i);
  if (colomboZoneMatch) {
    const rawZone = colomboZoneMatch[1];
    // Normalize "colombo 3" to "Colombo 03"
    const numPart = rawZone.replace(/colombo\s*/i, '').trim();
    const formattedNum = numPart.padStart(2, '0');
    return {
      location: `Colombo ${formattedNum}`,
      district: 'Colombo',
      province: 'Western',
    };
  }

  // Check all cities from districts
  for (const districtKey of Object.keys(SRI_LANKA_DISTRICTS)) {
    const distInfo = SRI_LANKA_DISTRICTS[districtKey];

    // Check cities
    for (const city of distInfo.keyCities) {
      const cityRegex = new RegExp(`\\b${city.toLowerCase()}\\b`, 'i');
      if (cityRegex.test(clean)) {
        return {
          location: city,
          district: distInfo.name,
          province: distInfo.province,
        };
      }
    }

    // Check district name itself
    const distRegex = new RegExp(`\\b${distInfo.name.toLowerCase()}\\b`, 'i');
    if (distRegex.test(clean)) {
      return {
        location: distInfo.name,
        district: distInfo.name,
        province: distInfo.province,
      };
    }
  }

  // Check provinces
  for (const prov of SRI_LANKA_PROVINCES) {
    const provRegex = new RegExp(`\\b${prov.toLowerCase()}\\b`, 'i');
    if (provRegex.test(clean)) {
      return {
        location: prov,
        province: prov,
      };
    }
  }

  return {};
}

/**
 * Extracts popular amenities
 */
export function parseAmenities(text: string): string[] {
  const clean = text.toLowerCase();
  const amenities: string[] = [];

  if (/\b(?:pool|swimming pool)\b/i.test(clean)) amenities.push('Swimming Pool');
  if (/\b(?:solar|solar panels|solar power)\b/i.test(clean)) amenities.push('Solar Panels');
  if (/\b(?:ac|air condition|air conditioned|air conditioning)\b/i.test(clean)) amenities.push('Air Conditioning');
  if (/\b(?:garden|landscaped garden|backyard)\b/i.test(clean)) amenities.push('Garden');
  if (/\b(?:sea view|ocean view|beachfront|beach)\b/i.test(clean)) amenities.push('Sea View');
  if (/\b(?:security|24\/7 security|gated|cctv)\b/i.test(clean)) amenities.push('24/7 Security');
  if (/\b(?:gym|fitness)\b/i.test(clean)) amenities.push('Gym');
  if (/\b(?:parking|garage|car park)\b/i.test(clean)) amenities.push('Parking');

  return amenities;
}

/**
 * Classifies user intent based on keyword patterns, action indicators, and structure.
 */
export function classifyIntent(query: string, contextPropertyId?: string): AdvisorIntent {
  const clean = query.trim().toLowerCase();

  // 1. Greetings
  if (/^(hi|hello|hey|ayubowan|vanakkam|good\s*(morning|afternoon|evening)|howdy)\b/i.test(clean) && clean.length < 35) {
    return 'GREETING';
  }

  // 2. Wishlist
  if (/\b(wishlist|saved properties|saved property|saved listings|save this|add to wishlist|remove from wishlist)\b/i.test(clean) ||
      (/how many (?:properties|items) in my (?:wishlist|saved)/i.test(clean))) {
    return 'WISHLIST';
  }

  // 3. Comparison
  if (/\b(compare|comparison|which is cheaper|which has more|cheaper between|differences between|add to compare|compare these)\b/i.test(clean)) {
    return 'PROPERTY_COMPARISON';
  }

  // 4. Appointments
  if (/\b(appointment|appointments|book a viewing|schedule a viewing|viewing slot|book this property|my viewings|upcoming viewings|reschedule|cancel viewing|book viewing)\b/i.test(clean) ||
      (/\bcan i (?:book|view|visit|see this property)\b/i.test(clean))) {
    return 'APPOINTMENT';
  }

  // 5. Inquiries & Agent Contact
  if (/\b(inquiry|inquiries|open inquiries|contact agent|agent contact|message agent|reach agent|send inquiry|ask agent)\b/i.test(clean)) {
    return 'INQUIRY';
  }

  // 6. Complaints
  if (/\b(complaint|complaints|file a complaint|status of my complaint|report problem|dispute|lodge complaint)\b/i.test(clean)) {
    return 'COMPLAINT';
  }

  // 7. Account & Profile
  if (/\b(my email|email on my account|my profile|my account|my phone number|change\s*(?:my\s*)?password|reset\s*(?:my\s*)?password|update\s*(?:my\s*)?phone|password|credentials)\b/i.test(clean)) {
    return 'ACCOUNT';
  }

  // 8. General Sri Lankan Real Estate / Legal / Terminology Questions
  if (/\b(what is a perch|what is perch|what is bimsaviya|deed|stamp duty|mortgage|difference between apartment and (?:condo|condominium)|how many sq ft in a perch|how much is a perch|capital gains|property tax|uda approval)\b/i.test(clean)) {
    return 'GENERAL_PROPERTY_QUESTION';
  }

  // 9. Website Navigation / Help
  if (/\b(how do i|how to (?:post|list|add|filter|search)|help|where can i find|how does nexus work|website help|how to use)\b/i.test(clean)) {
    return 'WEBSITE_HELP';
  }

  // 10. Specific Property Details (if asking about specific details and contextPropertyId is present or query specifies "this property")
  if (contextPropertyId || /\b(this property|this house|this apartment|price of this|details of this|is it available|tell me about this)\b/i.test(clean)) {
    if (/\b(price|cost|bedroom|bedrooms|bathroom|bathrooms|area|sq ft|amenities|location|status|available|owner|agent|description)\b/i.test(clean)) {
      return 'PROPERTY_DETAILS';
    }
  }

  // 11. Property Search
  // If query mentions location, property type, price/budget, or search intent verbs:
  const hasLocation = Boolean(parseSriLankanLocation(clean).location);
  const hasType = Boolean(parsePropertyType(clean));
  const hasPrice = Boolean(parsePriceRange(clean).maxPrice || parsePriceRange(clean).minPrice);
  const hasBeds = Boolean(parseBedrooms(clean));
  const hasSearchVerbs = /\b(find|search|show|looking for|need|want|properties|apartments|houses|lands|villas)\b/i.test(clean);

  if (hasLocation || hasType || hasPrice || hasBeds || hasSearchVerbs) {
    return 'PROPERTY_SEARCH';
  }

  return 'UNKNOWN';
}

/**
 * Extracts and merges structured search criteria from the user query and previous context.
 */
export function extractStructuredCriteria(
  query: string,
  existingCriteria?: AdvisorSearchCriteria
): AdvisorSearchCriteria {
  const result: AdvisorSearchCriteria = existingCriteria ? { ...existingCriteria } : {};

  // Location
  const locInfo = parseSriLankanLocation(query);
  if (locInfo.location) {
    result.location = locInfo.location;
    if (locInfo.district) result.district = locInfo.district;
    if (locInfo.province) result.province = locInfo.province;
  }

  // Property Type
  const propType = parsePropertyType(query);
  if (propType) {
    result.propertyType = propType;
  }

  // Price range
  const priceRange = parsePriceRange(query);
  if (priceRange.minPrice !== undefined) {
    result.minPrice = priceRange.minPrice;
  }
  if (priceRange.maxPrice !== undefined) {
    result.maxPrice = priceRange.maxPrice;
  }

  // Bedrooms
  const beds = parseBedrooms(query);
  if (beds !== undefined) {
    result.bedrooms = beds;
  }

  // Amenities
  const amenities = parseAmenities(query);
  if (amenities.length > 0) {
    const currentAmenities = result.amenities || [];
    result.amenities = Array.from(new Set([...currentAmenities, ...amenities]));
  }

  return result;
}
