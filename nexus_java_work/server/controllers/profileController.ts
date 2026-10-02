import { Router } from 'express';
import {
  adminSetVerification,
  getFullProfile,
  getPublicProfile,
  removeProfilePhoto,
  updatePersonalContact,
  updateProfessionalProfile,
  uploadProfilePhoto,
} from '../services/profileService.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

export const profileRouter = Router();

/**
 * GET /api/profile/me
 * Retrieves current user's authenticated profile, including completeness and private settings.
 */
profileRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const fullProfile = await getFullProfile(req.user!.userId);
    res.json({
      success: true,
      message: 'User profile retrieved successfully.',
      data: fullProfile,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/profile/personal
 * Updates verified legal contact details, privacy/visibility, and communication preferences.
 */
profileRouter.put('/personal', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const updated = await updatePersonalContact(req.user!.userId, req.body);
    res.json({
      success: true,
      message: 'Personal contact details and preferences updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/profile/professional
 * Updates professional broker/agent credentials and biography.
 * Restricted to AGENT, PROPERTY_OWNER, and ADMIN.
 */
profileRouter.put('/professional', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const updated = await updateProfessionalProfile(req.user!.userId, req.user!.role, req.body);
    res.json({
      success: true,
      message: 'Professional profile updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/profile/photo
 * Uploads a profile image (supports base64 / dataUrl from client crop or raw binary).
 * Magic bytes and MIME verification performed server-side.
 */
profileRouter.post('/photo', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { dataUrl, base64, mimeType } = req.body;

    let buffer: Buffer;
    let declaredMime: string | undefined = mimeType;

    if (dataUrl && typeof dataUrl === 'string') {
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        declaredMime = match[1];
        buffer = Buffer.from(match[2], 'base64');
      } else {
        buffer = Buffer.from(dataUrl, 'base64');
      }
    } else if (base64 && typeof base64 === 'string') {
      buffer = Buffer.from(base64, 'base64');
    } else {
      throw new AppError('No image payload received. Please provide a valid image.', 400);
    }

    const result = await uploadProfilePhoto(req.user!.userId, buffer, declaredMime);
    res.json({
      success: true,
      message: 'Profile photo uploaded and processed successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/profile/photo
 * Removes existing profile photo, cleans up file storage, and reverts to dynamic initials fallback.
 */
profileRouter.delete('/photo', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await removeProfilePhoto(req.user!.userId);
    res.json({
      success: true,
      message: 'Profile photo removed successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/profile/public/:userId
 * Public endpoint for property detail page and directory.
 * Contact details (phone, email, WhatsApp) are strictly filtered server-side based on viewer authentication status.
 */
profileRouter.get('/public/:userId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.userId;
    const requestingUserRole = req.user?.role;

    const publicProfile = await getPublicProfile(userId, requestingUserId, requestingUserRole);
    res.json({
      success: true,
      message: 'Public profile retrieved.',
      data: publicProfile,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/profile/admin/verify/:userId
 * Allows system administrators to verify agents or property owners.
 * Non-admins are blocked by requireRole('ADMIN').
 */
profileRouter.put('/admin/verify/:userId', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { userId } = req.params;
    const { isVerified } = req.body;

    if (typeof isVerified !== 'boolean') {
      throw new AppError('isVerified must be a boolean value.', 400);
    }

    const updated = await adminSetVerification(req.user!.userId, userId, isVerified);
    res.json({
      success: true,
      message: `User verification updated to ${isVerified}.`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});
