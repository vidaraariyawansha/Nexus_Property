import { queryOne, queryAll, execute } from '../db/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { UserRole, UserSummary } from '../types/index.js';
import { logAudit } from './auditService.js';

// Modular Services
export { registerUser, ALLOWED_SELF_REGISTRATION_ROLES } from './registrationService.js';
export type { RegistrationRequest, RegistrationResult } from './registrationService.js';

export { loginUser, getCurrentUser, changePassword, updateProfile } from './authenticationService.js';
export type { LoginResult } from './authenticationService.js';

export { verifyEmail, resendVerification } from './verificationService.js';
export type { VerificationResponse } from './verificationService.js';

export { requestPasswordReset, resetPasswordWithToken } from './passwordResetService.js';

// Admin User Management Services
export async function listAllUsers(adminId: string, options: {
  search?: string;
  role?: string;
  enabled?: boolean;
  page?: number;
  size?: number;
}): Promise<{ users: UserSummary[]; total: number; page: number; totalPages: number }> {
  const page = Math.max(1, options.page || 1);
  const size = Math.min(100, Math.max(1, options.size || 20));
  const offset = (page - 1) * size;

  const whereClauses: string[] = ['1=1'];
  const params: (string | number)[] = [];

  if (options.search) {
    whereClauses.push('(full_name LIKE ? OR email LIKE ?)');
    const searchTerm = `%${options.search.trim()}%`;
    params.push(searchTerm, searchTerm);
  }

  if (options.role && options.role !== 'ALL') {
    whereClauses.push('role = ?');
    params.push(options.role);
  }

  if (options.enabled !== undefined) {
    whereClauses.push('enabled = ?');
    params.push(options.enabled ? 1 : 0);
  }

  const whereSql = whereClauses.join(' AND ');

  const countRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*) as total FROM users WHERE ${whereSql}`,
    params
  );
  const total = countRow ? countRow.total : 0;

  const userRows = await queryAll<{
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    role: string;
    enabled: number;
    email_verified: number;
    created_at: number;
  }>(
    `SELECT id, full_name, email, phone, role, enabled, email_verified, created_at 
     FROM users 
     WHERE ${whereSql} 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    [...params, size, offset]
  );

  return {
    users: userRows.map(u => ({
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      phone: u.phone,
      role: u.role as UserRole,
      enabled: u.enabled === 1,
      emailVerified: u.email_verified === 1,
      createdAt: u.created_at,
    })),
    total,
    page,
    totalPages: Math.ceil(total / size),
  };
}

export async function adminUpdateUserRole(adminId: string, targetUserId: string, newRole: UserRole): Promise<void> {
  const validRoles: UserRole[] = ['CUSTOMER', 'PROPERTY_OWNER', 'AGENT', 'ADMIN'];
  if (!validRoles.includes(newRole)) {
    throw new AppError('Invalid role specified.', 400);
  }

  if (adminId === targetUserId && newRole !== 'ADMIN') {
    throw new AppError('Administrators cannot demote their own account.', 400);
  }

  const user = await queryOne<{ role: string }>('SELECT role FROM users WHERE id = ?', [targetUserId]);
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  await execute('UPDATE users SET role = ?, updated_at = ? WHERE id = ?', [newRole, Date.now(), targetUserId]);
  await logAudit(adminId, 'USER_ROLE_CHANGED', 'USER', targetUserId, `Role changed from ${user.role} to ${newRole}`);
}

export async function adminToggleUserEnabled(adminId: string, targetUserId: string, enabled: boolean): Promise<void> {
  if (adminId === targetUserId && !enabled) {
    throw new AppError('Administrators cannot disable their own account.', 400);
  }

  const user = await queryOne<{ full_name: string }>('SELECT full_name FROM users WHERE id = ?', [targetUserId]);
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  await execute('UPDATE users SET enabled = ?, updated_at = ? WHERE id = ?', [enabled ? 1 : 0, Date.now(), targetUserId]);
  await logAudit(adminId, enabled ? 'USER_ENABLED' : 'USER_DISABLED', 'USER', targetUserId, `User ${user.full_name} ${enabled ? 'enabled' : 'disabled'}`);
}
