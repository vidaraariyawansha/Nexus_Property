/**
 * AI Response Service
 * Synthesizes grounded natural language responses using either fast deterministic templates
 * or Gemini LLM with strict timeouts, anti-hallucination enforcement, and deterministic fallback.
 */

import { GoogleGenAI } from '@google/genai';
import { aiConfig } from '../config/aiAdvisorConfig.js';
import { AIPropertyResult } from '../dto/aiAdvisorDto.js';
import { buildGroundedSystemInstruction, buildSynthesisPrompt, PromptContextData } from '../prompt/aiAdvisorPromptBuilder.js';
import { formatLKR, formatSLDate, formatSLTime } from '../../services/sriLankaUtils.js';

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: { 'User-Agent': 'nexus-property-ai-advisor' },
      },
    });
  }
  return genAIClient;
}

export async function synthesizeResponseWithAI(
  promptData: PromptContextData,
  timeoutMs: number = aiConfig.timeoutMs
): Promise<{ text: string; modelUsed: string } | null> {
  const ai = getGenAI();
  if (!ai) return null;

  const prompt = buildSynthesisPrompt(promptData);
  const systemInstruction = buildGroundedSystemInstruction();

  try {
    // Call Gemini with timeout race
    const generatePromise = ai.models.generateContent({
      model: aiConfig.primaryModel,
      contents: prompt,
      config: {
        systemInstruction,
        maxOutputTokens: aiConfig.maxOutputTokens,
        temperature: 0.2, // Low temperature for high factual accuracy
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI_TIMEOUT')), timeoutMs)
    );

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const text = response.text ? response.text.trim() : '';
    if (text) {
      return { text, modelUsed: aiConfig.primaryModel };
    }
  } catch (err: any) {
    console.warn('AI advisor synthesis failed or timed out, resorting to deterministic engine:', err?.message || err);
  }

  return null;
}

/**
 * Deterministic fast synthesizer for property search results.
 */
export function synthesizeSearchResponse(
  properties: AIPropertyResult[],
  criteria: any,
  totalMatches: number
): string {
  if (properties.length === 0) {
    const locPart = criteria.location ? ` in ${criteria.location}` : '';
    const typePart = criteria.propertyType && criteria.propertyType !== 'ALL' ? ` ${criteria.propertyType.toLowerCase()} listings` : ' properties';
    const pricePart = criteria.maxPrice ? ` under ${formatLKR(criteria.maxPrice)}` : '';
    return `I couldn't find any active${typePart}${locPart}${pricePart}. Would you like to widen your search area or adjust your budget?`;
  }

  const locDesc = criteria.location ? ` in ${criteria.location}` : '';
  const countDesc = totalMatches === properties.length ? `${properties.length}` : `the top ${properties.length} of ${totalMatches}`;
  const header = `I found ${totalMatches} matching active ${totalMatches === 1 ? 'listing' : 'listings'}${locDesc}. Here are ${countDesc}:`;

  const items = properties
    .map(
      (p, i) =>
        `${i + 1}. **${p.title}** – ${p.location}\n   ${p.shortPrice} · ${p.bedrooms > 0 ? `${p.bedrooms} Beds · ` : ''}${p.bathrooms > 0 ? `${p.bathrooms} Baths · ` : ''}${p.area.toLocaleString()} sq ft`
    )
    .join('\n\n');

  return `${header}\n\n${items}\n\nWould you like to view full details or schedule a viewing for one of these properties?`;
}

/**
 * Deterministic fast synthesizer for single property details.
 */
export function synthesizePropertyDetailsResponse(
  property: any,
  specificQuestion?: string
): string {
  if (!property) {
    return `I couldn't find that property in our active property database. Please verify the property ID or title and try again.`;
  }

  const q = (specificQuestion || '').toLowerCase();

  // Check specific attribute questions
  if (q.includes('swimming pool') || q.includes('pool')) {
    const hasPool = (property.amenities || []).some((a: string) => /pool/i.test(a));
    if (hasPool) {
      return `Yes, **${property.title}** includes a private swimming pool according to verified listing records.`;
    } else {
      return `The verified property records for **${property.title}** do not list a swimming pool among its amenities.`;
    }
  }

  if (q.includes('parking') || q.includes('garage')) {
    const hasParking = (property.amenities || []).some((a: string) => /parking|garage/i.test(a));
    if (hasParking) {
      return `Yes, **${property.title}** includes secure parking/garage facilities.`;
    } else {
      return `Verified records for **${property.title}** do not specify dedicated parking.`;
    }
  }

  if (q.includes('bathroom') || q.includes('baths')) {
    return `**${property.title}** features ${property.bathrooms} ${property.bathrooms === 1 ? 'bathroom' : 'bathrooms'}.`;
  }

  if (q.includes('bedroom') || q.includes('beds')) {
    return `**${property.title}** features ${property.bedrooms} ${property.bedrooms === 1 ? 'bedroom' : 'bedrooms'}.`;
  }

  // General summary
  const amenitiesList = Array.isArray(property.amenities) && property.amenities.length > 0
    ? `\nKey Amenities: ${property.amenities.slice(0, 5).join(', ')}.`
    : '';

  return `**${property.title}** (${property.propertyType})
Location: ${property.location}
Price: ${formatLKR(property.price)}
Specifications: ${property.bedrooms} Bedrooms · ${property.bathrooms} Bathrooms · ${property.area.toLocaleString()} sq ft
Status: ${property.status}${amenitiesList}

Would you like to book a private viewing or save this property to your wishlist?`;
}

/**
 * Deterministic fast synthesizer for property comparisons.
 */
export function synthesizeComparisonResponse(properties: any[]): string {
  if (!properties || properties.length < 2) {
    return `Please specify at least two properties to compare (for example: "Compare property 101 and 105" or save them to your comparison list).`;
  }

  const lines = properties.map((p, i) => {
    return `**Option ${i + 1}: ${p.title}**\n- Location: ${p.location}\n- Price: ${formatLKR(p.price)}\n- Size: ${p.area.toLocaleString()} sq ft (${p.bedrooms} Beds, ${p.bathrooms} Baths)\n- Type: ${p.propertyType}`;
  });

  return `Here is a factual side-by-side comparison of the ${properties.length} properties:\n\n${lines.join('\n\n')}\n\nWould you like more details on either property?`;
}

/**
 * Deterministic fast synthesizer for user appointments.
 */
export function synthesizeAppointmentsResponse(appointments: any[]): string {
  if (appointments.length === 0) {
    return `You have no upcoming viewing appointments scheduled at this time. You can schedule a viewing from any property details page!`;
  }

  const items = appointments.map((a, i) => {
    const dateStr = formatSLDate(a.appointmentTime || a.appointment_time);
    const timeStr = formatSLTime(a.appointmentTime || a.appointment_time);
    const title = a.propertyTitle || a.property_title || 'Property';
    const status = a.status;
    return `${i + 1}. **${title}**\n   Date & Time: ${dateStr} at ${timeStr} (${status})\n   Agent: ${a.agentName || a.agent_name || 'Assigned Agent'}`;
  });

  return `You have ${appointments.length} viewing ${appointments.length === 1 ? 'appointment' : 'appointments'} on schedule:\n\n${items.join('\n\n')}`;
}

/**
 * Deterministic fast synthesizer for user wishlist.
 */
export function synthesizeWishlistResponse(items: any[]): string {
  if (items.length === 0) {
    return `Your wishlist is currently empty. Browse our property listings and click the heart icon or tell me "Save property X to my wishlist" to add listings!`;
  }

  const lines = items.map((item, idx) => {
    const p = item.property || item;
    return `${idx + 1}. **${p.title}** (${p.location}) – ${formatLKR(p.price)}`;
  });

  return `You have ${items.length} saved ${items.length === 1 ? 'property' : 'properties'} in your wishlist:\n\n${lines.join('\n')}`;
}

/**
 * Deterministic fast synthesizer for inquiries & complaints.
 */
export function synthesizeTicketsResponse(type: 'INQUIRY' | 'COMPLAINT', tickets: any[]): string {
  const noun = type === 'INQUIRY' ? 'inquiry' : 'complaint';
  const plural = type === 'INQUIRY' ? 'inquiries' : 'complaints';

  if (tickets.length === 0) {
    return `You have no active ${plural} on file. If you need assistance with a property or transaction, you can submit an inquiry anytime!`;
  }

  const lines = tickets.map((t, idx) => {
    const id = t.ticketId || t.ticket_id || t.id;
    const subject = t.subject;
    const status = t.status;
    const date = formatSLDate(t.createdAt || t.created_at);
    return `${idx + 1}. [${id}] **${subject}** – Status: **${status}** (Filed ${date})`;
  });

  return `Here is the current status of your ${plural} (${tickets.length}):\n\n${lines.join('\n')}`;
}
