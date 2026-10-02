/**
 * Master AI Advisor Service for Nexus Property
 * Connects natural language interface directly to real database services.
 * Implements strict grounding, anti-hallucination, caching, rate limiting, and hybrid execution.
 */

import { UserRole } from '../../types/index.js';
import { aiConfig } from '../config/aiAdvisorConfig.js';
import {
  AIAdvisorRequest,
  AIAdvisorResponse,
  ConversationContext,
  IntentType,
  PropertyQuery,
} from '../dto/aiAdvisorDto.js';
import { validateAndSanitizeAdvisorRequest } from '../validation/aiAdvisorRequestValidator.js';
import {
  buildPropertyQuery,
  extractPriceRange,
  extractLocation,
  extractPropertyType,
  extractBedrooms,
  resolveReferencedPropertyIds,
} from './propertyQueryService.js';
import { detectUserIntent } from './intentDetectionService.js';
import { toAIPropertyResults, toAIPropertyResult } from '../mapper/aiAdvisorMapper.js';
import {
  synthesizeResponseWithAI,
  synthesizeSearchResponse,
  synthesizePropertyDetailsResponse,
  synthesizeComparisonResponse,
  synthesizeAppointmentsResponse,
  synthesizeWishlistResponse,
  synthesizeTicketsResponse,
} from './aiResponseService.js';

// Reused existing business services
import { searchProperties, getPropertyById } from '../../services/propertyService.js';
import { getCustomerWishlist, toggleWishlistItem } from '../../services/wishlistService.js';
import { getUserAppointments } from '../../services/appointmentService.js';
import { listInquiries, listComplaints } from '../../services/feedbackService.js';
import { validatePropertyExists, getCustomerComparisons, getComparison } from '../../services/comparisonService.js';
import { queryOne } from '../../db/database.js';

// In-Memory Lightweight Context Store (sliding window LRU)
const contextStore = new Map<string, ConversationContext>();

// In-Memory Safe Query Cache (queryKey -> { response, expiresAt })
const queryCache = new Map<string, { response: AIAdvisorResponse; expiresAt: number }>();

// In-Memory Rate Limiter (clientKey -> timestamps[])
const rateLimiter = new Map<string, number[]>();

// Observability Telemetry Counters
export const advisorTelemetry = {
  totalRequests: 0,
  deterministicCount: 0,
  aiModelCount: 0,
  cacheHits: 0,
  fallbackCount: 0,
  totalLatencyMs: 0,
  intentStats: {} as Record<string, number>,
};

function checkRateLimit(clientKey: string): boolean {
  const now = Date.now();
  const timestamps = rateLimiter.get(clientKey) || [];
  const valid = timestamps.filter(t => now - t < 60000);
  if (valid.length >= aiConfig.rateLimitPerMinute) {
    return false;
  }
  valid.push(now);
  rateLimiter.set(clientKey, valid);
  return true;
}

export function getConversationContext(conversationId?: string): ConversationContext | undefined {
  if (!conversationId) return undefined;
  return contextStore.get(conversationId);
}

export function saveConversationContext(context: ConversationContext): void {
  contextStore.set(context.conversationId, context);
  // Cap store size to 1000 active sessions
  if (contextStore.size > 1000) {
    const oldestKey = contextStore.keys().next().value;
    if (oldestKey) contextStore.delete(oldestKey);
  }
}

export function clearConversationContext(conversationId: string): void {
  contextStore.delete(conversationId);
}

