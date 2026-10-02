import { Router, Response } from 'express';
import {
  registerUser,
  loginUser,
  getCurrentUser,
  updateProfile,
  changePassword,
  requestPasswordReset,
  resetPasswordWithToken,
  verifyEmail,
  resendVerification,
  listAllUsers,
  adminUpdateUserRole,
  adminToggleUserEnabled,
} from '../services/authService.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.js';

export const authRouter = Router();

// Register (Supports 2-step registration & returns verification token for workflow)
authRouter.post('/register', async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
    res.cookie('nexus_auth', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(201).json({
      success: true,
      message: 'Account registered successfully. Please verify your email to unlock all features.',
      data: result,
      verificationToken: result.verificationToken,
    });
  } catch (err) {
    next(err);
  }
});

// Verify Email Token
authRouter.post('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.body;
    const result = await verifyEmail(token);
    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// Resend Email Verification Token
authRouter.post('/resend-verification', async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await resendVerification(email);
    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// Login (With rememberMe support & account lockout defense)
authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;
    const result = await loginUser(email, password, Boolean(rememberMe));
    res.cookie('nexus_auth', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: result.maxAgeMs,
    });
    res.json({
      success: true,
      message: 'Signed in successfully.',
      data: {
        token: result.token,
        user: result.user,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Logout (Session invalidation & cookie clearance)
authRouter.post('/logout', (_req, res) => {
  res.clearCookie('nexus_auth');
  res.json({
    success: true,
    message: 'Signed out successfully.',
  });
});

// Current User profile
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const user = await getCurrentUser(req.user!.userId);
    res.json({
      success: true,
      message: 'User profile retrieved.',
      data: user,
    });
  } catch (err) {
    next(err);
  }
});

// Update Profile
authRouter.put('/profile', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const updated = await updateProfile(req.user!.userId, req.body);
    res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// Change Password
authRouter.put('/change-password', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    await changePassword(req.user!.userId, currentPassword, newPassword, confirmPassword);
    res.json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Forgot Password (Initiates reset token with generic anti-enumeration response)
authRouter.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await requestPasswordReset(email);
    res.json({
      success: true,
      message: result.message,
      data: result.demoToken ? { demoToken: result.demoToken } : undefined,
    });
  } catch (err) {
    next(err);
  }
});

// Reset Password with Token
authRouter.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;
    const result = await resetPasswordWithToken(token, newPassword, confirmPassword);
    res.json({
      success: true,
      message: result.message,
    });
  } catch (err) {
    next(err);
  }
});

// --- ADMIN USER MANAGEMENT ---
authRouter.get('/users', requireRole('ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { search, role, enabled, page, size } = req.query;
    const result = await listAllUsers(req.user!.userId, {
      search: search as string,
      role: role as string,
      enabled: enabled !== undefined ? enabled === 'true' || enabled === '1' : undefined,
      page: page ? Number(page) : undefined,
      size: size ? Number(size) : undefined,
    });
    res.json({
      success: true,
      message: 'Users listed successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.put('/users/:id/role', requireRole('ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { role } = req.body;
    await adminUpdateUserRole(req.user!.userId, req.params.id, role);
    res.json({
      success: true,
      message: `User role updated to ${role}.`,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.put('/users/:id/enabled', requireRole('ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { enabled } = req.body;
    await adminToggleUserEnabled(req.user!.userId, req.params.id, Boolean(enabled));
    res.json({
      success: true,
      message: `User account ${enabled ? 'enabled' : 'disabled'} successfully.`,
    });
  } catch (err) {
    next(err);
  }
});
