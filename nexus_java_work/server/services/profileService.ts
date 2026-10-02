import crypto from 'crypto';
import { execute, queryOne } from '../db/database.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  ContactInfoUpdateRequest,
  ContactMethod,
  ContactTime,
  ContactVisibility,
  FullUserProfileResponse,
  ProfessionalProfileUpdateRequest,
  ProfileCompleteness,
  PublicUserProfileResponse,
  UserProfile,
  UserRole,
  UserSummary,
} from '../types/index.js';
import { logAudit } from './auditService.js';
import {
  safelyDeleteAvatarFile,
  saveProfileImage,
  validateImageBuffer,
} from './profileImageService.js';

import {
  isValidSriLankanPhone,
  normalizeSriLankanPhone,
} from './sriLankaUtils.js';

const VALID_VISIBILITIES: ContactVisibility[] = ['PUBLIC', 'REGISTERED', 'PRIVATE'];
const VALID_CONTACT_METHODS: ContactMethod[] = ['PHONE', 'EMAIL', 'WHATSAPP', 'SYSTEM_MESSAGE'];
const VALID_CONTACT_TIMES: ContactTime[] = ['MORNING', 'AFTERNOON', 'EVENING', 'ANY_TIME'];

// Regex to validate phone/whatsapp formats
const PHONE_REGEX = /^[+0-9\s()./-]{7,30}$/;

