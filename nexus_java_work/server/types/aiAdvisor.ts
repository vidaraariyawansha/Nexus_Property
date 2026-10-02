import { Property, PropertyType, UserRole } from './index.js';

export type AdvisorIntent =
  | 'PROPERTY_SEARCH'
  | 'PROPERTY_DETAILS'
  | 'PROPERTY_COMPARISON'
  | 'WISHLIST'
  | 'APPOINTMENT'
  | 'INQUIRY'
  | 'COMPLAINT'
  | 'ACCOUNT'
  | 'GENERAL_PROPERTY_QUESTION'
  | 'WEBSITE_HELP'
  | 'GREETING'
  | 'UNKNOWN';

export type ResponseConfidence = 'VERIFIED' | 'GENERAL_KNOWLEDGE' | 'UNKNOWN';

export interface AdvisorSearchCriteria {
  keyword?: string;
  location?: string;
  district?: string;
  province?: string;
  propertyType?: PropertyType | 'ALL';
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  minArea?: number;
  amenities?: string[];
  sortBy?: 'price' | 'createdAt' | 'bedrooms' | 'area' | 'location' | 'title';
  sortOrder?: 'ASC' | 'DESC';
}

export interface AdvisorAction {
  id: string;
  label: string;
  type: 'NAVIGATE' | 'VIEW_PROPERTY' | 'WISHLIST_ADD' | 'WISHLIST_REMOVE' | 'COMPARE_ADD' | 'BOOK_VIEWING' | 'CONTACT_AGENT' | 'REFINE_SEARCH' | 'CONFIRM_ACTION';
  payload?: Record<string, any>;
  primary?: boolean;
}

export interface AdvisorPropertyCard {
  id: string;
  title: string;
  location: string;
  price: number;
  formattedPrice: string;
  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number;
  area: number;
  status: string;
  primaryImage?: string;
  highlights?: string[];
}

export interface AdvisorResponse {
  intent: AdvisorIntent;
  message: string;
  confidence: ResponseConfidence;
  properties?: AdvisorPropertyCard[];
  quickActions?: AdvisorAction[];
  suggestedQuestions?: string[];
  fastPath: boolean;
  modelUsed?: string;
  responseTimeMs: number;
  criteria?: AdvisorSearchCriteria;
  pendingConfirmation?: {
    action: string;
    description: string;
    payload: Record<string, any>;
  };
}

export interface AdvisorRequest {
  sessionId?: string;
  query: string;
  contextPropertyId?: string;
  contextPage?: 'home' | 'properties' | 'detail' | 'portal' | 'other';
  language?: 'en' | 'si' | 'ta';
  confirmedAction?: {
    action: string;
    payload: Record<string, any>;
  };
}
