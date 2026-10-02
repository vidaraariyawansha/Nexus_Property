import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { execute, queryOne } from '../db/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateToken, TokenPayload } from '../middleware/auth.js';
import { UserRole, UserSummary } from '../types/index.js';
import { isValidSriLankanPhone, normalizeSriLankanPhone } from './sriLankaPhone.js';

export interface RegistrationRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  phone?: string | null;
  role?: UserRole;
}

export interface RegistrationResult {
  token: string;
  user: UserSummary;
  verificationToken?: string;
}

export const ALLOWED_SELF_REGISTRATION_ROLES: UserRole[] = ['CUSTOMER', 'PROPERTY_OWNER', 'AGENT'];

/**
 * Validates registration DTO, checks email uniqueness, verifies role authorization,
 * enforces Sri Lankan phone format, securely hashes password, and persists user record.
 */
export async function registerUser(data: RegistrationRequest): Promise<RegistrationResult> {
  const { fullName, email, password, confirmPassword, phone, role = 'CUSTOMER' } = data;

  // 1. Full Name Validation
  if (!fullName || typeof fullName !== 'string') {
    throw new AppError('Please enter your full name.', 400);
  }
  const trimmedName = fullName.trim().replace(/\s+/g, ' ');
  if (trimmedName.length < 2 || trimmedName.length > 100) {
    throw new AppError('Full name must be between 2 and 100 characters.', 400);
  }

  // 2. Email Validation & Normalization
  if (!email || typeof email !== 'string') {
    throw new AppError('Please enter a valid email address.', 400);
  }
  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new AppError('Please enter a valid email address.', 400);
  }

  // 3. Application-level Duplicate Email Check
  const existing = await queryOne<{ id: string }>('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
  if (existing) {
    throw new AppError('An account with this email already exists.', 409);
  }

  // 4. Role Authorization (Blocks privilege escalation - ADMIN registration strictly forbidden)
  if (role === 'ADMIN' || !ALLOWED_SELF_REGISTRATION_ROLES.includes(role)) {
    throw new AppError('Unauthorized role requested. Public accounts cannot be registered as Administrator.', 403);
  }

  // 5. Password Validation & Confirmation Check
  if (!password || typeof password !== 'string') {
    throw new AppError('Password is required.', 400);
  }
  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters long.', 400);
  }
  if (confirmPassword !== undefined && confirmPassword !== password) {
    throw new AppError('Passwords do not match.', 400);
  }

  // 6. Sri Lankan Phone Validation & Normalization
  let normalizedPhone: string | null = null;
  if (phone && phone.trim().length > 0) {
    const rawPhone = phone.trim();
    if (!isValidSriLankanPhone(rawPhone)) {
      throw new AppError('Please enter a valid Sri Lankan phone number (e.g. 0771234567 or +94 77 123 4567).', 400);
    }
    normalizedPhone = normalizeSriLankanPhone(rawPhone);
  }

  // 7. Secure Password Hashing
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  // 8. Identity & Token Generation
  const id = `usr_${crypto.randomUUID()}`;
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const verificationExpiresAt = now + 24 * 60 * 60 * 1000; // 24 hours expiry

  // 9. Persist User Record with Single-use Verification Token
  await execute(
    `INSERT INTO users (
      id, full_name, email, password_hash, phone, role,
      enabled, email_verified, verification_token, verification_expires_at,
      failed_login_attempts, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?, 0, ?, ?)`,
    [
      id,
      trimmedName,
      normalizedEmail,
      passwordHash,
      normalizedPhone,
      role,
      verificationToken,
      verificationExpiresAt,
      now,
      now,
    ]
  );

  // 10. Automatic Customer Onboarding (Default Wishlist)
  if (role === 'CUSTOMER') {
    const wishlistId = `wsh_${crypto.randomUUID()}`;
    await execute(
      `INSERT INTO wishlists (id, customer_id, name, created_at, updated_at)
       VALUES (?, ?, 'My Saved Properties', ?, ?)`,
      [wishlistId, id, now, now]
    );
  }

  // 11. Generate JWT Token
  const tokenPayload: TokenPayload = {
    userId: id,
    email: normalizedEmail,
    role,
    fullName: trimmedName,
  };
  const token = generateToken(tokenPayload);

  return {
    token,
    user: {
      id,
      fullName: trimmedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      role,
      enabled: true,
      emailVerified: false,
      createdAt: now,
    },
    verificationToken,
  };
}
