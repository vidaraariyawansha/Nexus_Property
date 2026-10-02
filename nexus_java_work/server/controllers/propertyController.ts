import { Router } from 'express';
import {
  searchProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  adminApproveProperty,
  getOwnerProperties,
  addPropertyImage,
  setPrimaryImage,
  deletePropertyImage,
  uploadTempPropertyMedia,
  uploadAndAddPropertyImage,
  batchUploadPropertyImages,
  replacePropertyImage,
  reorderPropertyImages,
  setPrimaryImageSafe,
  deletePropertyImageSafe,
  MEDIA_CONFIG,
  getRecentlyViewedProperties,
  recordRecentlyViewed,
} from '../services/propertyService.js';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.js';
import { PropertyType, PropertyStatus } from '../types/index.js';

export const propertyRouter = Router();

// Media Configuration (Configurable limits)
propertyRouter.get('/media/config', (_req, res) => {
  res.json({
    success: true,
    data: {
      maxImagesPerProperty: MEDIA_CONFIG.maxImagesPerProperty,
      maxFileSizePerImageBytes: MEDIA_CONFIG.maxFileSizePerImage,
      maxFileSizeMB: MEDIA_CONFIG.maxFileSizePerImage / (1024 * 1024),
      maxTotalBatchSizeMB: MEDIA_CONFIG.maxTotalBatchUploadSize / (1024 * 1024),
      allowedFormats: MEDIA_CONFIG.allowedFormats,
      allowedMimeTypes: MEDIA_CONFIG.allowedMimeTypes,
    },
  });
});

// Upload Temporary Media File (used during Property Creation before ID is assigned)
propertyRouter.post('/media/upload-temp', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await uploadTempPropertyMedia(req.user!.userId, req.user!.role, req.body);
    res.status(201).json({
      success: true,
      message: 'Temporary media file uploaded successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// Search & Filter Properties (Public or Authenticated)
propertyRouter.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const {
      keyword,
      location,
      propertyType,
      minPrice,
      maxPrice,
      bedrooms,
      amenities,
      status,
      page,
      size,
      sortBy,
      sortOrder,
    } = req.query;

    const parsedAmenities = amenities
      ? Array.isArray(amenities)
        ? (amenities as string[])
        : (amenities as string).split(',').map(s => s.trim())
      : undefined;

    const result = await searchProperties(
      {
        keyword: keyword as string,
        location: location as string,
        propertyType: propertyType as PropertyType | 'ALL',
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        amenities: parsedAmenities,
        status: status as PropertyStatus | 'ALL',
        page: page ? Number(page) : 1,
        size: size ? Number(size) : 12,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
      },
      req.user?.role,
      req.user?.userId
    );

    res.json({
      success: true,
      message: 'Properties retrieved successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// Owner's listings
propertyRouter.get('/owner/my-listings', requireRole('PROPERTY_OWNER', 'ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const properties = await getOwnerProperties(req.user!.userId);
    res.json({
      success: true,
      message: 'Owner properties retrieved.',
      data: properties,
    });
  } catch (err) {
    next(err);
  }
});

// Recently viewed properties (Authenticated User)
propertyRouter.get('/user/recently-viewed', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const properties = await getRecentlyViewedProperties(req.user!.userId, 8);
    res.json({
      success: true,
      message: 'Recently viewed properties retrieved.',
      data: properties,
    });
  } catch (err) {
    next(err);
  }
});

// Explicit record view
propertyRouter.post('/:id/view', async (req: AuthenticatedRequest, res, next) => {
  try {
    if (req.user?.userId) {
      await recordRecentlyViewed(req.user.userId, req.params.id);
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Property details by ID
propertyRouter.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const property = await getPropertyById(req.params.id, req.user?.role, req.user?.userId);
    res.json({
      success: true,
      message: 'Property details retrieved.',
      data: property,
    });
  } catch (err) {
    next(err);
  }
});

// Create Listing (Owner or Admin)
propertyRouter.post('/', requireRole('PROPERTY_OWNER', 'ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const property = await createProperty(req.user!.userId, req.body);
    res.status(201).json({
      success: true,
      message: 'Property listing created successfully.',
      data: property,
    });
  } catch (err) {
    next(err);
  }
});

// Update Listing
propertyRouter.put('/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const updated = await updateProperty(req.user!.userId, req.user!.role, req.params.id, req.body);
    res.json({
      success: true,
      message: 'Property updated successfully.',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
});

// Delete Listing
propertyRouter.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await deleteProperty(req.user!.userId, req.user!.role, req.params.id);
    res.json({
      success: true,
      message: 'Property deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Admin Approve / Reject Listing
propertyRouter.post('/:id/approve', requireRole('ADMIN'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { approved } = req.body;
    await adminApproveProperty(req.user!.userId, req.params.id, Boolean(approved));
    res.json({
      success: true,
      message: `Property ${approved ? 'approved and made active' : 'rejected and returned to draft'}.`,
    });
  } catch (err) {
    next(err);
  }
});

// Add Property Image (Supports URL or uploaded base64 / dataUrl payload)
propertyRouter.post('/:id/images', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { imageUrl, dataUrl, base64, isPrimary } = req.body;
    let image;
    if (dataUrl || base64) {
      image = await uploadAndAddPropertyImage(req.user!.userId, req.user!.role, req.params.id, {
        dataUrl,
        base64,
        isPrimary: Boolean(isPrimary),
      });
    } else {
      image = await addPropertyImage(req.user!.userId, req.user!.role, req.params.id, imageUrl, isPrimary);
    }
    res.status(201).json({
      success: true,
      message: 'Property image added successfully.',
      data: image,
    });
  } catch (err) {
    next(err);
  }
});

// Single Direct Upload
propertyRouter.post('/:id/images/upload', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const image = await uploadAndAddPropertyImage(req.user!.userId, req.user!.role, req.params.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Image uploaded and attached successfully.',
      data: image,
    });
  } catch (err) {
    next(err);
  }
});

