export type UserRole = 'CUSTOMER' | 'PROPERTY_OWNER' | 'AGENT' | 'ADMIN';

export type PropertyType = 'HOUSE' | 'APARTMENT' | 'CONDO' | 'VILLA' | 'LAND' | 'COMMERCIAL';

export type PropertyStatus = 
  | 'DRAFT' 
  | 'PENDING_APPROVAL' 
  | 'ACTIVE' 
  | 'UNDER_CONTRACT' 
  | 'SOLD' 
  | 'RENTED' 
  | 'ARCHIVED';

export type TicketStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type AppointmentStatus = 
  | 'REQUESTED' 
  | 'CONFIRMED' 
  | 'RESCHEDULED' 
  | 'CANCELLED' 
  | 'COMPLETED';

export interface User {
  id: string;
  fullName: string;
  email: string;
  passwordHash?: string;
  phone?: string | null;
  role: UserRole;
  enabled: boolean;
  emailVerified?: boolean;
  verificationToken?: string | null;
  verificationExpiresAt?: number | null;
  failedLoginAttempts?: number;
  lockedUntil?: number | null;
  lastLoginAt?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  enabled: boolean;
  emailVerified?: boolean;
  createdAt: number;
}

export interface PropertyImage {
  id: string;
  propertyId: string;
  url: string;
  isPrimary: boolean;
  displayOrder: number;
  caption?: string;
  category?: string;
  createdAt: number;
}

export interface Property {
  id: string;
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string | null;
  title: string;
  description: string;
  propertyType: PropertyType;
  location: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  amenities: string[];
  status: PropertyStatus;
  primaryImage?: string;
  images?: PropertyImage[];
  averageRating?: number;
  ratingCount?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Rating {
  id: string;
  propertyId: string;
  customerId: string;
  customerName?: string;
  score: number;
  comment?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Inquiry {
  id: string;
  ticketId: string;
  propertyId: string;
  propertyTitle?: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  assignedAgentId?: string | null;
  assignedAgentName?: string | null;
  subject: string;
  message: string;
  status: TicketStatus;
  response?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Complaint {
  id: string;
  ticketId: string;
  propertyId?: string | null;
  propertyTitle?: string | null;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  subject: string;
  description: string;
  status: TicketStatus;
  resolution?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface Appointment {
  id: string;
  propertyId: string;
  propertyTitle?: string;
  propertyLocation?: string;
  propertyImage?: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string | null;
  agentId: string;
  agentName?: string;
  agentEmail?: string;
  agentPhone?: string | null;
  appointmentTime: number;
  durationMinutes: number;
  status: AppointmentStatus;
  notes?: string | null;
  cancellationReason?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface WishlistItem {
  id: string;
  wishlistId: string;
  propertyId: string;
  property?: Property;
  createdAt: number;
}

export interface Wishlist {
  id: string;
  customerId: string;
  name: string;
  items: WishlistItem[];
  createdAt: number;
  updatedAt: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  referenceId?: string | null;
  isRead: boolean;
  createdAt: number;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName?: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string | null;
  createdAt: number;
}

export interface SearchQuery {
  keyword?: string;
  location?: string;
  district?: string;
  province?: string;
  propertyType?: PropertyType | 'ALL';
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  amenities?: string[];
  status?: PropertyStatus | 'ALL';
  page?: number;
  size?: number;
  sortBy?: 'price' | 'createdAt' | 'bedrooms' | 'area' | 'location' | 'title';
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string> | string[];
}

export type ContactVisibility = 'PUBLIC' | 'REGISTERED' | 'PRIVATE';
export type ContactMethod = 'PHONE' | 'EMAIL' | 'WHATSAPP' | 'SYSTEM_MESSAGE';
export type ContactTime = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'ANY_TIME';

export interface UserProfile {
  id: string;
  userId: string;
  profileImageUrl?: string | null;
  bio?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  yearsOfExperience?: number | null;
  areasServed?: string | null;
  languages?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  preferredContactMethod: ContactMethod;
  preferredContactTime: ContactTime;
  phoneVisibility: ContactVisibility;
  emailVisibility: ContactVisibility;
  whatsappVisibility: ContactVisibility;
  isVerified: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ProfileCompleteness {
  percentage: number;
  completedItems: string[];
  pendingItems: string[];
}

export interface FullUserProfileResponse {
  user: UserSummary;
  profile: UserProfile;
  completeness: ProfileCompleteness;
}

export interface PublicUserProfileResponse {
  userId: string;
  fullName: string;
  role: UserRole;
  isVerified: boolean;
  profileImageUrl?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  yearsOfExperience?: number | null;
  areasServed?: string | null;
  languages?: string | null;
  bio?: string | null;
  // Contact details only present if permitted by viewer's auth status
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  preferredContactMethod?: ContactMethod;
  preferredContactTime?: ContactTime;
  phoneVisibility: ContactVisibility;
  emailVisibility: ContactVisibility;
  whatsappVisibility: ContactVisibility;
}

export interface ContactInfoUpdateRequest {
  fullName?: string;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  preferredContactMethod?: ContactMethod;
  preferredContactTime?: ContactTime;
  phoneVisibility?: ContactVisibility;
  emailVisibility?: ContactVisibility;
  whatsappVisibility?: ContactVisibility;
}

export interface ProfessionalProfileUpdateRequest {
  jobTitle?: string | null;
  company?: string | null;
  yearsOfExperience?: number | null;
  areasServed?: string | null;
  languages?: string | null;
  bio?: string | null;
}

export interface ProfilePhotoResponse {
  profileImageUrl: string;
  message: string;
}

export interface PropertyComparison {
  id: string;
  customerId: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  itemCount?: number;
  items?: ComparisonItem[];
}

export interface ComparisonItem {
  id: string;
  comparisonId: string;
  propertyId: string;
  position: number;
  createdAt: number;
  property?: Property;
}

export interface ComparisonCreateRequest {
  name: string;
}

export interface ComparisonUpdateRequest {
  name: string;
}

export interface ComparisonAddPropertyRequest {
  propertyId: string;
}

export interface ComparisonHighlights {
  lowestPricePropertyId?: string;
  largestAreaPropertyId?: string;
  mostBedroomsPropertyId?: string;
}

export interface ComparisonResponse {
  comparison: PropertyComparison;
  properties: Property[];
  highlights?: ComparisonHighlights;
}


