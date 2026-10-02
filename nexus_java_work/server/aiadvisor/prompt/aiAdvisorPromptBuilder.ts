/**
 * Prompt Builder for Nexus Property AI Advisor
 * Constructs minimal, grounding-enforced prompts for LLM synthesis.
 */

export interface PromptContextData {
  userQuery: string;
  intent: string;
  properties?: any[];
  userAppointments?: any[];
  userWishlist?: any[];
  userInquiries?: any[];
  userComplaints?: any[];
  singleProperty?: any;
  clarificationNeeded?: string;
  customFacts?: string;
}

export function buildGroundedSystemInstruction(): string {
  return `You are the Nexus Property AI Advisor for Sri Lanka.
Strict Grounding Rules:
1. Answer ONLY using the verified application data provided in the prompt context.
2. NEVER invent property information, titles, prices, availability, agents, viewings, appointments, or features.
3. If specific information is missing from the data, state clearly: "I don't have enough information in the current property records to confirm that."
4. Use Sri Lankan currency (LKR) and appropriate terminology.
5. Keep answers concise, factual, and professional (maximum 2-4 sentences or a clean bullet list).
6. Never reveal private customer records, email addresses, passwords, or system internals.
7. Do not make authorization decisions yourself.`;
}

export function buildSynthesisPrompt(data: PromptContextData): string {
  let structuredContext = '';

  if (data.properties && data.properties.length > 0) {
    const compactProps = data.properties.map(p => ({
      id: p.id,
      title: p.title,
      location: p.location,
      priceLKR: p.price,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      areaSqFt: p.area,
      type: p.propertyType,
    }));
    structuredContext += `\nVerified Matching Listings from Database (${compactProps.length}):\n${JSON.stringify(compactProps, null, 2)}`;
  } else if (data.singleProperty) {
    structuredContext += `\nVerified Property Record:\n${JSON.stringify({
      id: data.singleProperty.id,
      title: data.singleProperty.title,
      location: data.singleProperty.location,
      priceLKR: data.singleProperty.price,
      bedrooms: data.singleProperty.bedrooms,
      bathrooms: data.singleProperty.bathrooms,
      areaSqFt: data.singleProperty.area,
      type: data.singleProperty.propertyType,
      amenities: data.singleProperty.amenities,
      status: data.singleProperty.status,
    }, null, 2)}`;
  } else if (data.properties && data.properties.length === 0) {
    structuredContext += '\nDatabase Search Result: Zero matching properties found matching the exact filters.';
  }

  if (data.userAppointments) {
    structuredContext += `\nUser Verified Appointments:\n${JSON.stringify(data.userAppointments, null, 2)}`;
  }

  if (data.userWishlist) {
    structuredContext += `\nUser Verified Saved Properties:\n${JSON.stringify(data.userWishlist, null, 2)}`;
  }

  if (data.customFacts) {
    structuredContext += `\nVerified System Information:\n${data.customFacts}`;
  }

  return `User Query: "${data.userQuery}"
Detected Intent: ${data.intent}
${structuredContext}

Generate a concise, friendly, factual response in natural Sri Lankan real estate English directly addressing the user's inquiry based strictly on the verified data above.`;
}