export async function getOrCreateProfile(userId: string): Promise<UserProfile> {
  const row = await queryOne<{
    id: string;
    user_id: string;
    profile_image_url: string | null;
    bio: string | null;
    job_title: string | null;
    company: string | null;
    years_of_experience: number | null;
    areas_served: string | null;
    languages: string | null;
    whatsapp: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    preferred_contact_method: string | null;
    preferred_contact_time: string | null;
    phone_visibility: string;
    email_visibility: string;
    whatsapp_visibility: string;
    is_verified: number;
    created_at: number;
    updated_at: number;
  }>('SELECT * FROM user_profiles WHERE user_id = ?', [userId]);

  if (row) {
    return {
      id: row.id,
      userId: row.user_id,
      profileImageUrl: row.profile_image_url,
      bio: row.bio,
      jobTitle: row.job_title,
      company: row.company,
      yearsOfExperience: row.years_of_experience,
      areasServed: row.areas_served,
      languages: row.languages,
      whatsapp: row.whatsapp,
      address: row.address,
      city: row.city,
      country: row.country,
      preferredContactMethod: (row.preferred_contact_method as ContactMethod) || 'PHONE',
      preferredContactTime: (row.preferred_contact_time as ContactTime) || 'ANY_TIME',
      phoneVisibility: (row.phone_visibility as ContactVisibility) || 'REGISTERED',
      emailVisibility: (row.email_visibility as ContactVisibility) || 'REGISTERED',
      whatsappVisibility: (row.whatsapp_visibility as ContactVisibility) || 'REGISTERED',
      isVerified: row.is_verified === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Create default profile for this user
  const profileId = `prof_${crypto.randomUUID()}`;
  const now = Date.now();
  await execute(
    `INSERT INTO user_profiles (
      id, user_id, preferred_contact_method, preferred_contact_time,
      phone_visibility, email_visibility, whatsapp_visibility, is_verified,
      created_at, updated_at
    ) VALUES (?, ?, 'PHONE', 'ANY_TIME', 'REGISTERED', 'REGISTERED', 'REGISTERED', 0, ?, ?)`,
    [profileId, userId, now, now]
  );

  return {
    id: profileId,
    userId,
    profileImageUrl: null,
    bio: null,
    jobTitle: null,
    company: null,
    yearsOfExperience: null,
    areasServed: null,
    languages: null,
    whatsapp: null,
    address: null,
    city: null,
    country: null,
    preferredContactMethod: 'PHONE',
    preferredContactTime: 'ANY_TIME',
    phoneVisibility: 'REGISTERED',
    emailVisibility: 'REGISTERED',
    whatsappVisibility: 'REGISTERED',
    isVerified: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function calculateProfileCompleteness(user: UserSummary, profile: UserProfile): ProfileCompleteness {
  const completedItems: string[] = [];
  const pendingItems: string[] = [];
  let score = 0;

  // 1. Full legal name (15%)
  if (user.fullName && user.fullName.trim().length >= 2) {
    score += 15;
    completedItems.push('Full legal name');
  } else {
    pendingItems.push('Full legal name');
  }

  // 2. Verified email (15%)
  if (user.email && user.email.includes('@')) {
    score += 15;
    completedItems.push('Verified email address');
  } else {
    pendingItems.push('Verified email address');
  }

  // 3. Phone number (15%)
  if (user.phone && user.phone.trim().length >= 7) {
    score += 15;
    completedItems.push('Primary phone number');
  } else {
    pendingItems.push('Primary phone number');
  }

  // 4. Profile photo (20%)
  if (profile.profileImageUrl) {
    score += 20;
    completedItems.push('Profile photo');
  } else {
    pendingItems.push('Profile photo');
  }

  // 5. WhatsApp or Secondary Contact (10%)
  if (profile.whatsapp && profile.whatsapp.trim().length >= 7) {
    score += 10;
    completedItems.push('WhatsApp number');
  } else {
    pendingItems.push('WhatsApp number');
  }

  // 6. Address / Location details (10%)
  if (profile.address || profile.city) {
    score += 10;
    completedItems.push('Address & city location');
  } else {
    pendingItems.push('Address & city location');
  }

  // 7. Role specific elements (15%)
  if (user.role === 'AGENT' || user.role === 'PROPERTY_OWNER' || user.role === 'ADMIN') {
    if (profile.jobTitle && profile.company) {
      score += 10;
      completedItems.push('Job title & company');
    } else {
      pendingItems.push('Job title & company');
    }

    if (profile.bio && profile.bio.trim().length >= 20) {
      score += 5;
      completedItems.push('Professional bio');
    } else {
      pendingItems.push('Professional bio');
    }
  } else {
    // Customer
    if (profile.preferredContactMethod) {
      score += 10;
      completedItems.push('Contact preferences');
    } else {
      pendingItems.push('Contact preferences');
    }

    if (profile.country) {
      score += 5;
      completedItems.push('Country of residence');
    } else {
      pendingItems.push('Country of residence');
    }
  }

  return {
    percentage: Math.min(100, score),
    completedItems,
    pendingItems,
  };
}

export async function getFullProfile(userId: string): Promise<FullUserProfileResponse> {
  const userRow = await queryOne<{
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
    enabled: number;
    created_at: number;
  }>('SELECT id, full_name, email, phone, role, enabled, created_at FROM users WHERE id = ?', [userId]);

  if (!userRow) {
    throw new AppError('User account not found.', 404);
  }

  const user: UserSummary = {
    id: userRow.id,
    fullName: userRow.full_name,
    email: userRow.email,
    phone: userRow.phone,
    role: userRow.role as UserRole,
    enabled: userRow.enabled === 1,
    createdAt: userRow.created_at,
  };

  const profile = await getOrCreateProfile(userId);
  const completeness = calculateProfileCompleteness(user, profile);

  return {
    user,
    profile,
    completeness,
  };
}

export async function updatePersonalContact(userId: string, data: ContactInfoUpdateRequest): Promise<FullUserProfileResponse> {
  // Validate Full Name
  if (data.fullName !== undefined) {
    const trimmed = data.fullName.trim();
    if (trimmed.length < 2 || trimmed.length > 100) {
      throw new AppError('Full legal name must be between 2 and 100 characters.', 400);
    }
  }

  // Validate Phone
  if (data.phone !== undefined && data.phone !== null && data.phone.trim() !== '') {
    const trimmedPhone = data.phone.trim();
    if (!isValidSriLankanPhone(trimmedPhone) || trimmedPhone.length > 30) {
      throw new AppError('Invalid phone number format. Please provide a valid phone number.', 400);
    }
  }

  // Validate WhatsApp
  if (data.whatsapp !== undefined && data.whatsapp !== null && data.whatsapp.trim() !== '') {
    const trimmedWA = data.whatsapp.trim();
    if (!isValidSriLankanPhone(trimmedWA) || trimmedWA.length > 30) {
      throw new AppError('Invalid WhatsApp number format. Please provide a valid number.', 400);
    }
  }

  // Validate lengths
  if (data.address && data.address.length > 200) {
    throw new AppError('Address must not exceed 200 characters.', 400);
  }
  if (data.city && data.city.length > 100) {
    throw new AppError('City must not exceed 100 characters.', 400);
  }
  if (data.country && data.country.length > 100) {
    throw new AppError('Country must not exceed 100 characters.', 400);
  }

  // Validate Visibilities
  if (data.phoneVisibility && !VALID_VISIBILITIES.includes(data.phoneVisibility)) {
    throw new AppError('Invalid contact visibility option for phone.', 400);
  }
  if (data.emailVisibility && !VALID_VISIBILITIES.includes(data.emailVisibility)) {
    throw new AppError('Invalid contact visibility option for email.', 400);
  }
  if (data.whatsappVisibility && !VALID_VISIBILITIES.includes(data.whatsappVisibility)) {
    throw new AppError('Invalid contact visibility option for WhatsApp.', 400);
  }

  // Validate Preferences
  if (data.preferredContactMethod && !VALID_CONTACT_METHODS.includes(data.preferredContactMethod)) {
    throw new AppError('Invalid preferred contact method option.', 400);
  }
  if (data.preferredContactTime && !VALID_CONTACT_TIMES.includes(data.preferredContactTime)) {
    throw new AppError('Invalid preferred contact time option.', 400);
  }

  const now = Date.now();

  // 1. Update users table if fullName or phone changed
  const userUpdates: string[] = [];
  const userParams: (string | number | null)[] = [];

  if (data.fullName !== undefined) {
    userUpdates.push('full_name = ?');
    userParams.push(data.fullName.trim());
  }
  if (data.phone !== undefined) {
    userUpdates.push('phone = ?');
    userParams.push(data.phone && data.phone.trim() !== '' ? data.phone.trim() : null);
  }

  if (userUpdates.length > 0) {
    userUpdates.push('updated_at = ?');
    userParams.push(now);
    userParams.push(userId);
    await execute(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userParams);
  }

  // 2. Ensure profile exists and update user_profiles table
  await getOrCreateProfile(userId);

  const profileUpdates: string[] = [];
  const profileParams: (string | number | null)[] = [];

  if (data.whatsapp !== undefined) {
    profileUpdates.push('whatsapp = ?');
    profileParams.push(data.whatsapp && data.whatsapp.trim() !== '' ? data.whatsapp.trim() : null);
  }
  if (data.address !== undefined) {
    profileUpdates.push('address = ?');
    profileParams.push(data.address ? data.address.trim() : null);
  }
  if (data.city !== undefined) {
    profileUpdates.push('city = ?');
    profileParams.push(data.city ? data.city.trim() : null);
  }
  if (data.country !== undefined) {
    profileUpdates.push('country = ?');
    profileParams.push(data.country ? data.country.trim() : null);
  }
  if (data.preferredContactMethod !== undefined) {
    profileUpdates.push('preferred_contact_method = ?');
    profileParams.push(data.preferredContactMethod);
  }
  if (data.preferredContactTime !== undefined) {
    profileUpdates.push('preferred_contact_time = ?');
    profileParams.push(data.preferredContactTime);
  }
  if (data.phoneVisibility !== undefined) {
    profileUpdates.push('phone_visibility = ?');
    profileParams.push(data.phoneVisibility);
  }
  if (data.emailVisibility !== undefined) {
    profileUpdates.push('email_visibility = ?');
    profileParams.push(data.emailVisibility);
  }
  if (data.whatsappVisibility !== undefined) {
    profileUpdates.push('whatsapp_visibility = ?');
    profileParams.push(data.whatsappVisibility);
  }

  if (profileUpdates.length > 0) {
    profileUpdates.push('updated_at = ?');
    profileParams.push(now);
    profileParams.push(userId);
    await execute(`UPDATE user_profiles SET ${profileUpdates.join(', ')} WHERE user_id = ?`, profileParams);
  }

  // Audit log
  await logAudit(
    userId,
    'PROFILE_CONTACT_UPDATED',
    'USER',
    userId,
    `Personal contact and visibility preferences updated.`
  );

  return getFullProfile(userId);
}

export async function updateProfessionalProfile(
  userId: string,
  userRole: UserRole,
  data: ProfessionalProfileUpdateRequest
): Promise<FullUserProfileResponse> {
  // Enforce role permission: Ordinary customers do not have professional broker profiles
  if (userRole === 'CUSTOMER') {
    throw new AppError('Professional profile sections are only available for Property Owners and Licensed Agents.', 403);
  }

  if (data.jobTitle && data.jobTitle.length > 100) {
    throw new AppError('Job title must not exceed 100 characters.', 400);
  }
  if (data.company && data.company.length > 100) {
    throw new AppError('Company name must not exceed 100 characters.', 400);
  }
  if (data.yearsOfExperience !== undefined && data.yearsOfExperience !== null) {
    const exp = Number(data.yearsOfExperience);
    if (isNaN(exp) || exp < 0 || exp > 70) {
      throw new AppError('Years of experience must be a non-negative integer between 0 and 70.', 400);
    }
  }
  if (data.areasServed && data.areasServed.length > 300) {
    throw new AppError('Areas served must not exceed 300 characters.', 400);
  }
  if (data.languages && data.languages.length > 200) {
    throw new AppError('Languages must not exceed 200 characters.', 400);
  }
  if (data.bio && data.bio.length > 2000) {
    throw new AppError('Professional biography must not exceed 2000 characters.', 400);
  }

  await getOrCreateProfile(userId);
  const now = Date.now();

  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (data.jobTitle !== undefined) {
    updates.push('job_title = ?');
    params.push(data.jobTitle ? data.jobTitle.trim() : null);
  }
  if (data.company !== undefined) {
    updates.push('company = ?');
    params.push(data.company ? data.company.trim() : null);
  }
  if (data.yearsOfExperience !== undefined) {
    updates.push('years_of_experience = ?');
    params.push(data.yearsOfExperience !== null ? Number(data.yearsOfExperience) : null);
  }
  if (data.areasServed !== undefined) {
    updates.push('areas_served = ?');
    params.push(data.areasServed ? data.areasServed.trim() : null);
  }
  if (data.languages !== undefined) {
    updates.push('languages = ?');
    params.push(data.languages ? data.languages.trim() : null);
  }
  if (data.bio !== undefined) {
    updates.push('bio = ?');
    params.push(data.bio ? data.bio.trim() : null);
  }

  if (updates.length > 0) {
    updates.push('updated_at = ?');
    params.push(now);
    params.push(userId);
    await execute(`UPDATE user_profiles SET ${updates.join(', ')} WHERE user_id = ?`, params);
  }

  await logAudit(
    userId,
    'PROFESSIONAL_PROFILE_UPDATED',
    'USER',
    userId,
    `Professional profile information updated.`
  );

  return getFullProfile(userId);
}

export async function uploadProfilePhoto(
  userId: string,
  imageBuffer: Buffer,
  declaredMime?: string
): Promise<{ profileImageUrl: string; completeness: ProfileCompleteness }> {
  // Validate image magic bytes, MIME, size
  const validated = validateImageBuffer(imageBuffer, declaredMime);

  // Fetch current profile to clean up old image if present
  const currentProfile = await getOrCreateProfile(userId);
  if (currentProfile.profileImageUrl) {
    safelyDeleteAvatarFile(currentProfile.profileImageUrl);
  }

  // Save securely to disk with randomized filename
  const newImageUrl = await saveProfileImage(userId, validated);
  const now = Date.now();

  await execute('UPDATE user_profiles SET profile_image_url = ?, updated_at = ? WHERE user_id = ?', [
    newImageUrl,
    now,
    userId,
  ]);

  await logAudit(userId, 'PROFILE_PHOTO_UPLOADED', 'USER', userId, `Updated profile photo: ${newImageUrl}`);

  const updatedProfile = await getFullProfile(userId);
  return {
    profileImageUrl: newImageUrl,
    completeness: updatedProfile.completeness,
  };
}

export async function removeProfilePhoto(userId: string): Promise<{ completeness: ProfileCompleteness }> {
  const currentProfile = await getOrCreateProfile(userId);
  if (currentProfile.profileImageUrl) {
    safelyDeleteAvatarFile(currentProfile.profileImageUrl);
  }

  const now = Date.now();
  await execute('UPDATE user_profiles SET profile_image_url = NULL, updated_at = ? WHERE user_id = ?', [
    now,
    userId,
  ]);

  await logAudit(userId, 'PROFILE_PHOTO_REMOVED', 'USER', userId, `Removed profile photo.`);

  const updatedProfile = await getFullProfile(userId);
  return {
    completeness: updatedProfile.completeness,
  };
}

/**
 * Public profile endpoint with server-side contact visibility filtering.
 * Prevents unauthorized harvesting of private phone/email/WhatsApp info.
 */
export async function getPublicProfile(
  targetUserId: string,
  requestingUserId?: string,
  requestingUserRole?: string
): Promise<PublicUserProfileResponse> {
  const user = await queryOne<{
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
    enabled: number;
  }>('SELECT id, full_name, email, phone, role, enabled FROM users WHERE id = ?', [targetUserId]);

  if (!user || user.enabled !== 1) {
    throw new AppError('User profile not found or account is inactive.', 404);
  }

  const profile = await getOrCreateProfile(targetUserId);

  const isSelf = Boolean(requestingUserId && requestingUserId === targetUserId);
  const isAdmin = requestingUserRole === 'ADMIN';
  const isAuthenticated = Boolean(requestingUserId);

  // Check Phone visibility
  let visiblePhone: string | null = null;
  if (isSelf || isAdmin) {
    visiblePhone = user.phone;
  } else if (profile.phoneVisibility === 'PUBLIC') {
    visiblePhone = user.phone;
  } else if (profile.phoneVisibility === 'REGISTERED' && isAuthenticated) {
    visiblePhone = user.phone;
  }

  // Check Email visibility
  let visibleEmail: string | null = null;
  if (isSelf || isAdmin) {
    visibleEmail = user.email;
  } else if (profile.emailVisibility === 'PUBLIC') {
    visibleEmail = user.email;
  } else if (profile.emailVisibility === 'REGISTERED' && isAuthenticated) {
    visibleEmail = user.email;
  }

  // Check WhatsApp visibility
  let visibleWhatsApp: string | null = null;
  if (isSelf || isAdmin) {
    visibleWhatsApp = profile.whatsapp || null;
  } else if (profile.whatsappVisibility === 'PUBLIC') {
    visibleWhatsApp = profile.whatsapp || null;
  } else if (profile.whatsappVisibility === 'REGISTERED' && isAuthenticated) {
    visibleWhatsApp = profile.whatsapp || null;
  }

  return {
    userId: user.id,
    fullName: user.full_name,
    role: user.role as UserRole,
    isVerified: profile.isVerified,
    profileImageUrl: profile.profileImageUrl,
    jobTitle: profile.jobTitle,
    company: profile.company,
    yearsOfExperience: profile.yearsOfExperience,
    areasServed: profile.areasServed,
    languages: profile.languages,
    bio: profile.bio,
    phone: visiblePhone,
    email: visibleEmail,
    whatsapp: visibleWhatsApp,
    preferredContactMethod: profile.preferredContactMethod,
    preferredContactTime: profile.preferredContactTime,
    phoneVisibility: profile.phoneVisibility,
    emailVisibility: profile.emailVisibility,
    whatsappVisibility: profile.whatsappVisibility,
  };
}

/**
 * Administrative verification toggle.
 * Security enforcement: Only admins may set or unset verification. Users cannot self-verify.
 */
export async function adminSetVerification(
  adminUserId: string,
  targetUserId: string,
  isVerified: boolean
): Promise<UserProfile> {
  await getOrCreateProfile(targetUserId);
  const now = Date.now();
  await execute('UPDATE user_profiles SET is_verified = ?, updated_at = ? WHERE user_id = ?', [
    isVerified ? 1 : 0,
    now,
    targetUserId,
  ]);

  await logAudit(
    adminUserId,
    'USER_VERIFICATION_TOGGLED',
    'USER',
    targetUserId,
    `Admin set is_verified = ${isVerified} for user ${targetUserId}`
  );

  return getOrCreateProfile(targetUserId);
}
