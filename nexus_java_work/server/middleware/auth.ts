import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne } from '../db/database.js';
import { UserRole } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nexus-property-secure-jwt-secret-key-2026';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  if (!token && req.cookies && req.cookies.nexus_auth) {
    token = req.cookies.nexus_auth;
  }

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    // Server-side verification: check that account is still valid and enabled
    const userRow = await queryOne<{ id: string; enabled: number; role: string; full_name: string; email: string }>(
      'SELECT id, enabled, role, full_name, email FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!userRow || userRow.enabled !== 1) {
      // User deleted or suspended
      res.clearCookie('nexus_auth');
      return next();
    }

    req.user = {
      userId: userRow.id,
      email: userRow.email,
      role: userRow.role as UserRole,
      fullName: userRow.full_name,
    };

    next();
  } catch (err) {
    // Invalid or expired token
    next();
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required. Please sign in to access this resource.',
      errors: ['UNAUTHENTICATED']
    });
    return;
  }
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in to access this resource.',
        errors: ['UNAUTHENTICATED']
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Access forbidden: You do not possess the required permissions for this action.',
        errors: ['FORBIDDEN_ROLE']
      });
      return;
    }

    next();
  };
}
