import { GoogleGenAI } from '@google/genai';
import { AdvisorAction, AdvisorIntent, AdvisorPropertyCard, AdvisorRequest, AdvisorResponse, AdvisorSearchCriteria } from '../types/aiAdvisor.js';
import { Property, UserRole } from '../types/index.js';
import { searchProperties, getPropertyById } from './propertyService.js';
import { getCustomerWishlist, toggleWishlistItem, getCustomerDashboardSummary } from './wishlistService.js';
import { getCustomerComparisons, getComparison, quickAddToComparison, removePropertyFromComparison } from './comparisonService.js';
import { getUserAppointments, getAvailableAgents, createAppointment } from './appointmentService.js';
import { listInquiries, listComplaints, createInquiry } from './feedbackService.js';
import { formatLKR } from './sriLankaUtils.js';
import {
  classifyIntent,
  extractStructuredCriteria,
  parseSriLankanLocation,
  parsePropertyType,
  parsePriceRange,
  parseBedrooms,
} from './aiIntentService.js';
import { getOrCreateSession, updateSessionContext } from './aiContextService.js';
import { logAudit } from './auditService.js';

let aiInstance: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

// In-Memory Rate Limiting (30 requests per minute per identifier)
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimits = new Map<string, RateLimitRecord>();

export function checkRateLimit(key: string, limit: number = 30, windowMs: number = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimits.get(key);

  if (!record || now > record.resetAt) {
    rateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count };
}

// Static Authoritative Sri Lankan Property Knowledge Base (Sub-second response, zero LLM cost)
const SRI_LANKAN_KNOWLEDGE: Record<string, { en: string; si: string; ta: string }> = {
  perch: {
    en: 'In Sri Lankan real estate, a **perch** is the standard land measurement unit.\n• 1 perch = 272.25 square feet (~25.29 square meters)\n• 160 perches = 1 acre\n• 40 perches = 1 rood\nTypical residential plots in Colombo and suburbs range between 6 to 15 perches.',
    si: 'ශ්‍රී ලංකාවේ ඉඩම් මැනීමේ ප්‍රධාන ඒකකය **පර්චසය** වේ.\n• පර්චස් 1 = වර්ග අඩි 272.25 කි (වර්ග මීටර් ~25.29)\n• පර්චස් 160 = අක්කර 1 කි\nකොළඹ සහ තදාසන්න ප්‍රදේශවල නේවාසික බිම් කොටස් සාමාන්‍යයෙන් පර්චස් 6 සිට 15 දක්වා වේ.',
    ta: 'இலங்கையின் நில அளவீட்டின் முக்கிய அலகு **பர்ச் (Perch)** ஆகும்.\n• 1 பர்ச் = 272.25 சதுர அடி (~25.29 சதுர மீட்டர்)\n• 160 பர்ச்சஸ் = 1 ஏக்கர்\nகொழும்பு மற்றும் புறநகர்ப் பகுதிகளில் குடியிருப்பு நிலங்கள் பொதுவாக 6 முதல் 15 பர்ச்சஸ் வரை இருக்கும்.',
  },
  bimsaviya: {
    en: '**Bimsaviya** is the title registration system governed by the Registration of Title Act No. 21 of 1998 in Sri Lanka. It provides state-guaranteed, conclusive title deeds (Class 1 or Class 2) with a unique cadastral parcel map, eliminating deed disputes and fraudulent transactions.',
    si: '**බිම්සවිය** යනු 1998 අංක 21 දරන හිමිකම් ලියාපදිංචි කිරීමේ පනත යටතේ ක්‍රියාත්මක වන රජයේ සහතිකලත් ඉඩම් හිමිකම් ක්‍රමයයි. මෙමගින් නිරවුල් සින්නක්කර ඔප්පු හිමිකම රජය මගින් සහතික කරයි.',
    ta: '**பிம்சவிய (Bimsaviya)** என்பது இலங்கையில் 1998 ஆம் ஆண்டின் 21 ஆம் இலக்க காணி உறுதிப் பதிவு சட்டத்தின் கீழ் அரசு உத்தரவாதமளிக்கப்பட்ட நில உரிமைப் பதிவு முறையாகும். இது காணி தகராறுகளை முற்றிலும் தவிர்க்கிறது.',
  },
  condo_vs_apartment: {
    en: 'In Sri Lanka, a **Condominium** is governed by the Condominium Management Authority (CMA) with a registered deed of declaration and individual semi-permanent title deeds for each unit with shared common amenities. An **apartment/annex** without CMA certification may only offer leasehold or non-stratified ownership.',
    si: 'ශ්‍රී ලංකාවේ **කොන්ඩෝ නිවාස (Condominium)** යනු සහාධිපත්‍ය කළමනාකරණ අධිකාරියේ (CMA) ලියාපදිංචි කොට, පොදු පහසුකම් බෙදාහදා ගන්නා තනි ඔප්පු සහිත ඒකක වේ. සාමාන්‍ය **ඇනෙක්සියක් හෝ කුලී මහල් නිවාසයක්** එවැනි ස්ථිර තනි හිමිකම් ඔප්පු ලබා නොදේ.',
    ta: 'இலங்கையில் **காண்டோமினியம் (Condominium)** என்பது CMA அதிகாரசபையால் பதிவு செய்யப்பட்டு, தனித்தனி உரிமப் பத்திரங்களுடன் பகிரப்பட்ட வசதிகளைக் கொண்டதாகும். சாதாரண அபார்ட்மெண்ட் இதற்கு மாறாக குத்தகை உரிமையாக இருக்கலாம்.',
  },
  deed_documents: {
    en: 'Key documents required for Sri Lankan property acquisition:\n1. Title Deed (Original and extracts for past 30 years from Land Registry)\n2. Survey Plan approved by local Municipal Council / Pradeshiya Sabha\n3. Non-vesting certificate and street line certificate\n4. Assessment tax receipts for past quarters\n5. UDA / Municipal building approval and Certificate of Conformity (COC) for buildings.',
    si: 'ශ්‍රී ලංකාවේ දේපළක් මිලදී ගැනීමේදී අවශ්‍ය ප්‍රධාන ලියකියවිලි:\n1. සින්නක්කර ඔප්පුව හා වසර 30ක පත්තිරු සාරාංශය\n2. පළාත් පාලන ආයතනයෙන් අනුමත මිනින්දෝරු පිඹුර\n3. වීථි රේඛා සහ නොපවරා ගැනීමේ සහතික\n4. වරිපනම් බදු ගෙවූ රිසිට්පත්\n5. ගොඩනැගිලි අනුමත සැලැස්ම සහ අනුකූලතා සහතිකය (COC).',
    ta: 'இலங்கையில் சொத்து வாங்குவதற்கு தேவையான முக்கிய ஆவணங்கள்:\n1. உரிமைப் பத்திரம் (30 வருட நிலப் பதிவேடு நகல்கள்)\n2. உள்ளூராட்சி சபையால் அங்கீகரிக்கப்பட்ட நில அளவை வரைபடம்\n3. தெருக் கோடு மற்றும் கையகப்படுத்தப்படா சான்றிதழ்\n4. மதிப்பீட்டு வரி பற்றுச்சீட்டுகள்\n5. கட்டிட ஒப்புதல் மற்றும் இணக்கச் சான்றிதழ் (COC).',
  },
};

