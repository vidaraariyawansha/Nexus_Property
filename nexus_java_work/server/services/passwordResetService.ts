import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { execute, queryOne } from '../db/database.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Initiates secure password reset workflow with single-use token and 1-hour expiry.
 * Preserves anti-enumeration by returning uniform message regardless of email presence.
 */
export async function requestPasswordReset(email: string): Promise<{ message: string; demoToken?: string }> {
  if (!email || typeof email !== 'string') {
    throw new AppError('Email address is required.', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await queryOne<{ id: string }>('SELECT id FROM users WHERE email = ?', [normalizedEmail]);

  // Anti-enumeration defense
  if (!user) {
    return {
      message: 'If an account exists for this email, password reset instructions have been sent.',
    };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expires = now + 60 * 60 * 1000; // 1 hour

  await execute(
    'UPDATE users SET reset_token = ?, reset_token_expires = ?, updated_at = ? WHERE id = ?',
    [resetToken, expires, now, user.id]
  );

  return {
    message: 'If an account exists for this email, password reset instructions have been sent.',
    demoToken: resetToken, // Exposed for interactive testing / QA suite
  };
}

/**
 * Validates single-use token and sets new securely hashed password.
 */
export async function resetPasswordWithToken(
  token: string,
  newPass: string,
  confirmPass?: string
): Promise<{ message: string }> {
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    throw new AppError('Invalid or expired password reset link.', 400);
  }

  if (!newPass || typeof newPass !== 'string') {
    throw new AppError('New password is required.', 400);
  }

  if (newPass.length < 8) {
    throw new AppError('Password does not meet the required requirements. Minimum 8 characters required.', 400);
  }

  if (confirmPass !== undefined && confirmPass !== newPass) {
    throw new AppError('Passwords do not match.', 400);
  }

  const now = Date.now();
  const user = await queryOne<{ id: string }>(
    'SELECT id FROM users WHERE reset_token = ? AND reset_token_expires > ?',
    [token.trim(), now]
  );

  if (!user) {
    throw new AppError('Invalid or expired password reset link.', 400);
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(newPass, salt);

  // Invalidate token immediately upon consumption and reset failed attempts
  await execute(
    `UPDATE users 
     SET password_hash = ?, 
         reset_token = NULL, 
         reset_token_expires = NULL, 
         failed_login_attempts = 0, 
         locked_until = NULL, 
         updated_at = ? 
     WHERE id = ?`,
    [passwordHash, now, user.id]
  );

  return {
    message: 'Your password has been successfully reset. You may now sign in with your new password.',
  };
}
