import { Router } from 'express';
import {
  addPropertyToComparison,
  createComparison,
  deleteComparison,
  getComparison,
  getCustomerComparisonPropertyIds,
  getCustomerComparisons,
  quickAddToComparison,
  removePropertyFromComparison,
  updateComparison,
} from '../services/comparisonService.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.js';

export const comparisonRouter = Router();

// All comparison endpoints require authentication (CUSTOMER or ADMIN)
comparisonRouter.use(requireAuth);
comparisonRouter.use(requireRole('CUSTOMER', 'ADMIN'));

/**
 * GET /api/comparisons
 * Retrieves all comparison lists belonging to the authenticated customer.
 */
comparisonRouter.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const comparisons = await getCustomerComparisons(req.user!.userId);
    res.json({
      success: true,
      message: 'Comparisons retrieved successfully.',
      data: comparisons,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/comparisons
 * Creates a new comparison list.
 */
comparisonRouter.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { name } = req.body;
    const comparison = await createComparison(req.user!.userId, name);
    res.status(201).json({
      success: true,
      message: 'Comparison created successfully.',
      data: comparison,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/comparisons/property-ids
 * Retrieves all property IDs in the customer's comparisons (for [✓ In Compare] badge).
 */
comparisonRouter.get('/property-ids', async (req: AuthenticatedRequest, res, next) => {
  try {
    const ids = await getCustomerComparisonPropertyIds(req.user!.userId);
    res.json({
      success: true,
      data: ids,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/comparisons/quick-add
 * 1-click addition to customer's active comparison or auto-created comparison.
 */
comparisonRouter.post('/quick-add', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { propertyId, comparisonId } = req.body;
    const result = await quickAddToComparison(req.user!.userId, propertyId, comparisonId);
    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/comparisons/:id
 * Retrieves comparison details with side-by-side properties and highlights.
 */
comparisonRouter.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const response = await getComparison(req.user!.userId, id);
    res.json({
      success: true,
      message: 'Comparison details retrieved.',
      data: response,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/comparisons/:id
 * Renames an existing comparison list.
 */
comparisonRouter.put('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const updated = await updateComparison(req.user!.userId, id, name);
    res.json({
      success: true,
      message: 'Comparison updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/comparisons/:id
 * Deletes a comparison list (cascades items, preserves properties).
 */
comparisonRouter.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const result = await deleteComparison(req.user!.userId, id);
    res.json({
      success: true,
      message: 'Comparison deleted successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/comparisons/:id/properties
 * Adds a property to a comparison list.
 */
comparisonRouter.post('/:id/properties', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const { propertyId } = req.body;
    const result = await addPropertyToComparison(req.user!.userId, id, propertyId);
    res.json({
      success: true,
      message: 'Property added to comparison.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/comparisons/:id/properties/:propertyId
 * Removes a property from a comparison list.
 */
comparisonRouter.delete('/:id/properties/:propertyId', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id, propertyId } = req.params;
    const result = await removePropertyFromComparison(req.user!.userId, id, propertyId);
    res.json({
      success: true,
      message: 'Property removed from comparison.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});
