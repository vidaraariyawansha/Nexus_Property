import bcrypt from 'bcryptjs';
import { execute, queryOne } from '../db/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { generateToken, TokenPayload } from '../middleware/auth.js';
import { UserRole, UserSummary } from '../types/index.js';

export interface LoginResult {
  token: string;
  user: UserSummary;
  maxAgeMs: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

/**
 * Secure authentication with account lockout protection, anti-enumeration,
 * account status validation, and remember-me session management.
 */
export async function loginUser(
  email: string,
  password: string,
  rememberMe: boolean = false
): Promise<LoginResult> {
  // 1. Validation
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new AppError('Please enter your email address.', 400);
  }
  if (!password || typeof password !== 'string') {
    throw new AppError('Password is required.', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const now = Date.now();

  // 2. Query user record
  const user = await queryOne<{
    id: string;
    full_name: string;
    email: string;
    password_hash: string;
    phone: string | null;
    role: string;
    enabled: number;
    email_verified: number;
    failed_login_attempts: number;
    locked_until: number | null;
    created_at: number;
  }>('SELECT * FROM users WHERE email = ?', [normalizedEmail]);

  // Anti-enumeration: If user does not exist, return generic credential failure
  if (!user) {
    throw new AppError('Email or password is incorrect.', 401);
  }

  // 3. Brute-force / Account Lockout Check
  if (user.locked_until && user.locked_until > now) {
    const minutesLeft = Math.ceil((user.locked_until - now) / 60000);
    throw new AppError(
      `This account is temporarily locked due to consecutive failed login attempts. Please try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''} or reset your password.`,
      423
    );
  }

  // 4. Account Enabled / Active Status Check
  if (user.enabled !== 1) {
    throw new AppError('This account is currently disabled. Please contact support.', 403);
  }

  // 5. Password Verification
  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    const newFailCount = (user.failed_login_attempts || 0) + 1;
    let newLockUntil: number | null = null;
    if (newFailCount >= MAX_FAILED_ATTEMPTS) {
      newLockUntil = now + LOCKOUT_DURATION_MS;
    }

    await execute(
      'UPDATE users SET failed_login_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?',
      [newFailCount, newLockUntil, now, user.id]
    );

    if (newLockUntil) {
      throw new AppError(
        'Too many failed login attempts. Your account has been temporarily locked for 15 minutes for your security.',
        423
      );
    }

    throw new AppError('Email or password is incorrect.', 401);
  }

  // 6. Successful Login: Clear lockouts and record last login
  await execute(
    'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = ?, updated_at = ? WHERE id = ?',
    [now, now, user.id]
  );

  const role = user.role as UserRole;
  const tokenPayload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role,
    fullName: user.full_name,
  };

  const token = generateToken(tokenPayload);
  const maxAgeMs = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

  return {
    token,
    user: {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      role,
      enabled: true,
      emailVerified: user.email_verified === 1,
      createdAt: user.created_at,
    },
    maxAgeMs,
  };
}

export async function getCurrentUser(userId: string): Promise<UserSummary> {
  const user = await queryOne<{
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
    enabled: number;
    email_verified: number;
    created_at: number;
  }>('SELECT id, full_name, email, phone, role, enabled, email_verified, created_at FROM users WHERE id = ?', [userId]);

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role as UserRole,
    enabled: user.enabled === 1,
    emailVerified: user.email_verified === 1,
    createdAt: user.created_at,
  };
}

export async function changePassword(
  userId: string,
  currentPass: string,
  newPass: string,
  confirmPass?: string
): Promise<void> {
  if (!currentPass || !newPass) {
    throw new AppError('Both current and new password are required.', 400);
  }

  if (newPass.length < 8) {
    throw new AppError('Password does not meet the required requirements. Minimum 8 characters required.', 400);
  }

  if (confirmPass !== undefined && confirmPass !== newPass) {
    throw new AppError('Passwords do not match.', 400);
  }

  const user = await queryOne<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = ?', [userId]);
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  const isValid = bcrypt.compareSync(currentPass, user.password_hash);
  if (!isValid) {
    throw new AppError('Current password is incorrect.', 400);
  }

  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(newPass, salt);
  const now = Date.now();

  await execute('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?', [newHash, now, userId]);
}

export async function updateProfile(
  userId: string,
  data: { fullName?: string; phone?: string }
): Promise<UserSummary> {
  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (data.fullName !== undefined) {
    const trimmed = data.fullName.trim().replace(/\s+/g, ' ');
    if (trimmed.length < 2 || trimmed.length > 100) {
      throw new AppError('Full name must be between 2 and 100 characters.', 400);
    }
    updates.push('full_name = ?');
    params.push(trimmed);
  }

  if (data.phone !== undefined) {
    updates.push('phone = ?');
    params.push(data.phone ? data.phone.trim() : null);
  }

  if (updates.length === 0) {
    return getCurrentUser(userId);
  }

  updates.push('updated_at = ?');
  params.push(Date.now());
  params.push(userId);

  await execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
  return getCurrentUser(userId);
}
