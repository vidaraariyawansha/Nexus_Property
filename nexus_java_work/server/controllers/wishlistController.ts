import { Router } from 'express';
import {
  getCustomerWishlist,
  toggleWishlistItem,
  getCustomerDashboardSummary,
} from '../services/wishlistService.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.js';

export const wishlistRouter = Router();

// Get customer's saved properties wishlist
wishlistRouter.get('/', requireRole('CUSTOMER', 'ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const wishlist = await getCustomerWishlist(req.user!.userId);
    res.json({
      success: true,
      message: 'Wishlist retrieved successfully.',
      data: wishlist,
    });
  } catch (err) {
    next(err);
  }
});

// Toggle property in wishlist
wishlistRouter.post('/toggle', requireRole('CUSTOMER', 'ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { propertyId } = req.body;
    const result = await toggleWishlistItem(req.user!.userId, propertyId);
    res.json({
      success: true,
      message: result.saved ? 'Property saved to your favorites.' : 'Property removed from your favorites.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// Customer dashboard summary metrics (saved props, appointments, inquiries, complaints)
wishlistRouter.get('/dashboard', requireRole('CUSTOMER', 'ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const summary = await getCustomerDashboardSummary(req.user!.userId);
    res.json({
      success: true,
      message: 'Dashboard summary retrieved.',
      data: summary,
    });
  } catch (err) {
    next(err);
  }
});