export async function processAdvisorRequest(
  request: AIAdvisorRequest,
  currentUser?: { id: string; role: UserRole; fullName: string },
  clientIp: string = '127.0.0.1'
): Promise<AIAdvisorResponse> {
  const startTime = Date.now();
  advisorTelemetry.totalRequests++;

  // 1. Rate Limiting Check
  const rateLimitKey = currentUser?.id || clientIp;
  if (!checkRateLimit(rateLimitKey)) {
    return {
      answer: 'You have sent several queries in a short time. Please wait a moment before sending another message.',
      intent: 'SYSTEM_HELP',
      metrics: {
        totalTimeMs: Date.now() - startTime,
        intentDetectionMs: 0,
        backendExecutionMs: 0,
        path: 'DETERMINISTIC',
      },
    };
  }

  // 2. Input Validation & Prompt Injection Defense
  const validation = validateAndSanitizeAdvisorRequest(request.message);
  if (validation.isAdversarial) {
    return {
      answer: 'I am the Nexus Property AI Advisor. I can only assist with verified property searches, viewings, comparisons, and marketplace services in Sri Lanka.',
      intent: 'SYSTEM_HELP',
      metrics: {
        totalTimeMs: Date.now() - startTime,
        intentDetectionMs: 0,
        backendExecutionMs: 0,
        path: 'DETERMINISTIC',
      },
    };
  }

  const sanitizedMessage = validation.sanitizedMessage;
  const conversationId = request.conversationId || `conv_${currentUser?.id || 'anon'}`;
  const existingContext = getConversationContext(conversationId);

  // 3. Cache Check for Safe Non-Personalized Queries
  const isPersonalizedQuery = /\b(?:my|i|me|mine|book|cancel|save)\b/i.test(sanitizedMessage);
  const cacheKey = `pub_${sanitizedMessage.toLowerCase()}`;
  if (!isPersonalizedQuery) {
    const cached = queryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      advisorTelemetry.cacheHits++;
      return {
        ...cached.response,
        metrics: {
          ...cached.response.metrics,
          cached: true,
          totalTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  // 4. Intent Detection (< 1ms)
  const intentStart = Date.now();
  const { intent, reason } = detectUserIntent(
    sanitizedMessage,
    existingContext,
    request.contextPropertyId
  );
  const intentDetectionMs = Date.now() - intentStart;

  // Track intent stats
  advisorTelemetry.intentStats[intent] = (advisorTelemetry.intentStats[intent] || 0) + 1;

  // 5. Backend Execution according to detected intent
  const backendStart = Date.now();
  let response: AIAdvisorResponse;

  switch (intent) {
    case 'PROPERTY_SEARCH': {
      response = await handlePropertySearch(sanitizedMessage, existingContext, currentUser);
      break;
    }

    case 'PROPERTY_DETAILS': {
      response = await handlePropertyDetails(
        sanitizedMessage,
        request.contextPropertyId || existingContext?.lastReferencedPropertyId,
        currentUser
      );
      break;
    }

    case 'PROPERTY_COMPARISON': {
      response = await handlePropertyComparison(sanitizedMessage, existingContext, currentUser);
      break;
    }

    case 'WISHLIST': {
      response = await handleWishlistAction(sanitizedMessage, currentUser, existingContext);
      break;
    }

    case 'APPOINTMENT': {
      response = await handleAppointmentAction(sanitizedMessage, currentUser, existingContext);
      break;
    }

    case 'INQUIRY': {
      response = await handleInquiryAction(sanitizedMessage, currentUser);
      break;
    }

    case 'COMPLAINT': {
      response = await handleComplaintAction(sanitizedMessage, currentUser);
      break;
    }

    case 'ACCOUNT': {
      response = handleAccountAction(currentUser);
      break;
    }

    case 'GENERAL_PROPERTY_QUESTION': {
      response = handleGeneralPropertyQuestion(sanitizedMessage);
      break;
    }

    case 'SYSTEM_HELP': {
      response = handleSystemHelp();
      break;
    }

    case 'UNKNOWN':
    default: {
      response = handleUnknownQuery(sanitizedMessage);
      break;
    }
  }

  const backendExecutionMs = Date.now() - backendStart;
  const totalTimeMs = Date.now() - startTime;

  response.metrics = {
    totalTimeMs,
    intentDetectionMs,
    backendExecutionMs,
    path: response.metrics?.path || 'DETERMINISTIC',
  };

  advisorTelemetry.totalLatencyMs += totalTimeMs;
  if (response.metrics.path === 'DATABASE_AI') {
    advisorTelemetry.aiModelCount++;
  } else {
    advisorTelemetry.deterministicCount++;
  }

  // Update conversation context
  const updatedContext: ConversationContext = {
    conversationId,
    lastIntent: intent,
    lastCriteria: response.extractedCriteria || existingContext?.lastCriteria,
    lastReferencedPropertyId:
      response.properties?.[0]?.id || existingContext?.lastReferencedPropertyId,
    lastPropertyIds: response.properties?.map(p => p.id) || existingContext?.lastPropertyIds,
    updatedAt: Date.now(),
  };
  saveConversationContext(updatedContext);

  // Store in query cache if public & cacheable
  if (!isPersonalizedQuery && response.properties && response.properties.length > 0) {
    queryCache.set(cacheKey, {
      response,
      expiresAt: Date.now() + aiConfig.cacheTtlMs,
    });
  }

  return response;
}

/**
 * PATH A: Real Property Search via searchProperties Service
 */
async function handlePropertySearch(
  message: string,
  context?: ConversationContext,
  currentUser?: { id: string; role: UserRole }
): Promise<AIAdvisorResponse> {
  const criteria = buildPropertyQuery(message, context?.lastCriteria);

  // Call the real Function 1 searchProperties service
  const paginatedResult = await searchProperties(
    {
      location: criteria.location,
      propertyType: criteria.propertyType,
      minPrice: criteria.minPrice,
      maxPrice: criteria.maxPrice,
      bedrooms: criteria.minBedrooms,
      amenities: criteria.amenities,
      keyword: criteria.keyword,
      sortBy: criteria.sortBy || 'createdAt',
      sortOrder: criteria.sortOrder || 'DESC',
      size: aiConfig.maxPropertiesLimit,
      page: 1,
    },
    currentUser?.role,
    currentUser?.id
  );

  const mappedProps = toAIPropertyResults(paginatedResult.content);

  // Synthesize answer deterministically for guaranteed speed and zero hallucination
  const answer = synthesizeSearchResponse(mappedProps, criteria, paginatedResult.totalElements);

  const followUps: string[] = [];
  if (mappedProps.length > 0) {
    followUps.push(`Tell me about ${mappedProps[0].title}`);
    if (mappedProps.length >= 2) {
      followUps.push(`Compare ${mappedProps[0].id} and ${mappedProps[1].id}`);
    }
    followUps.push('Show properties with parking');
  } else {
    followUps.push('Show all houses in Colombo');
    followUps.push('Show apartments under LKR 30M');
  }

  return {
    answer,
    intent: 'PROPERTY_SEARCH',
    extractedCriteria: criteria,
    properties: mappedProps,
    totalMatches: paginatedResult.totalElements,
    suggestedFollowUps: followUps,
    metrics: {
      totalTimeMs: 0,
      intentDetectionMs: 0,
      backendExecutionMs: 0,
      path: 'DETERMINISTIC',
    },
  };
}

/**
 * PATH B: Grounded Property Details via getPropertyById
 */
async function handlePropertyDetails(
  message: string,
  contextPropertyId?: string,
  currentUser?: { id: string; role: UserRole }
): Promise<AIAdvisorResponse> {
  const resolvedIds = await resolveReferencedPropertyIds(message);
  const targetId = resolvedIds[0] || contextPropertyId;

  if (!targetId) {
    return {
      answer: 'Which property would you like details on? You can specify a property ID (e.g. "Property 101") or select one from the search results.',
      intent: 'PROPERTY_DETAILS',
      suggestedFollowUps: ['Show apartments in Colombo', 'Find houses in Nugegoda'],
      metrics: {
        totalTimeMs: 0,
        intentDetectionMs: 0,
        backendExecutionMs: 0,
        path: 'DETERMINISTIC',
      },
    };
  }

  try {
    const prop = await getPropertyById(targetId, currentUser?.role, currentUser?.id);
    const answer = synthesizePropertyDetailsResponse(prop, message);

    return {
      answer,
      intent: 'PROPERTY_DETAILS',
      properties: [toAIPropertyResult(prop)],
      action: {
        type: 'VIEW_PROPERTY',
        targetId: prop.id,
        label: 'View Property Listing',
      },
      suggestedFollowUps: [
        `Book a viewing for this property`,
        `Add this property to my wishlist`,
        `Does this property have parking?`,
      ],
      metrics: {
        totalTimeMs: 0,
        intentDetectionMs: 0,
        backendExecutionMs: 0,
        path: 'DETERMINISTIC',
      },
    };
  } catch {
    // Strictly anti-hallucination: Property does not exist
    return {
      answer: `I couldn't find property "${targetId}" in our active listing records. Please check the property number and try again.`,
      intent: 'PROPERTY_DETAILS',
      suggestedFollowUps: ['Find houses in Colombo', 'Show all apartments'],
      metrics: {
        totalTimeMs: 0,
        intentDetectionMs: 0,
        backendExecutionMs: 0,
        path: 'DETERMINISTIC',
      },
    };
  }
}

/**
 * PATH C: Factual Property Comparison via comparisonService
 */
async function handlePropertyComparison(
  message: string,
  context?: ConversationContext,
  currentUser?: { id: string; role: UserRole }
): Promise<AIAdvisorResponse> {
  let propertyIds = await resolveReferencedPropertyIds(message);

  if (propertyIds.length < 2 && context?.lastPropertyIds && context.lastPropertyIds.length >= 2) {
    propertyIds = context.lastPropertyIds.slice(0, 2);
  }

  // If user says "compare my saved properties" and is logged in
  if (propertyIds.length < 2 && currentUser?.id) {
    const comps = await getCustomerComparisons(currentUser.id);
    if (comps.length > 0) {
      const fullComp = await getComparison(currentUser.id, comps[0].id);
      if (fullComp.properties.length >= 2) {
        const answer = synthesizeComparisonResponse(fullComp.properties);
        return {
          answer,
          intent: 'PROPERTY_COMPARISON',
          properties: toAIPropertyResults(fullComp.properties),
          action: {
            type: 'OPEN_COMPARISON',
            targetId: fullComp.comparison.id,
            label: 'Open Comparison Table',
          },
          metrics: {
            totalTimeMs: 0,
            intentDetectionMs: 0,
            backendExecutionMs: 0,
            path: 'PERSONALIZED_ACTION',
          },
        };
      }
    }
  }

  if (propertyIds.length < 2) {
    return {
      answer: 'To compare properties, please specify at least two property numbers (for example: "Compare property 101 and 102") or use the Compare button on property cards.',
      intent: 'PROPERTY_COMPARISON',
      suggestedFollowUps: ['Find houses in Colombo', 'Show my wishlist'],
      metrics: {
        totalTimeMs: 0,
        intentDetectionMs: 0,
        backendExecutionMs: 0,
        path: 'DETERMINISTIC',
      },
    };
  }

  const propsToCompare: any[] = [];
  for (const id of propertyIds.slice(0, 4)) {
    try {
      const p = await validatePropertyExists(id);
      propsToCompare.push(p);
    } catch {
      // Gracefully omit invalid ID
    }
  }

  if (propsToCompare.length < 2) {
    return {
      answer: 'One or more of the specified properties could not be found in active records for comparison.',
      intent: 'PROPERTY_COMPARISON',
      metrics: {
        totalTimeMs: 0,
        intentDetectionMs: 0,
        backendExecutionMs: 0,
        path: 'DETERMINISTIC',
      },
    };
  }

  const answer = synthesizeComparisonResponse(propsToCompare);

  return {
    answer,
    intent: 'PROPERTY_COMPARISON',
    properties: toAIPropertyResults(propsToCompare),
    action: {
      type: 'NAVIGATE',
      targetId: '/properties',
      label: 'Browse More Properties',
    },
    suggestedFollowUps: [
      `Tell me more about ${propsToCompare[0].title}`,
      `Book a viewing for ${propsToCompare[0].title}`,
    ],
    metrics: {
      totalTimeMs: 0,
      intentDetectionMs: 0,
      backendExecutionMs: 0,
      path: 'DETERMINISTIC',
    },
  };
}

/**
 * PATH D: Wishlist Actions via wishlistService
 */
async function handleWishlistAction(
  message: string,
  currentUser?: { id: string; role: UserRole },
  context?: ConversationContext
): Promise<AIAdvisorResponse> {
  // Security Boundary: Wishlist requires authenticated customer
  if (!currentUser?.id) {
    return {
      answer: 'You need to sign in to access or save properties to your wishlist.',
      intent: 'WISHLIST',
      action: {
        type: 'LOGIN_REQUIRED',
        label: 'Sign In to Nexus Property',
      },
      metrics: {
        totalTimeMs: 0,
        intentDetectionMs: 0,
        backendExecutionMs: 0,
        path: 'PERSONALIZED_ACTION',
      },
    };
  }

  const lower = message.toLowerCase();
  const isAdd = /\b(?:add|save)\b/i.test(lower) && !/\bremove|delete\b/i.test(lower);
  const isRemove = /\b(?:remove|delete)\b/i.test(lower);

  // If asking to add/remove a specific property
  if (isAdd || isRemove) {
    const resolvedIds = await resolveReferencedPropertyIds(message);
    const targetId = resolvedIds[0] || context?.lastReferencedPropertyId;

    if (!targetId) {
      return {
        answer: 'Which property would you like to save to your wishlist? You can specify a property number or click the heart icon on any listing.',
        intent: 'WISHLIST',
        metrics: {
          totalTimeMs: 0,
          intentDetectionMs: 0,
          backendExecutionMs: 0,
          path: 'DETERMINISTIC',
        },
      };
    }

    try {
      const prop = await validatePropertyExists(targetId);
      const res = await toggleWishlistItem(currentUser.id, targetId);
      const statusText = res.saved
        ? `Added **${prop.title}** to your saved wishlist!`
        : `Removed **${prop.title}** from your wishlist.`;

      return {
        answer: statusText,
        intent: 'WISHLIST',
        action: {
          type: 'OPEN_WISHLIST',
          label: 'View Wishlist',
        },
        suggestedFollowUps: ['Show my wishlist', 'Find more houses in Colombo'],
        metrics: {
          totalTimeMs: 0,
          intentDetectionMs: 0,
          backendExecutionMs: 0,
          path: 'PERSONALIZED_ACTION',
        },
      };
    } catch (err: any) {
      return {
        answer: `Unable to update wishlist: ${err.message || 'Property not found.'}`,
        intent: 'WISHLIST',
        metrics: {
          totalTimeMs: 0,
          intentDetectionMs: 0,
          backendExecutionMs: 0,
          path: 'PERSONALIZED_ACTION',
        },
      };
    }
  }

  // Retrieve customer wishlist
  const wishlist = await getCustomerWishlist(currentUser.id);
  const answer = synthesizeWishlistResponse(wishlist.items);

  const savedProps = wishlist.items.map(i => i.property).filter(Boolean) as any[];

  return {
    answer,
    intent: 'WISHLIST',
    properties: toAIPropertyResults(savedProps),
    action: {
      type: 'OPEN_WISHLIST',
      label: 'Open Wishlist',
    },
    suggestedFollowUps: ['Find houses in Colombo', 'My upcoming viewings'],
    metrics: {
      totalTimeMs: 0,
      intentDetectionMs: 0,
      backendExecutionMs: 0,
      path: 'PERSONALIZED_ACTION',
    },
  };
}

/**
 * PATH E: Appointment Actions via appointmentService
 */
async function handleAppointmentAction(
  message: string,
  currentUser?: { id: string; role: UserRole },
  context?: ConversationContext
): Promise<AIAdvisorResponse> {
  if (!currentUser?.id) {
    return {
      answer: 'Please sign in to schedule viewing appointments or view your upcoming schedule.',
      intent: 'APPOINTMENT',
      action: {
        type: 'LOGIN_REQUIRED',
        label: 'Sign In to View Schedule',
      },
      metrics: {
        totalTimeMs: 0,
        intentDetectionMs: 0,
        backendExecutionMs: 0,
        path: 'PERSONALIZED_ACTION',
      },
    };
  }

  const lower = message.toLowerCase();
  const isBookRequest = /\b(?:book|schedule|view tomorrow|visit|can i view)\b/i.test(lower);

  if (isBookRequest) {
    const resolvedIds = await resolveReferencedPropertyIds(message);
    const targetId = resolvedIds[0] || context?.lastReferencedPropertyId;

    if (!targetId) {
      return {
        answer: 'Which property would you like to view? Please specify a property ID or select a listing to view available appointment slots.',
        intent: 'APPOINTMENT',
        metrics: {
          totalTimeMs: 0,
          intentDetectionMs: 0,
          backendExecutionMs: 0,
          path: 'DETERMINISTIC',
        },
      };
    }

    try {
      const prop = await getPropertyById(targetId, currentUser.role, currentUser.id);
      return {
        answer: `Viewing appointments for **${prop.title}** can be scheduled directly with the assigned agent. What date and preferred time work best for you?`,
        intent: 'APPOINTMENT',
        properties: [toAIPropertyResult(prop)],
        action: {
          type: 'OPEN_APPOINTMENT',
          targetId: prop.id,
          label: 'Book Viewing Slot',
        },
        suggestedFollowUps: ['Show my upcoming appointments', 'Tell me more about this property'],
        metrics: {
          totalTimeMs: 0,
          intentDetectionMs: 0,
          backendExecutionMs: 0,
          path: 'PERSONALIZED_ACTION',
        },
      };
    } catch {
      return {
        answer: `I couldn't find property "${targetId}" to schedule a viewing. Please select an active property listing.`,
        intent: 'APPOINTMENT',
        metrics: {
          totalTimeMs: 0,
          intentDetectionMs: 0,
          backendExecutionMs: 0,
          path: 'DETERMINISTIC',
        },
      };
    }
  }

  // List upcoming appointments
  const appointments = await getUserAppointments(currentUser.id, currentUser.role);
  const activeApts = appointments.filter(a =>
    ['REQUESTED', 'CONFIRMED', 'RESCHEDULED'].includes(a.status)
  );
  const answer = synthesizeAppointmentsResponse(activeApts);

  return {
    answer,
    intent: 'APPOINTMENT',
    action: {
      type: 'NAVIGATE',
      targetId: '/customer-portal',
      label: 'Open Customer Portal',
    },
    suggestedFollowUps: ['Show my wishlist', 'Search properties in Colombo'],
    metrics: {
      totalTimeMs: 0,
      intentDetectionMs: 0,
      backendExecutionMs: 0,
      path: 'PERSONALIZED_ACTION',
    },
  };
}

/**
 * PATH F: Inquiry Actions via feedbackService
 */
async function handleInquiryAction(
  _message: string,
  currentUser?: { id: string; role: UserRole }
): Promise<AIAdvisorResponse> {
  if (!currentUser?.id) {
    return {
      answer: 'Please sign in to check the status of your inquiries.',
      intent: 'INQUIRY',
      action: { type: 'LOGIN_REQUIRED', label: 'Sign In' },
      metrics: { totalTimeMs: 0, intentDetectionMs: 0, backendExecutionMs: 0, path: 'PERSONALIZED_ACTION' },
    };
  }

  const inquiries = await listInquiries(currentUser.id, currentUser.role);
  const answer = synthesizeTicketsResponse('INQUIRY', inquiries);

  return {
    answer,
    intent: 'INQUIRY',
    action: {
      type: 'NAVIGATE',
      targetId: '/customer-portal',
      label: 'View Inquiries Portal',
    },
    suggestedFollowUps: ['Show my complaints', 'Show my appointments'],
    metrics: { totalTimeMs: 0, intentDetectionMs: 0, backendExecutionMs: 0, path: 'PERSONALIZED_ACTION' },
  };
}

/**
 * PATH G: Complaint Actions via feedbackService
 */
async function handleComplaintAction(
  _message: string,
  currentUser?: { id: string; role: UserRole }
): Promise<AIAdvisorResponse> {
  if (!currentUser?.id) {
    return {
      answer: 'Please sign in to check the status of your submitted complaints.',
      intent: 'COMPLAINT',
      action: { type: 'LOGIN_REQUIRED', label: 'Sign In' },
      metrics: { totalTimeMs: 0, intentDetectionMs: 0, backendExecutionMs: 0, path: 'PERSONALIZED_ACTION' },
    };
  }

  const complaints = await listComplaints(currentUser.id, currentUser.role);
  const answer = synthesizeTicketsResponse('COMPLAINT', complaints);

  return {
    answer,
    intent: 'COMPLAINT',
    action: {
      type: 'NAVIGATE',
      targetId: '/customer-portal',
      label: 'View Complaints Portal',
    },
    suggestedFollowUps: ['Show my inquiries', 'Search properties in Colombo'],
    metrics: { totalTimeMs: 0, intentDetectionMs: 0, backendExecutionMs: 0, path: 'PERSONALIZED_ACTION' },
  };
}

/**
 * PATH H: Account Profile
 */
function handleAccountAction(
  currentUser?: { id: string; role: UserRole; fullName: string }
): AIAdvisorResponse {
  if (!currentUser?.id) {
    return {
      answer: 'You are currently browsing as a guest. Sign in or register to manage your profile and viewings.',
      intent: 'ACCOUNT',
      action: { type: 'LOGIN_REQUIRED', label: 'Sign In' },
      metrics: { totalTimeMs: 0, intentDetectionMs: 0, backendExecutionMs: 0, path: 'DETERMINISTIC' },
    };
  }

  return {
    answer: `You are signed in as **${currentUser.fullName}** (Role: **${currentUser.role}**). You can manage your contact details, security settings, and notifications in your profile settings.`,
    intent: 'ACCOUNT',
    action: {
      type: 'NAVIGATE',
      targetId: '/customer-portal',
      label: 'Manage Profile',
    },
    suggestedFollowUps: ['Show my wishlist', 'Show my upcoming appointments'],
    metrics: { totalTimeMs: 0, intentDetectionMs: 0, backendExecutionMs: 0, path: 'DETERMINISTIC' },
  };
}

/**
 * PATH I: General Sri Lankan Real Estate Knowledge
 */
function handleGeneralPropertyQuestion(_message: string): AIAdvisorResponse {
  const answer = `Nexus Property connects buyers, sellers, and certified agents across Sri Lanka's 9 provinces.
Available Property Types:
- **Houses & Townhomes**: Colombo, Nugegoda, Kandy, Galle, Jaffna
- **Luxury Condominiums & Apartments**: Colombo 01-15, Rajagiriya, Dehiwala
- **Villas & Heritage Estates**: Galle Fort, Mirissa, Nuwara Eliya
- **Residential & Agricultural Land**: Kaduwela, Negombo, Matara
- **Commercial Office Buildings**: Colombo Fort, Kurunegala

All transactions adhere to Sri Lankan deed registration (Bimsaviya), UDA zoning compliance, and transparent LKR pricing.`;

  return {
    answer,
    intent: 'GENERAL_PROPERTY_QUESTION',
    suggestedFollowUps: [
      'Find houses in Colombo',
      'Apartments under LKR 30M',
      'What properties are in Kandy?',
    ],
    metrics: { totalTimeMs: 0, intentDetectionMs: 0, backendExecutionMs: 0, path: 'DETERMINISTIC' },
  };
}

/**
 * PATH J: System Help
 */
function handleSystemHelp(): AIAdvisorResponse {
  const answer = `I am your Nexus Property AI Advisor. I can assist you with:
- **Natural Language Search**: "Find a 3-bedroom house in Nugegoda under 40M"
- **Property Inquiries**: "Tell me about property 101" or "Does prop_01 have parking?"
- **Property Comparison**: "Compare property 101 and 102"
- **Viewing Appointments**: "Show my appointments" or "Book a viewing"
- **Wishlist & Shortlists**: "Add property 101 to my wishlist"
- **Customer Service**: "Status of my inquiry" or "Show my complaints"

How can I help you today?`;

  return {
    answer,
    intent: 'SYSTEM_HELP',
    suggestedFollowUps: [
      'Find houses in Colombo under 30M',
      'Apartments in Colombo 03',
      'Show my wishlist',
    ],
    metrics: { totalTimeMs: 0, intentDetectionMs: 0, backendExecutionMs: 0, path: 'DETERMINISTIC' },
  };
}

/**
 * PATH K: Unknown Query Handler
 */
function handleUnknownQuery(message: string): AIAdvisorResponse {
  return {
    answer: `I didn't quite catch that. You can search for properties (e.g. "Houses in Colombo under 30 million"), compare listings, or ask about your appointments and wishlist.`,
    intent: 'UNKNOWN',
    suggestedFollowUps: [
      'Find houses in Colombo',
      'Apartments under LKR 25M',
      'Help',
    ],
    metrics: { totalTimeMs: 0, intentDetectionMs: 0, backendExecutionMs: 0, path: 'DETERMINISTIC' },
  };
}
