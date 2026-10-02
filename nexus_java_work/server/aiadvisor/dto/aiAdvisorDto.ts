/**
 * Data Transfer Objects & Domain Types for Nexus Property AI Advisor
 */

import { PropertyType, PropertyStatus, SearchQuery } from '../../types/index.js';

export type IntentType =
  | 'PROPERTY_SEARCH'
  | 'PROPERTY_DETAILS'
  | 'PROPERTY_COMPARISON'
  | 'WISHLIST'
  | 'APPOINTMENT'
  | 'INQUIRY'
  | 'COMPLAINT'
  | 'ACCOUNT'
  | 'GENERAL_PROPERTY_QUESTION'
  | 'SYSTEM_HELP'
  | 'UNKNOWN';

export interface PropertyQuery {
  location?: string;
  propertyType?: PropertyType | 'ALL';
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  keyword?: string;
  sortBy?: 'price' | 'createdAt' | 'bedrooms' | 'area' | 'location' | 'title';
  sortOrder?: 'ASC' | 'DESC';
  limit?: number;
}

export interface AIPropertyResult {
  id: string;
  title: string;
  price: number;
  formattedPrice: string;
  shortPrice: string; // e.g. "LKR 38.5M"
  location: string;
  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number;
  area: number;
  primaryImage?: string;
  status: PropertyStatus;
  relevanceReason?: string;
}

export interface AIAdvisorAction {
  type: 'NAVIGATE' | 'VIEW_PROPERTY' | 'OPEN_APPOINTMENT' | 'OPEN_WISHLIST' | 'OPEN_COMPARISON' | 'OPEN_INQUIRY' | 'LOGIN_REQUIRED';
  targetId?: string;
  label: string;
}

export interface AIAdvisorRequest {
  message: string;
  conversationId?: string;
  contextPropertyId?: string;
  contextPropertyTitle?: string;
}

export interface ExecutionMetrics {
  totalTimeMs: number;
  intentDetectionMs: number;
  backendExecutionMs: number;
  aiSynthesisMs?: number;
  path: 'DETERMINISTIC' | 'DATABASE_AI' | 'PERSONALIZED_ACTION' | 'FALLBACK';
  cached?: boolean;
}

export interface AIAdvisorResponse {
  answer: string;
  intent: IntentType;
  extractedCriteria?: PropertyQuery;
  properties?: AIPropertyResult[];
  totalMatches?: number;
  suggestedFollowUps?: string[];
  action?: AIAdvisorAction;
  modelUsed?: string;
  metrics: ExecutionMetrics;
}

export interface ConversationContext {
  conversationId: string;
  lastIntent?: IntentType;
  lastCriteria?: PropertyQuery;
  lastReferencedPropertyId?: string;
  lastReferencedPropertyTitle?: string;
  lastPropertyIds?: string[];
  updatedAt: number;
}