// Batch Upload Images (up to remaining slots <= 15)
propertyRouter.post('/:id/images/batch-upload', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { files } = req.body;
    const images = await batchUploadPropertyImages(req.user!.userId, req.user!.role, req.params.id, files);
    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${images.length} property images.`,
      data: images,
    });
  } catch (err) {
    next(err);
  }
});

// Reorder Property Images
propertyRouter.put('/:id/images/reorder', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { imageIds } = req.body;
    const images = await reorderPropertyImages(req.user!.userId, req.user!.role, req.params.id, imageIds);
    res.json({
      success: true,
      message: 'Property images reordered successfully.',
      data: images,
    });
  } catch (err) {
    next(err);
  }
});

// Replace Specific Image (preserves position and primary status)
propertyRouter.put('/:id/images/:imageId/replace', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const replaced = await replacePropertyImage(
      req.user!.userId,
      req.user!.role,
      req.params.id,
      req.params.imageId,
      req.body
    );
    res.json({
      success: true,
      message: 'Property image replaced successfully.',
      data: replaced,
    });
  } catch (err) {
    next(err);
  }
});

// Set Primary Image
propertyRouter.put('/:id/images/:imageId/primary', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await setPrimaryImageSafe(req.user!.userId, req.user!.role, req.params.id, req.params.imageId);
    res.json({
      success: true,
      message: 'Primary image updated successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Delete Property Image
propertyRouter.delete('/:id/images/:imageId', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await deletePropertyImageSafe(req.user!.userId, req.user!.role, req.params.id, req.params.imageId);
    res.json({
      success: true,
      message: 'Property image removed successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// AI Real-Estate Photography Blueprint & Specifications
propertyRouter.get('/:id/photo-specs', async (req, res, next) => {
  try {
    const { buildPhotoBlueprintForProperty } = await import('../services/propertyAiMediaService.js');
    const blueprint = await buildPhotoBlueprintForProperty(req.params.id);
    res.json({
      success: true,
      message: 'AI Photography Blueprint generated.',
      data: blueprint,
    });
  } catch (err) {
    next(err);
  }
});

// AI Real-Estate Photography Auto-Generation & Catalog Regeneration
propertyRouter.post('/:id/generate-images', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { regeneratePropertyImages } = await import('../services/propertyAiMediaService.js');
    const result = await regeneratePropertyImages(req.params.id);
    res.json({
      success: true,
      message: 'Professional AI real-estate image set generated successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

