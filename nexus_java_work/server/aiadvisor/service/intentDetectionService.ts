/**
 * Intent Detection Service
 * Fast, deterministic intent classifier (< 1ms latency) with context-aware continuation.
 */

import { IntentType, ConversationContext } from '../dto/aiAdvisorDto.js';

export function detectUserIntent(
  message: string,
  context?: ConversationContext,
  contextPropertyId?: string
): { intent: IntentType; confidence: number; reason: string } {
  const text = message.trim().toLowerCase();

  // 1. COMPARISON INTENT
  if (
    /\b(?:compare|comparison|versus|vs)\b/i.test(text) ||
    (/\b(?:difference between|side by side)\b/i.test(text))
  ) {
    return { intent: 'PROPERTY_COMPARISON', confidence: 0.95, reason: 'Keyword comparison match' };
  }

  // 2. WISHLIST INTENT
  if (
    /\b(?:wishlist|saved properties|save property|save to wishlist|add to wishlist|remove from wishlist|my favorites|favorite)\b/i.test(text)
  ) {
    return { intent: 'WISHLIST', confidence: 0.95, reason: 'Keyword wishlist match' };
  }

  // 3. APPOINTMENT INTENT
  if (
    /\b(?:appointment|appointments|viewing|viewings|book a viewing|schedule a viewing|schedule tour|book viewing|visit property|can i view)\b/i.test(text)
  ) {
    return { intent: 'APPOINTMENT', confidence: 0.95, reason: 'Keyword appointment match' };
  }

  // 4. INQUIRY INTENT
  if (
    /\b(?:inquiry|inquiries|status of my inquiry|my inquiry|submit inquiry|ticket status)\b/i.test(text) &&
    !/\bcomplaint\b/i.test(text)
  ) {
    return { intent: 'INQUIRY', confidence: 0.92, reason: 'Keyword inquiry match' };
  }

  // 5. COMPLAINT INTENT
  if (
    /\b(?:complaint|complaints|status of my complaint|file a complaint|my complaint|grievance)\b/i.test(text)
  ) {
    return { intent: 'COMPLAINT', confidence: 0.95, reason: 'Keyword complaint match' };
  }

  // 6. ACCOUNT / PROFILE INTENT
  if (
    /\b(?:my account|my profile|profile information|change my profile|user details|who am i|my role)\b/i.test(text)
  ) {
    return { intent: 'ACCOUNT', confidence: 0.9, reason: 'Keyword account match' };
  }

  // 7. SYSTEM HELP INTENT
  if (
    /^(?:help|what can you do|commands|options|how to use|features)\b/i.test(text) ||
    /\b(?:what are your capabilities|guide me)\b/i.test(text)
  ) {
    return { intent: 'SYSTEM_HELP', confidence: 0.98, reason: 'Keyword system help match' };
  }

  // 8. PROPERTY DETAILS INTENT
  // Specific property inquiry, e.g. "tell me about property 102", "details for prop_01", "how many swimming pools does property 999 have", "does property 101 have a swimming pool"
  if (
    (/\b(?:tell me about|details|info|information|specs|how many|what is the price|does property|about property|about)\b/i.test(text) &&
      /\b(?:property|prop|listing|id)\s*#?\s*(?:\d+|prop(?:_sl)?_\d+)\b/i.test(text)) ||
    (/\b(?:how many|does property)\b/i.test(text) && /\b(?:property|prop)\b/i.test(text)) ||
    (contextPropertyId && /\b(?:tell me about|details|how many|what is|does this|is there)\b/i.test(text))
  ) {
    return { intent: 'PROPERTY_DETAILS', confidence: 0.93, reason: 'Property details match' };
  }

  // 9. GENERAL PROPERTY QUESTION
  // Questions about Sri Lankan market, property types, legal steps
  if (
    /\b(?:what property types|which locations|available districts|how to buy property|stamp duty|bimsaviya|uda approval)\b/i.test(text)
  ) {
    return { intent: 'GENERAL_PROPERTY_QUESTION', confidence: 0.88, reason: 'General property domain match' };
  }

  // 10. PROPERTY SEARCH INTENT
  // Search verbs or search parameters (bedroom, location, price, property type, amenities)
  if (
    /\b(?:find|search|show|look for|available|listed|properties in|houses in|apartments in|villas in|lands in|condos in)\b/i.test(text) ||
    /\b(?:under|below|less than|budget|million|crore|lakhs|m|lkr|bedroom|bedrooms|house|apartment|condo|villa|land|commercial)\b/i.test(text)
  ) {
    return { intent: 'PROPERTY_SEARCH', confidence: 0.9, reason: 'Property search criteria match' };
  }

  // 11. CONVERSATIONAL CONTINUATION
  // If user continues previous search with a modifier (e.g. "under 25 million", "with 3 bedrooms", "in Kandy")
  if (context?.lastIntent === 'PROPERTY_SEARCH') {
    if (
      /\b(?:under|below|above|between|\d+m|\d+\s*million|bedroom|house|apartment|kandy|colombo|galle)\b/i.test(text)
    ) {
      return { intent: 'PROPERTY_SEARCH', confidence: 0.85, reason: 'Search continuation from context' };
    }
  }

  return { intent: 'UNKNOWN', confidence: 0.4, reason: 'No definitive pattern matched' };
}