/**
 * Maps Property model into AdvisorPropertyCard format
 */
export function toAdvisorCard(property: Property): AdvisorPropertyCard {
  const highlights: string[] = [];
  if (property.bedrooms > 0) highlights.push(`${property.bedrooms} Beds`);
  if (property.bathrooms > 0) highlights.push(`${property.bathrooms} Baths`);
  if (property.area > 0) highlights.push(`${property.area.toLocaleString()} sq ft`);
  if (property.amenities && property.amenities.length > 0) {
    highlights.push(property.amenities.slice(0, 2).join(', '));
  }

  return {
    id: property.id,
    title: property.title,
    location: property.location,
    price: property.price,
    formattedPrice: formatLKR(property.price),
    propertyType: property.propertyType,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area: property.area,
    status: property.status,
    primaryImage: property.primaryImage,
    highlights,
  };
}

/**
 * Primary AI Advisor Service Orchestrator
 */
export async function handleAdvisorRequest(
  request: AdvisorRequest,
  currentUserRole?: UserRole,
  currentUserId?: string,
  userIp?: string
): Promise<AdvisorResponse> {
  const startTime = Date.now();
  const rateKey = currentUserId || userIp || 'anonymous';
  const { allowed } = checkRateLimit(rateKey);

  if (!allowed) {
    return {
      intent: 'UNKNOWN',
      message: 'You have sent several messages recently. Please wait a moment before sending another query.',
      confidence: 'UNKNOWN',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
    };
  }

  const session = getOrCreateSession(request.sessionId, currentUserId, request.language || 'en');
  const query = (request.query || '').trim();
  const lang = request.language || session.language || 'en';

  // 1. Handle Explicit Action Confirmation if supplied
  if (request.confirmedAction) {
    return await executeConfirmedAction(request.confirmedAction, currentUserId, currentUserRole, session.sessionId, startTime);
  }

  // 2. Classify Intent
  const intent = classifyIntent(query, request.contextPropertyId || session.contextPropertyId);

  // 3. Routing: Handle each intent deterministically via Java Spring-like service layer
  switch (intent) {
    case 'GREETING': {
      const greetingMsg = lang === 'si'
        ? 'ආයුබෝවන්! මම නෙක්සස් ප්‍රොපර්ටි AI උපදේශක වෙමි. ශ්‍රී ලංකාවේ සත්‍යාපිත නිවාස, මහල් නිවාස හෝ ඉඩම් සොයා ගැනීමට, සංසන්දනය කිරීමට හෝ නැරඹුම් වෙන්කර ගැනීමට මම ඔබට කෙසේ සහය වෙම්ද?'
        : lang === 'ta'
        ? 'வணக்கம்! நான் நெக்ஸஸ் பிராப்பர்ட்டி AI ஆலோசகர். இலங்கையில் வீடுகள், அடுக்குமாடிகள் அல்லது நிலங்களை கண்டறிய, ஒப்பிட அல்லது பார்வையிட முன்பதிவு செய்ய நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?'
        : 'Welcome to Nexus Property Advisor! I can help you search verified Sri Lankan homes, apartments, or land, compare listings side-by-side, inspect details, and schedule viewing appointments. How can I assist you today?';

      return {
        intent: 'GREETING',
        message: greetingMsg,
        confidence: 'VERIFIED',
        fastPath: true,
        responseTimeMs: Date.now() - startTime,
        quickActions: [
          { id: 'search_colombo', label: 'Apartments in Colombo', type: 'REFINE_SEARCH', payload: { location: 'Colombo', propertyType: 'APARTMENT' } },
          { id: 'houses_under_35m', label: 'Houses under 35M', type: 'REFINE_SEARCH', payload: { propertyType: 'HOUSE', maxPrice: 35000000 } },
          { id: 'view_wishlist', label: 'My Saved Properties', type: 'NAVIGATE', payload: { target: 'portal', tab: 'wishlist' } },
        ],
        suggestedQuestions: [
          'Find 3 bedroom houses in Colombo under 30 million',
          'Show apartments in Rajagiriya',
          'What is a perch in Sri Lanka?',
        ],
      };
    }

    case 'PROPERTY_SEARCH': {
      return await handlePropertySearch(query, session, currentUserRole, currentUserId, lang, startTime);
    }

    case 'PROPERTY_DETAILS': {
      return await handlePropertyDetails(query, request.contextPropertyId || session.contextPropertyId, currentUserRole, currentUserId, lang, startTime);
    }

    case 'PROPERTY_COMPARISON': {
      return await handlePropertyComparison(query, session, currentUserId, currentUserRole, lang, startTime);
    }

    case 'WISHLIST': {
      return await handleWishlistRequest(query, request.contextPropertyId || session.contextPropertyId, currentUserId, lang, startTime);
    }

    case 'APPOINTMENT': {
      return await handleAppointmentRequest(query, request.contextPropertyId || session.contextPropertyId, currentUserId, currentUserRole, lang, startTime);
    }

    case 'INQUIRY': {
      return await handleInquiryRequest(query, currentUserId, currentUserRole, lang, startTime);
    }

    case 'COMPLAINT': {
      return await handleComplaintRequest(query, currentUserId, currentUserRole, lang, startTime);
    }

    case 'ACCOUNT': {
      return await handleAccountRequest(query, currentUserId, currentUserRole, lang, startTime);
    }

    case 'GENERAL_PROPERTY_QUESTION': {
      return await handleGeneralQuestion(query, lang, startTime);
    }

    case 'WEBSITE_HELP': {
      return await handleWebsiteHelp(lang, startTime);
    }

    case 'UNKNOWN':
    default: {
      return await handleFallbackOrUnknown(query, session, lang, startTime);
    }
  }
}

