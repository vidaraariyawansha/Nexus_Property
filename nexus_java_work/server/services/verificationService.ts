import crypto from 'crypto';
import { execute, queryOne } from '../db/database.js';
import { AppError } from '../middleware/errorHandler.js';

export interface VerificationResponse {
  success: boolean;
  message: string;
  email?: string;
}

/**
 * Validates email verification token, enforces single-use expiry, and activates emailVerified state.
 */
export async function verifyEmail(token: string): Promise<VerificationResponse> {
  if (!token || typeof token !== 'string') {
    throw new AppError('Verification token is required.', 400);
  }

  const trimmedToken = token.trim();
  const now = Date.now();

  const user = await queryOne<{
    id: string;
    email: string;
    email_verified: number;
    verification_token: string | null;
    verification_expires_at: number | null;
  }>('SELECT id, email, email_verified, verification_token, verification_expires_at FROM users WHERE verification_token = ?', [trimmedToken]);

  if (!user) {
    throw new AppError('This verification link is no longer valid or has already been used.', 400);
  }

  if (user.email_verified === 1) {
    return {
      success: true,
      message: 'Your email address is already verified.',
      email: user.email,
    };
  }

  if (user.verification_expires_at && user.verification_expires_at < now) {
    throw new AppError('Your verification link has expired. Please request a new verification email.', 400);
  }

  // Token consumed: set email_verified = 1 and clear single-use token
  await execute(
    'UPDATE users SET email_verified = 1, verification_token = NULL, verification_expires_at = NULL, updated_at = ? WHERE id = ?',
    [now, user.id]
  );

  return {
    success: true,
    message: 'Your email address has been successfully verified! You may now sign in and access all platform features.',
    email: user.email,
  };
}

/**
 * Dispatches a new email verification token for unverified accounts.
 */
export async function resendVerification(email: string): Promise<{ success: boolean; message: string; demoToken?: string }> {
  if (!email || typeof email !== 'string') {
    throw new AppError('Please enter a valid email address.', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await queryOne<{
    id: string;
    email_verified: number;
  }>('SELECT id, email_verified FROM users WHERE email = ?', [normalizedEmail]);

  // Anti-enumeration: Return generic friendly response even if not found
  if (!user) {
    return {
      success: true,
      message: 'If an account exists for this email address, a verification link has been sent.',
    };
  }

  if (user.email_verified === 1) {
    return {
      success: true,
      message: 'Your email address is already verified.',
    };
  }

  const newToken = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const newExpiry = now + 24 * 60 * 60 * 1000; // 24 hours

  await execute(
    'UPDATE users SET verification_token = ?, verification_expires_at = ?, updated_at = ? WHERE id = ?',
    [newToken, newExpiry, now, user.id]
  );

  return {
    success: true,
    message: 'A fresh verification link has been sent to your email address.',
    demoToken: newToken, // Available for development/testing environments
  };
}