/**
 * Function 1: Natural Language Property Search using existing searchProperties service
 */
async function handlePropertySearch(
  query: string,
  session: any,
  currentUserRole?: UserRole,
  currentUserId?: string,
  lang: 'en' | 'si' | 'ta' = 'en',
  startTime: number = Date.now()
): Promise<AdvisorResponse> {
  // Extract and merge criteria with session memory
  const criteria = extractStructuredCriteria(query, session.searchCriteria);
  updateSessionContext(session.sessionId, { searchCriteria: criteria, lastIntent: 'PROPERTY_SEARCH' });

  // Invoke existing SearchService with verified criteria
  const searchResult = await searchProperties(
    {
      keyword: criteria.keyword,
      location: criteria.location,
      propertyType: criteria.propertyType,
      minPrice: criteria.minPrice,
      maxPrice: criteria.maxPrice,
      bedrooms: criteria.bedrooms,
      amenities: criteria.amenities,
      sortBy: criteria.sortBy || 'price',
      sortOrder: criteria.sortOrder || 'ASC',
      page: 1,
      size: 6,
    },
    currentUserRole,
    currentUserId
  );

  const total = searchResult.totalElements;
  const cards = searchResult.content.map(toAdvisorCard);
  updateSessionContext(session.sessionId, { lastPropertyIds: cards.map(c => c.id) });

  // Natural explainable search summary
  let explanation = '';
  const filterDescParts: string[] = [];
  if (criteria.bedrooms) filterDescParts.push(`${criteria.bedrooms}-bedroom`);
  if (criteria.propertyType && criteria.propertyType !== 'ALL') filterDescParts.push(criteria.propertyType.toLowerCase());
  if (criteria.location) filterDescParts.push(`in ${criteria.location}`);
  if (criteria.maxPrice) filterDescParts.push(`under ${formatLKR(criteria.maxPrice)}`);

  const descStr = filterDescParts.length > 0 ? filterDescParts.join(' ') : 'active';

  if (total === 0) {
    explanation = lang === 'si'
      ? `ඔබ සෙවූ නිර්ණායකවලට ගැලපෙන සක්‍රීය දේපළ හමු නොවීය (${descStr}). මිල පරාසය හෝ ප්‍රදේශය වෙනස් කර නැවත සොයන්න.`
      : lang === 'ta'
      ? `உங்கள் அளவுகோல்களுடன் பொருந்தக்கூடிய சொத்துகள் எதுவும் கிடைக்கவில்லை (${descStr}). உங்கள் பட்ஜெட் அல்லது இருப்பிடத்தை மாற்றி முயற்சிக்கவும்.`
      : `I couldn't find any active properties matching your specific criteria (${descStr}). Try adjusting your budget or expanding your location.`;

    return {
      intent: 'PROPERTY_SEARCH',
      message: explanation,
      confidence: 'VERIFIED',
      properties: [],
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
      criteria,
      quickActions: [
        { id: 'view_all', label: 'View All Properties', type: 'NAVIGATE', payload: { target: 'properties' } },
        { id: 'clear_filters', label: 'Reset Search Filters', type: 'REFINE_SEARCH', payload: {} },
      ],
      suggestedQuestions: [
        'Show all houses in Colombo',
        'Show apartments under 40M',
      ],
    };
  }

  explanation = lang === 'si'
    ? `ඔබගේ නිර්ණායකවලට (${descStr}) ගැලපෙන සත්‍යාපිත දේපළ ${total}ක් හමුවිය.`
    : lang === 'ta'
    ? `உங்கள் அளவுகோல்களுக்கு (${descStr}) பொருந்தக்கூடிய ${total} சரிபார்க்கப்பட்ட சொத்துகள் கிடைத்தன.`
    : `I found ${total} verified active ${total === 1 ? 'property' : 'properties'} matching your criteria (${descStr}).`;

  // Contextual Quick Actions
  const quickActions: AdvisorAction[] = [
    { id: 'view_all', label: `View All ${total} Results`, type: 'NAVIGATE', payload: { target: 'properties', criteria } },
  ];

  if (cards.length >= 2) {
    quickActions.push({
      id: 'compare_results',
      label: 'Compare Top Matches',
      type: 'COMPARE_ADD',
      payload: { propertyIds: cards.slice(0, 2).map(c => c.id) },
    });
  }

  return {
    intent: 'PROPERTY_SEARCH',
    message: explanation,
    confidence: 'VERIFIED',
    properties: cards,
    fastPath: true,
    responseTimeMs: Date.now() - startTime,
    criteria,
    quickActions,
    suggestedQuestions: [
      criteria.bedrooms ? 'Show properties with pool' : `Only ${cards[0]?.bedrooms || 3} bedrooms`,
      'Which of these is the cheapest?',
      'Can I book a viewing?',
    ],
  };
}

/**
 * Function 2: Verified Property Details from real database entity
 */
async function handlePropertyDetails(
  query: string,
  contextPropertyId?: string,
  currentUserRole?: UserRole,
  currentUserId?: string,
  lang: 'en' | 'si' | 'ta' = 'en',
  startTime: number = Date.now()
): Promise<AdvisorResponse> {
  if (!contextPropertyId) {
    return {
      intent: 'PROPERTY_DETAILS',
      message: 'Please select or view a property first, or tell me the property name you are inquiring about.',
      confidence: 'UNKNOWN',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
    };
  }

  try {
    const prop = await getPropertyById(contextPropertyId, currentUserRole, currentUserId);
    const clean = query.toLowerCase();

    // Specific deterministic question answers
    if (/\b(price|cost|how much|worth)\b/i.test(clean)) {
      return {
        intent: 'PROPERTY_DETAILS',
        message: `The listed asking price for "${prop.title}" in ${prop.location} is **${formatLKR(prop.price)}**. Current status is **${prop.status}**.`,
        confidence: 'VERIFIED',
        properties: [toAdvisorCard(prop)],
        fastPath: true,
        responseTimeMs: Date.now() - startTime,
        quickActions: [
          { id: 'book_viewing', label: 'Book a Viewing', type: 'BOOK_VIEWING', payload: { propertyId: prop.id } },
          { id: 'contact_agent', label: 'Contact Listing Agent', type: 'CONTACT_AGENT', payload: { propertyId: prop.id } },
        ],
      };
    }

    if (/\b(bedroom|bedrooms|beds|bath|bathrooms|area|size|sq ft|specs)\b/i.test(clean)) {
      return {
        intent: 'PROPERTY_DETAILS',
        message: `Specifications for "${prop.title}":\n• Bedrooms: ${prop.bedrooms}\n• Bathrooms: ${prop.bathrooms}\n• Living Area: ${prop.area.toLocaleString()} sq ft\n• Property Type: ${prop.propertyType}\n• Location: ${prop.location}`,
        confidence: 'VERIFIED',
        properties: [toAdvisorCard(prop)],
        fastPath: true,
        responseTimeMs: Date.now() - startTime,
      };
    }

    if (/\b(amenities|features|facilities|solar|pool|garden)\b/i.test(clean)) {
      const amenitiesList = prop.amenities && prop.amenities.length > 0 ? prop.amenities.join(', ') : 'None listed in listing records';
      return {
        intent: 'PROPERTY_DETAILS',
        message: `Verified amenities for "${prop.title}":\n${amenitiesList}`,
        confidence: 'VERIFIED',
        properties: [toAdvisorCard(prop)],
        fastPath: true,
        responseTimeMs: Date.now() - startTime,
      };
    }

    // Default overview
    return {
      intent: 'PROPERTY_DETAILS',
      message: `**${prop.title}** (${prop.location})\nPrice: **${formatLKR(prop.price)}** | ${prop.bedrooms} Beds · ${prop.bathrooms} Baths · ${prop.area.toLocaleString()} sq ft\nStatus: ${prop.status}\n\n${prop.description}`,
      confidence: 'VERIFIED',
      properties: [toAdvisorCard(prop)],
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
      quickActions: [
        { id: 'save_wishlist', label: 'Add to Wishlist', type: 'WISHLIST_ADD', payload: { propertyId: prop.id } },
        { id: 'book_viewing', label: 'Schedule Viewing', type: 'BOOK_VIEWING', payload: { propertyId: prop.id } },
        { id: 'compare', label: 'Add to Comparison', type: 'COMPARE_ADD', payload: { propertyId: prop.id } },
      ],
    };
  } catch (err) {
    return {
      intent: 'PROPERTY_DETAILS',
      message: "That property information isn't available in the current listing database.",
      confidence: 'UNKNOWN',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Function 6: Property Comparison using existing ComparisonService
 */
async function handlePropertyComparison(
  query: string,
  session: any,
  currentUserId?: string,
  currentUserRole?: UserRole,
  lang: 'en' | 'si' | 'ta' = 'en',
  startTime: number = Date.now()
): Promise<AdvisorResponse> {
  if (!currentUserId) {
    return {
      intent: 'PROPERTY_COMPARISON',
      message: 'Please sign in to compare properties side-by-side and save comparison lists.',
      confidence: 'VERIFIED',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
      quickActions: [
        { id: 'login', label: 'Sign In to Compare', type: 'NAVIGATE', payload: { target: 'login' } },
      ],
    };
  }

  // Get customer comparison lists
  const comps = await getCustomerComparisons(currentUserId);
  if (comps.length === 0 && (!session.lastPropertyIds || session.lastPropertyIds.length < 2)) {
    return {
      intent: 'PROPERTY_COMPARISON',
      message: 'You have not added any properties to your comparison list yet. You can add up to 4 properties from search results or property pages.',
      confidence: 'VERIFIED',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
      quickActions: [
        { id: 'browse', label: 'Browse Properties', type: 'NAVIGATE', payload: { target: 'properties' } },
      ],
    };
  }

  // If customer has a comparison list, load it
  if (comps.length > 0) {
    const activeComp = await getComparison(currentUserId, comps[0].id);
    const properties = activeComp.properties;

    if (properties.length === 0) {
      return {
        intent: 'PROPERTY_COMPARISON',
        message: `Your comparison list "${activeComp.comparison.name}" is currently empty. Add properties to compare price, area, and bedrooms side-by-side.`,
        confidence: 'VERIFIED',
        fastPath: true,
        responseTimeMs: Date.now() - startTime,
      };
    }

    // Factual calculation (Cheapest, Largest, Bedrooms)
    const sortedByPrice = [...properties].sort((a, b) => a.price - b.price);
    const sortedByArea = [...properties].sort((a, b) => b.area - a.area);
    const cheapest = sortedByPrice[0];
    const largest = sortedByArea[0];

    let summary = `**Comparison: ${activeComp.comparison.name} (${properties.length} Properties)**\n\n`;
    summary += `• **Lowest Price**: "${cheapest.title}" at **${formatLKR(cheapest.price)}**\n`;
    summary += `• **Largest Living Area**: "${largest.title}" with **${largest.area.toLocaleString()} sq ft**\n`;

    if (properties.length >= 2) {
      const priceDiff = Math.abs(properties[0].price - properties[1].price);
      summary += `• Price difference between first two: **${formatLKR(priceDiff)}**\n`;
    }

    return {
      intent: 'PROPERTY_COMPARISON',
      message: summary,
      confidence: 'VERIFIED',
      properties: properties.map(toAdvisorCard),
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
      quickActions: [
        { id: 'view_portal_comp', label: 'Open Full Comparison Matrix', type: 'NAVIGATE', payload: { target: 'portal', tab: 'comparisons' } },
      ],
    };
  }

  // Fallback: compare recent search results
  return {
    intent: 'PROPERTY_COMPARISON',
    message: 'To compare specific listings, use the "[Add to Compare]" button on any property card or listing.',
    confidence: 'VERIFIED',
    fastPath: true,
    responseTimeMs: Date.now() - startTime,
  };
}

/**
 * Function 6: Wishlist Integration using existing WishlistService
 */
async function handleWishlistRequest(
  query: string,
  contextPropertyId?: string,
  currentUserId?: string,
  lang: 'en' | 'si' | 'ta' = 'en',
  startTime: number = Date.now()
): Promise<AdvisorResponse> {
  if (!currentUserId) {
    return {
      intent: 'WISHLIST',
      message: 'Please sign in to view, save, and manage properties in your wishlist.',
      confidence: 'VERIFIED',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
      quickActions: [
        { id: 'signin', label: 'Sign In', type: 'NAVIGATE', payload: { target: 'login' } },
      ],
    };
  }

  const wishlist = await getCustomerWishlist(currentUserId);
  const items = wishlist.items;
  const clean = query.toLowerCase();

  // If asking to add context property
  if (contextPropertyId && (clean.includes('add') || clean.includes('save'))) {
    const toggle = await toggleWishlistItem(currentUserId, contextPropertyId);
    return {
      intent: 'WISHLIST',
      message: toggle.saved
        ? 'Property has been successfully saved to your wishlist!'
        : 'Property has been removed from your wishlist.',
      confidence: 'VERIFIED',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
      quickActions: [
        { id: 'view_wishlist', label: 'View Wishlist', type: 'NAVIGATE', payload: { target: 'portal', tab: 'wishlist' } },
      ],
    };
  }

  // Check if specific property is saved
  if (contextPropertyId && (clean.includes('is this') || clean.includes('already'))) {
    const isSaved = items.some(i => i.propertyId === contextPropertyId);
    return {
      intent: 'WISHLIST',
      message: isSaved
        ? 'Yes, this property is currently saved in your wishlist.'
        : 'No, this property is not in your wishlist yet.',
      confidence: 'VERIFIED',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
      quickActions: [
        {
          id: isSaved ? 'remove_saved' : 'add_saved',
          label: isSaved ? 'Remove from Wishlist' : 'Add to Wishlist',
          type: isSaved ? 'WISHLIST_REMOVE' : 'WISHLIST_ADD',
          payload: { propertyId: contextPropertyId },
        },
      ],
    };
  }

  // Display count or list
  const count = items.length;
  if (count === 0) {
    return {
      intent: 'WISHLIST',
      message: 'You have **0 properties** saved in your wishlist. Click the heart icon on any property to save it for later.',
      confidence: 'VERIFIED',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
      quickActions: [
        { id: 'browse', label: 'Browse Properties', type: 'NAVIGATE', payload: { target: 'properties' } },
      ],
    };
  }

  const properties = items.map(i => i.property).filter(Boolean) as Property[];
  return {
    intent: 'WISHLIST',
    message: `You currently have **${count} saved ${count === 1 ? 'property' : 'properties'}** in your wishlist.`,
    confidence: 'VERIFIED',
    properties: properties.slice(0, 4).map(toAdvisorCard),
    fastPath: true,
    responseTimeMs: Date.now() - startTime,
    quickActions: [
      { id: 'view_portal_wishlist', label: 'View Complete Wishlist', type: 'NAVIGATE', payload: { target: 'portal', tab: 'wishlist' } },
    ],
  };
}

/**
 * Function 5: Appointment Integration using existing AppointmentService
 */
async function handleAppointmentRequest(
  query: string,
  contextPropertyId?: string,
  currentUserId?: string,
  currentUserRole?: UserRole,
  lang: 'en' | 'si' | 'ta' = 'en',
  startTime: number = Date.now()
): Promise<AdvisorResponse> {
  if (!currentUserId) {
    return {
      intent: 'APPOINTMENT',
      message: 'Please sign in to view your scheduled viewings or book a property tour with a certified agent.',
      confidence: 'VERIFIED',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
      quickActions: [
        { id: 'login', label: 'Sign In', type: 'NAVIGATE', payload: { target: 'login' } },
      ],
    };
  }

  const clean = query.toLowerCase();

  // If asking to book viewing for context property
  if (contextPropertyId && (clean.includes('book') || clean.includes('schedule') || clean.includes('can i book'))) {
    const prop = await getPropertyById(contextPropertyId, currentUserRole, currentUserId);
    return {
      intent: 'APPOINTMENT',
      message: `Would you like to book an in-person viewing for **"${prop.title}"** with one of our certified agents?\n\nAppointments require a date and time confirmation to prevent scheduling conflicts.`,
      confidence: 'VERIFIED',
      properties: [toAdvisorCard(prop)],
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
      quickActions: [
        { id: 'book_now', label: 'Schedule Viewing Now', type: 'BOOK_VIEWING', payload: { propertyId: prop.id }, primary: true },
      ],
    };
  }

  // Otherwise, list upcoming appointments
  const allAppointments = await getUserAppointments(currentUserId, currentUserRole || 'CUSTOMER');
  const now = Date.now();
  const upcoming = allAppointments.filter(a => a.appointmentTime >= now && a.status !== 'CANCELLED');

  if (upcoming.length === 0) {
    return {
      intent: 'APPOINTMENT',
      message: 'You have no upcoming viewing appointments scheduled at this time.',
      confidence: 'VERIFIED',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
      quickActions: [
        { id: 'browse', label: 'Browse Properties to Book', type: 'NAVIGATE', payload: { target: 'properties' } },
        { id: 'view_past', label: 'View Appointment History', type: 'NAVIGATE', payload: { target: 'portal', tab: 'appointments' } },
      ],
    };
  }

  const nextApt = upcoming[0];
  const dateFormatted = new Date(nextApt.appointmentTime).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const timeFormatted = new Date(nextApt.appointmentTime).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return {
    intent: 'APPOINTMENT',
    message: `You have **${upcoming.length} upcoming viewing ${upcoming.length === 1 ? 'appointment' : 'appointments'}**.\n\nNext viewing: **${nextApt.propertyTitle}**\n• Date: ${dateFormatted} at ${timeFormatted}\n• Agent: ${nextApt.agentName}\n• Status: **${nextApt.status}**`,
    confidence: 'VERIFIED',
    fastPath: true,
    responseTimeMs: Date.now() - startTime,
    quickActions: [
      { id: 'view_appointments', label: 'Manage All Appointments', type: 'NAVIGATE', payload: { target: 'portal', tab: 'appointments' } },
    ],
  };
}

/**
 * Function 4: Inquiries Integration using existing FeedbackService
 */
async function handleInquiryRequest(
  query: string,
  currentUserId?: string,
  currentUserRole?: UserRole,
  lang: 'en' | 'si' | 'ta' = 'en',
  startTime: number = Date.now()
): Promise<AdvisorResponse> {
  if (!currentUserId) {
    return {
      intent: 'INQUIRY',
      message: 'Please sign in to check your open inquiries or contact a licensed property consultant.',
      confidence: 'VERIFIED',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
      quickActions: [{ id: 'login', label: 'Sign In', type: 'NAVIGATE', payload: { target: 'login' } }],
    };
  }

  const inqs = await listInquiries(currentUserId, currentUserRole || 'CUSTOMER');
  const open = inqs.filter(i => i.status === 'NEW' || i.status === 'IN_PROGRESS');

  if (open.length === 0) {
    return {
      intent: 'INQUIRY',
      message: 'You currently have no open inquiries. You can submit inquiries directly on any property detail page.',
      confidence: 'VERIFIED',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
      quickActions: [
        { id: 'portal_inqs', label: 'View Inquiries History', type: 'NAVIGATE', payload: { target: 'portal', tab: 'inquiries' } },
      ],
    };
  }

  const latest = open[0];
  return {
    intent: 'INQUIRY',
    message: `You have **${open.length} open ${open.length === 1 ? 'inquiry' : 'inquiries'}**.\n\nLatest Ticket **[${latest.ticketId}]**: "${latest.subject}" for ${latest.propertyTitle}\nStatus: **${latest.status}**`,
    confidence: 'VERIFIED',
    fastPath: true,
    responseTimeMs: Date.now() - startTime,
    quickActions: [
      { id: 'portal_inqs', label: 'View All Inquiries', type: 'NAVIGATE', payload: { target: 'portal', tab: 'inquiries' } },
    ],
  };
}

/**
 * Function 4: Complaints Integration
 */
async function handleComplaintRequest(
  query: string,
  currentUserId?: string,
  currentUserRole?: UserRole,
  lang: 'en' | 'si' | 'ta' = 'en',
  startTime: number = Date.now()
): Promise<AdvisorResponse> {
  if (!currentUserId) {
    return {
      intent: 'COMPLAINT',
      message: 'Please sign in to view the status of your complaints or submit a dispute ticket.',
      confidence: 'VERIFIED',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
      quickActions: [{ id: 'login', label: 'Sign In', type: 'NAVIGATE', payload: { target: 'login' } }],
    };
  }

  const cmps = await listComplaints(currentUserId, currentUserRole || 'CUSTOMER');
  const open = cmps.filter(c => c.status === 'NEW' || c.status === 'IN_PROGRESS');

  if (open.length === 0) {
    return {
      intent: 'COMPLAINT',
      message: 'You have no open complaints or dispute tickets. All previous requests have been resolved or closed.',
      confidence: 'VERIFIED',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
      quickActions: [
        { id: 'portal_cmps', label: 'View Complaints Log', type: 'NAVIGATE', payload: { target: 'portal', tab: 'complaints' } },
      ],
    };
  }

  const latest = open[0];
  return {
    intent: 'COMPLAINT',
    message: `You have **${open.length} active ${open.length === 1 ? 'ticket' : 'tickets'}**.\n\nLatest: **[${latest.ticketId}]** "${latest.subject}"\nStatus: **${latest.status}**`,
    confidence: 'VERIFIED',
    fastPath: true,
    responseTimeMs: Date.now() - startTime,
    quickActions: [
      { id: 'portal_cmps', label: 'Open Complaints Desk', type: 'NAVIGATE', payload: { target: 'portal', tab: 'complaints' } },
    ],
  };
}

/**
 * Function 3: Account & Safe Identity Handling
 */
async function handleAccountRequest(
  query: string,
  currentUserId?: string,
  currentUserRole?: UserRole,
  lang: 'en' | 'si' | 'ta' = 'en',
  startTime: number = Date.now()
): Promise<AdvisorResponse> {
  if (!currentUserId) {
    return {
      intent: 'ACCOUNT',
      message: 'You are currently not signed in. Sign in to view and manage your account details.',
      confidence: 'VERIFIED',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
      quickActions: [{ id: 'login', label: 'Sign In', type: 'NAVIGATE', payload: { target: 'login' } }],
    };
  }

  const clean = query.toLowerCase();

  // Sensitive action redirect
  if (/\b(password|reset password|change password|security|auth)\b/i.test(clean)) {
    return {
      intent: 'ACCOUNT',
      message: 'For your security, password and credential changes must be performed directly in your Account Security settings.',
      confidence: 'VERIFIED',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
      quickActions: [
        { id: 'security_settings', label: 'Open Security & Password Settings', type: 'NAVIGATE', payload: { target: 'portal', tab: 'profile' } },
      ],
    };
  }

  // Safe details retrieval
  const { queryOne } = await import('../db/database.js');
  const user = await queryOne<{ full_name: string; email: string; phone: string | null; role: string }>(
    'SELECT full_name, email, phone, role FROM users WHERE id = ?',
    [currentUserId]
  );

  if (!user) {
    return {
      intent: 'ACCOUNT',
      message: 'Account records could not be retrieved.',
      confidence: 'UNKNOWN',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
    };
  }

  return {
    intent: 'ACCOUNT',
    message: `Account Details:\n• Name: **${user.full_name}**\n• Email: **${user.email}**\n• Phone: ${user.phone || 'Not registered'}\n• Role: **${user.role}**`,
    confidence: 'VERIFIED',
    fastPath: true,
    responseTimeMs: Date.now() - startTime,
    quickActions: [
      { id: 'profile', label: 'Manage Profile & Privacy', type: 'NAVIGATE', payload: { target: 'portal', tab: 'profile' } },
    ],
  };
}

/**
 * General Real Estate Questions (Perch, Bimsaviya, Condo vs Apt, Deeds)
 */
async function handleGeneralQuestion(
  query: string,
  lang: 'en' | 'si' | 'ta' = 'en',
  startTime: number = Date.now()
): Promise<AdvisorResponse> {
  const clean = query.toLowerCase();

  // Match against authoritative static dictionary
  let matchedKey = '';
  if (clean.includes('perch')) matchedKey = 'perch';
  else if (clean.includes('bimsaviya')) matchedKey = 'bimsaviya';
  else if (clean.includes('condo') || clean.includes('condominium') || clean.includes('apartment')) matchedKey = 'condo_vs_apartment';
  else if (clean.includes('deed') || clean.includes('document')) matchedKey = 'deed_documents';

  if (matchedKey && SRI_LANKAN_KNOWLEDGE[matchedKey]) {
    const entry = SRI_LANKAN_KNOWLEDGE[matchedKey];
    const text = entry[lang] || entry.en;

    return {
      intent: 'GENERAL_PROPERTY_QUESTION',
      message: `${text}\n\n*Note: This information is for general educational guidance and should not be construed as professional legal or financial advice.*`,
      confidence: 'GENERAL_KNOWLEDGE',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
      suggestedQuestions: [
        'What is Bimsaviya title deed?',
        'How many square feet in a perch?',
        'Search properties in Colombo',
      ],
    };
  }

  // If complex and requires LLM explanation
  return await generateAiGeneralExplanation(query, lang, startTime);
}

/**
 * AI Path for General Question when not in static knowledge base
 */
async function generateAiGeneralExplanation(
  query: string,
  lang: 'en' | 'si' | 'ta' = 'en',
  startTime: number = Date.now()
): Promise<AdvisorResponse> {
  const ai = getAiClient();
  const prompt = `You are the Nexus Property Sri Lanka Real Estate Advisor.
Answer this general property question concisely and factually according to Sri Lankan real estate laws, terminology, and practices:
"${query}"

Rules:
- Respond in ${lang === 'si' ? 'Sinhala' : lang === 'ta' ? 'Tamil' : 'English'}.
- Keep answer under 150 words.
- Use natural Sri Lankan real estate terminology (LKR, perches, UDA, Bimsaviya).
- Do not provide formal legal/tax guarantees; provide objective educational guidance.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are a licensed Sri Lankan property advisor. Keep answers concise, factual, and strictly objective.',
      },
    });

    return {
      intent: 'GENERAL_PROPERTY_QUESTION',
      message: `${response.text || 'Unable to generate explanation.'}\n\n*Note: Educational guidance only, not formal legal advice.*`,
      confidence: 'GENERAL_KNOWLEDGE',
      fastPath: false,
      modelUsed: 'gemini-3.8-flash',
      responseTimeMs: Date.now() - startTime,
    };
  } catch (err) {
    return {
      intent: 'GENERAL_PROPERTY_QUESTION',
      message: 'Nexus Property recommends consulting with our certified real estate legal team and examining official Land Registry extracts regarding this question.',
      confidence: 'GENERAL_KNOWLEDGE',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Website Navigation & Help
 */
async function handleWebsiteHelp(lang: 'en' | 'si' | 'ta' = 'en', startTime: number = Date.now()): Promise<AdvisorResponse> {
  const msg = lang === 'si'
    ? 'නෙක්සස් ප්‍රොපර්ටි පද්ධතිය හරහා ඔබට පහත සේවාවන් ලබාගත හැක:\n• **දේපළ සෙවීම**: දිස්ත්‍රික්ක, මිල, වර්ග සහ පහසුකම් අනුව සෙවීම\n• **සංසන්දනය**: දේපළ 4ක් දක්වා මිල සහ වර්ග අඩි සංසන්දනය\n• **සුරැකි ලැයිස්තුව**: කැමති දේපළ සුරැකීම\n• **නැරඹුම් වෙන්කිරීම**: නියෝජිතයන් සමග දිනයක් වෙන්කර ගැනීම\n• **විමසීම් හා සහය**: ක්ෂණික පාරිභෝගික සහය'
    : lang === 'ta'
    ? 'நெக்ஸஸ் பிராப்பர்ட்டி தளம் மூலம் நீங்கள் பின்வரும் சேவைகளைப் பெறலாம்:\n• **சொத்து தேடல்**: மாவட்டங்கள், விலை, படுக்கையறைகள் மூலம் வடிகட்டலாம்\n• **ஒப்பீடு**: 4 சொத்துகள் வரை ஒப்பிடலாம்\n• **விருப்பப்பட்டியல்**: விரும்பிய சொத்துகளை சேமிக்கலாம்\n• **பார்வையிடல் முன்பதிவு**: முகவர்களுடன் நேரத்தை முன்பதிவு செய்யலாம்'
    : 'Here is what you can do on Nexus Property:\n• **Search**: Filter by 25 districts, property type, price (LKR), and bedrooms\n• **Compare**: Add up to 4 properties for side-by-side spec and price comparison\n• **Wishlist**: Save favorite listings to your customer dashboard\n• **Viewings**: Book confirmed viewing slots with verified agents\n• **Inquiries**: Contact agents directly with tracked ticket numbers';

  return {
    intent: 'WEBSITE_HELP',
    message: msg,
    confidence: 'VERIFIED',
    fastPath: true,
    responseTimeMs: Date.now() - startTime,
    quickActions: [
      { id: 'search', label: 'Search Marketplace', type: 'NAVIGATE', payload: { target: 'properties' } },
      { id: 'portal', label: 'Customer Portal', type: 'NAVIGATE', payload: { target: 'portal' } },
    ],
  };
}

/**
 * Fallback & Ambiguous Query Recovery
 */
async function handleFallbackOrUnknown(
  query: string,
  session: any,
  lang: 'en' | 'si' | 'ta' = 'en',
  startTime: number = Date.now()
): Promise<AdvisorResponse> {
  // Check if query might be a malformed search query
  const loc = parseSriLankanLocation(query);
  const type = parsePropertyType(query);
  const price = parsePriceRange(query);
  const beds = parseBedrooms(query);

  if (loc.location || type || price.maxPrice || beds) {
    // Malformed search interpretation
    return await handlePropertySearch(query, session, undefined, undefined, lang, startTime);
  }

  const msg = lang === 'si'
    ? 'මට ඔබේ විමසුම නිවැරදිව තේරුම් ගැනීමට නොහැකි විය. ඔබට නිවාස, මහල් නිවාස හෝ ඉඩම් සෙවීමට, මිල ගණන් පරීක්ෂා කිරීමට හෝ නැරඹුම් වෙන්කරවා ගැනීමට විමසිය හැක.'
    : lang === 'ta'
    ? 'உங்கள் வினவலை சரியாகப் புரிந்து கொள்ள முடியவில்லை. வீடுகள், அடுக்குமாடிகளைத் தேட அல்லது பார்வையிட முன்பதிவு செய்ய நீங்கள் கேட்கலாம்.'
    : 'I\'m not quite sure I understood that. You can ask me to find properties (e.g., "3 bedroom houses in Colombo under 35M"), compare listings, check your saved wishlist, or book viewing appointments.';

  return {
    intent: 'UNKNOWN',
    message: msg,
    confidence: 'UNKNOWN',
    fastPath: true,
    responseTimeMs: Date.now() - startTime,
    suggestedQuestions: [
      'Find 3 bedroom houses in Colombo',
      'Apartments under 30 million',
      'What is a perch in Sri Lanka?',
    ],
  };
}

/**
 * Executes confirmed consequential action
 */
async function executeConfirmedAction(
  confirmedAction: { action: string; payload: Record<string, any> },
  currentUserId?: string,
  currentUserRole?: UserRole,
  sessionId?: string,
  startTime: number = Date.now()
): Promise<AdvisorResponse> {
  if (!currentUserId) {
    return {
      intent: 'ACCOUNT',
      message: 'Authentication required to execute this operation.',
      confidence: 'UNKNOWN',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
    };
  }

  const { action, payload } = confirmedAction;

  if (action === 'TOGGLE_WISHLIST' && payload.propertyId) {
    const res = await toggleWishlistItem(currentUserId, payload.propertyId);
    await logAudit(currentUserId, 'AI_WISHLIST_TOGGLE', 'WISHLIST', payload.propertyId, 'Toggled wishlist via AI Advisor');
    return {
      intent: 'WISHLIST',
      message: res.saved ? 'Property successfully saved to your wishlist!' : 'Property removed from your wishlist.',
      confidence: 'VERIFIED',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
    };
  }

  if (action === 'ADD_TO_COMPARE' && payload.propertyId) {
    const res = await quickAddToComparison(currentUserId, payload.propertyId);
    await logAudit(currentUserId, 'AI_COMPARE_ADD', 'PROPERTY_COMPARISON', payload.propertyId, 'Added to compare via AI Advisor');
    return {
      intent: 'PROPERTY_COMPARISON',
      message: res.message,
      confidence: 'VERIFIED',
      fastPath: true,
      responseTimeMs: Date.now() - startTime,
    };
  }

  return {
    intent: 'UNKNOWN',
    message: 'Action completed.',
    confidence: 'VERIFIED',
    fastPath: true,
    responseTimeMs: Date.now() - startTime,
  };
}

/**
 * Suggestions generator based on page context
 */
export function getContextualSuggestions(pageContext: 'home' | 'properties' | 'detail' | 'portal' | 'other' = 'home'): string[] {
  switch (pageContext) {
    case 'detail':
      return [
        'What is the price of this property?',
        'How many bedrooms and bathrooms?',
        'Can I book a viewing for this property?',
        'What amenities are included?',
      ];
    case 'portal':
      return [
        'Show my upcoming viewings',
        'How many properties in my wishlist?',
        'Show my comparison list',
        'What is the status of my inquiries?',
      ];
    case 'properties':
      return [
        'Find 3 bedroom houses under 35M in Colombo',
        'Apartments in Rajagiriya below 30 million',
        'Land plots for sale in Negombo',
        'Villas in Galle Fort',
      ];
    case 'home':
    default:
      return [
        'Find a property in Colombo under 30M',
        'Show 3 bedroom houses in Colombo',
        'Apartments under LKR 25M',
        'What is a perch in Sri Lanka?',
      ];
  }
}
