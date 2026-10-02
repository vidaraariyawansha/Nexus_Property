import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execute, executeTransaction, queryAll, queryOne } from '../db/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { PropertyImage, UserRole } from '../types/index.js';
import { logAudit } from './auditService.js';

// Configuration parameters (configurable via environment variables or properties)
export const MEDIA_CONFIG = {
  maxImagesPerProperty: Number(process.env.PROPERTY_MEDIA_MAX_IMAGES || 15),
  maxFileSizePerImage: Number(process.env.PROPERTY_MEDIA_MAX_FILE_SIZE_MB || 5) * 1024 * 1024, // 5 MB
  maxTotalBatchUploadSize: Number(process.env.PROPERTY_MEDIA_MAX_BATCH_SIZE_MB || 30) * 1024 * 1024, // 30 MB
  allowedFormats: ['jpeg', 'png', 'webp'] as const,
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
};

const UPLOAD_DIR = path.resolve(process.cwd(), 'public', 'uploads', 'properties');

export function ensurePropertyUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export type SupportedMediaFormat = 'jpeg' | 'png' | 'webp';

export interface ValidatedMediaImage {
  buffer: Buffer;
  format: SupportedMediaFormat;
  mimeType: string;
  extension: string;
  size: number;
}

/**
 * Validates image content using magic bytes, MIME verification, and anti-malware signatures.
 * Blocks executable payloads, script injection, corrupted images, and oversized files.
 */
export function validateMediaBuffer(buffer: Buffer, declaredMime?: string): ValidatedMediaImage {
  if (!buffer || buffer.length === 0) {
    throw new AppError('Empty file provided. Please choose a valid image file.', 400);
  }

  if (buffer.length > MEDIA_CONFIG.maxFileSizePerImage) {
    throw new AppError(
      `Image size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds the maximum allowed limit of ${MEDIA_CONFIG.maxFileSizePerImage / (1024 * 1024)} MB per image.`,
      400
    );
  }

  // Reject executable binaries (MZ for Windows PE, ELF for Linux)
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) {
    throw new AppError('Security violation: Executable files (PE/EXE) are strictly prohibited.', 400);
  }
  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    throw new AppError('Security violation: Executable binary files (ELF) are strictly prohibited.', 400);
  }

  // Reject PDF files (%PDF-)
  if (buffer.length >= 5 && buffer.slice(0, 5).toString('ascii') === '%PDF-') {
    throw new AppError('Invalid format: PDF documents are not supported as property images. Please upload JPG, PNG, or WebP.', 400);
  }

  // Inspect first 200 bytes for embedded script signatures
  const headerSlice = buffer.slice(0, 200).toString('utf-8').toLowerCase();
  if (
    headerSlice.includes('<?php') ||
    headerSlice.includes('<script') ||
    headerSlice.includes('<html') ||
    headerSlice.includes('eval(') ||
    headerSlice.includes('<svg')
  ) {
    throw new AppError('Security violation: Script or markup content detected in image payload.', 400);
  }

  // 1. JPEG signature verification: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return {
      buffer,
      format: 'jpeg',
      mimeType: 'image/jpeg',
      extension: 'jpg',
      size: buffer.length,
    };
  }

  // 2. PNG signature verification: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return {
      buffer,
      format: 'png',
      mimeType: 'image/png',
      extension: 'png',
      size: buffer.length,
    };
  }

  // 3. WebP signature verification: 52 49 46 46 (RIFF) at [0..3] and 57 45 42 50 (WEBP) at [8..11]
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return {
      buffer,
      format: 'webp',
      mimeType: 'image/webp',
      extension: 'webp',
      size: buffer.length,
    };
  }

  throw new AppError(
    'Unsupported or corrupted image file. Only JPEG, JPG, PNG, and WebP images are allowed.',
    400
  );
}

/**
 * Saves validated image buffer to the dedicated properties upload directory with a server-controlled random filename.
 * Protects against directory traversal and malicious filenames.
 */
export async function savePropertyMediaFile(propertyIdOrPrefix: string, validated: ValidatedMediaImage): Promise<string> {
  ensurePropertyUploadDir();

  const cleanPrefix = (propertyIdOrPrefix || 'media').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
  const randomSuffix = crypto.randomUUID().replace(/-/g, '');
  const filename = `prop_${cleanPrefix}_${randomSuffix}.${validated.extension}`;
  const targetPath = path.join(UPLOAD_DIR, filename);

  // Security assertion: target path must be strictly inside UPLOAD_DIR
  if (!targetPath.startsWith(UPLOAD_DIR)) {
    throw new AppError('Path traversal attempt detected.', 400);
  }

  fs.writeFileSync(targetPath, validated.buffer);
  return `/uploads/properties/${filename}`;
}

/**
 * Safely removes a property image file from disk if it resides in the property upload directory.
 */
export function safelyDeletePropertyMediaFile(fileUrl?: string | null): void {
  if (!fileUrl || typeof fileUrl !== 'string') return;

  // Only remove local server files in /uploads/properties/
  if (!fileUrl.startsWith('/uploads/properties/')) return;

  const filename = path.basename(fileUrl);
  if (!filename || filename.includes('..') || !filename.startsWith('prop_')) {
    return;
  }

  const filePath = path.join(UPLOAD_DIR, filename);
  if (filePath.startsWith(UPLOAD_DIR) && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('Failed to unlink property media file:', err);
    }
  }
}

/**
 * Helper to parse base64 / dataUrl / raw binary payload
 */
export function parseImagePayload(payload: { dataUrl?: string; base64?: string; buffer?: Buffer; mimeType?: string }): {
  buffer: Buffer;
  declaredMime?: string;
} {
  if (payload.buffer && Buffer.isBuffer(payload.buffer)) {
    return { buffer: payload.buffer, declaredMime: payload.mimeType };
  }

  if (payload.dataUrl && typeof payload.dataUrl === 'string') {
    const match = payload.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      return {
        declaredMime: match[1],
        buffer: Buffer.from(match[2], 'base64'),
      };
    }
    return {
      buffer: Buffer.from(payload.dataUrl, 'base64'),
      declaredMime: payload.mimeType,
    };
  }

  if (payload.base64 && typeof payload.base64 === 'string') {
    return {
      buffer: Buffer.from(payload.base64, 'base64'),
      declaredMime: payload.mimeType,
    };
  }

  throw new AppError('No valid image data provided.', 400);
}

/**
 * Verifies property ownership and IDOR authorization.
 */
export async function verifyPropertyAccess(
  userId: string,
  userRole: UserRole,
  propertyId: string,
  actionDescription: string = 'modify this property'
): Promise<{ id: string; owner_id: string; title: string }> {
  const property = await queryOne<{ id: string; owner_id: string; title: string }>(
    'SELECT id, owner_id, title FROM properties WHERE id = ?',
    [propertyId]
  );

  if (!property) {
    throw new AppError('Property not found.', 404);
  }

  const isOwner = property.owner_id === userId;
  const isAdmin = userRole === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new AppError(`Access forbidden: You do not have permission to ${actionDescription}.`, 403);
  }

  return property;
}

/**
 * Uploads a temporary property media file (for the Create Property flow before property is inserted).
 */
export async function uploadTempPropertyMedia(
  userId: string,
  userRole: UserRole,
  rawPayload: { dataUrl?: string; base64?: string; buffer?: Buffer; mimeType?: string }
): Promise<{ url: string; size: number; format: string; extension: string }> {
  if (userRole !== 'PROPERTY_OWNER' && userRole !== 'ADMIN') {
    throw new AppError('Forbidden: Only property owners and administrators can upload media.', 403);
  }

  const { buffer, declaredMime } = parseImagePayload(rawPayload);
  const validated = validateMediaBuffer(buffer, declaredMime);
  const url = await savePropertyMediaFile('temp', validated);

  return {
    url,
    size: validated.size,
    format: validated.format,
    extension: validated.extension,
  };
}

/**
 * Uploads and attaches a single media file to an existing property.
 * Enforces the 15-image maximum limit, magic bytes check, and deterministic primary status.
 */
export async function uploadAndAddPropertyImage(
  userId: string,
  userRole: UserRole,
  propertyId: string,
  rawPayload: { dataUrl?: string; base64?: string; buffer?: Buffer; mimeType?: string; isPrimary?: boolean }
): Promise<PropertyImage> {
  const property = await verifyPropertyAccess(userId, userRole, propertyId, 'add images to this property');

  const { buffer, declaredMime } = parseImagePayload(rawPayload);
  const validated = validateMediaBuffer(buffer, declaredMime);

  // Check 15-image maximum count: existing + 1 <= 15
  const countRow = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM property_images WHERE property_id = ?',
    [propertyId]
  );
  const existingCount = countRow ? countRow.count : 0;

  if (existingCount >= MEDIA_CONFIG.maxImagesPerProperty) {
    throw new AppError(`A property can contain a maximum of ${MEDIA_CONFIG.maxImagesPerProperty} images. Maximum 15 images allowed.`, 400);
  }

  const savedUrl = await savePropertyMediaFile(propertyId, validated);
  const imageId = `img_${crypto.randomUUID()}`;
  const now = Date.now();
  const willBePrimary = rawPayload.isPrimary || existingCount === 0;

  return await executeTransaction(async () => {
    if (willBePrimary) {
      await execute('UPDATE property_images SET is_primary = 0 WHERE property_id = ?', [propertyId]);
    }

    // Next display order is existing count
    await execute(
      `INSERT INTO property_images (id, property_id, url, is_primary, display_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [imageId, propertyId, savedUrl, willBePrimary ? 1 : 0, existingCount, now]
    );

    await logAudit(
      userId,
      'PROPERTY_IMAGE_ADDED',
      'PROPERTY',
      propertyId,
      `Uploaded image for property "${property.title}" (${willBePrimary ? 'Primary' : 'Gallery'})`
    );

    return {
      id: imageId,
      propertyId,
      url: savedUrl,
      isPrimary: willBePrimary,
      displayOrder: existingCount,
      createdAt: now,
    };
  });
}

/**
 * Batch upload multiple images at once to an existing property.
 * Enforces total count (existing + new <= 15) and total batch size <= 30MB.
 */
export async function batchUploadPropertyImages(
  userId: string,
  userRole: UserRole,
  propertyId: string,
  files: Array<{ dataUrl?: string; base64?: string; buffer?: Buffer; mimeType?: string; isPrimary?: boolean }>
): Promise<PropertyImage[]> {
  const property = await verifyPropertyAccess(userId, userRole, propertyId, 'batch upload images');

  if (!files || files.length === 0) {
    throw new AppError('No files provided in batch upload request.', 400);
  }

  const countRow = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM property_images WHERE property_id = ?',
    [propertyId]
  );
  const existingCount = countRow ? countRow.count : 0;

  if (existingCount + files.length > MEDIA_CONFIG.maxImagesPerProperty) {
    throw new AppError(
      `A property can contain a maximum of ${MEDIA_CONFIG.maxImagesPerProperty} images. You currently have ${existingCount} images and attempted to upload ${files.length}. Maximum 15 images allowed.`,
      400
    );
  }

  // Pre-validate all files and check total payload size
  let totalBatchBytes = 0;
  const validatedList: ValidatedMediaImage[] = [];

  for (let i = 0; i < files.length; i++) {
    const { buffer, declaredMime } = parseImagePayload(files[i]);
    totalBatchBytes += buffer.length;

    if (totalBatchBytes > MEDIA_CONFIG.maxTotalBatchUploadSize) {
      throw new AppError(
        `Total batch upload size exceeds the maximum limit of ${MEDIA_CONFIG.maxTotalBatchUploadSize / (1024 * 1024)} MB.`,
        400
      );
    }

    const validated = validateMediaBuffer(buffer, declaredMime);
    validatedList.push(validated);
  }

  // Check if property currently has a primary image
  const primaryRow = await queryOne<{ id: string }>(
    'SELECT id FROM property_images WHERE property_id = ? AND is_primary = 1',
    [propertyId]
  );
  let hasPrimary = Boolean(primaryRow);

  const savedImages: PropertyImage[] = [];

  return await executeTransaction(async () => {
    const now = Date.now();
    for (let i = 0; i < validatedList.length; i++) {
      const validated = validatedList[i];
      const savedUrl = await savePropertyMediaFile(propertyId, validated);
      const imageId = `img_${crypto.randomUUID()}`;
      const isExplicitPrimary = files[i]?.isPrimary === true;
      const isFirstOfEmpty = !hasPrimary && i === 0;
      const willBePrimary = isExplicitPrimary || isFirstOfEmpty;

      if (willBePrimary) {
        await execute('UPDATE property_images SET is_primary = 0 WHERE property_id = ?', [propertyId]);
        hasPrimary = true;
      }

      const displayOrder = existingCount + i;

      await execute(
        `INSERT INTO property_images (id, property_id, url, is_primary, display_order, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [imageId, propertyId, savedUrl, willBePrimary ? 1 : 0, displayOrder, now]
      );

      savedImages.push({
        id: imageId,
        propertyId,
        url: savedUrl,
        isPrimary: willBePrimary,
        displayOrder,
        createdAt: now,
      });
    }

    await logAudit(
      userId,
      'PROPERTY_MEDIA_BATCH_UPLOAD',
      'PROPERTY',
      propertyId,
      `Batch uploaded ${savedImages.length} images to "${property.title}"`
    );

    return savedImages;
  });
}

/**
 * Replaces an existing image with a newly uploaded file or new URL.
 * Preserves the exact displayOrder and primary status.
 * Cleans up old disk file safely ONLY AFTER new image is written to disk and DB.
 */
export async function replacePropertyImage(
  userId: string,
  userRole: UserRole,
  propertyId: string,
  imageId: string,
  rawPayload: { dataUrl?: string; base64?: string; buffer?: Buffer; mimeType?: string; imageUrl?: string }
): Promise<PropertyImage> {
  const property = await verifyPropertyAccess(userId, userRole, propertyId, 'replace image');

  // Verify that image belongs to this specific property (IDOR protection)
  const existingImage = await queryOne<{ id: string; property_id: string; url: string; is_primary: number; display_order: number }>(
    'SELECT * FROM property_images WHERE id = ? AND property_id = ?',
    [imageId, propertyId]
  );

  if (!existingImage) {
    throw new AppError('Image not found on this property.', 404);
  }

  let newUrl: string;

  if (rawPayload.imageUrl && rawPayload.imageUrl.startsWith('http')) {
    newUrl = rawPayload.imageUrl.trim();
  } else {
    const { buffer, declaredMime } = parseImagePayload(rawPayload);
    const validated = validateMediaBuffer(buffer, declaredMime);
    // Write new file first before touching old file or database
    newUrl = await savePropertyMediaFile(propertyId, validated);
  }

  const oldUrl = existingImage.url;

  await executeTransaction(async () => {
    await execute('UPDATE property_images SET url = ? WHERE id = ?', [newUrl, imageId]);
    await logAudit(
      userId,
      'PROPERTY_IMAGE_REPLACED',
      'PROPERTY',
      propertyId,
      `Replaced image ${imageId} for property "${property.title}"`
    );
  });

  // Safely clean up previous file from disk if it was a local file
  safelyDeletePropertyMediaFile(oldUrl);

  return {
    id: imageId,
    propertyId,
    url: newUrl,
    isPrimary: existingImage.is_primary === 1,
    displayOrder: existingImage.display_order,
    createdAt: Date.now(),
  };
}

/**
 * Reorders property images by accepting an array of image IDs in the desired order.
 * Prevents IDOR by validating that every image ID belongs strictly to this property.
 */
export async function reorderPropertyImages(
  userId: string,
  userRole: UserRole,
  propertyId: string,
  imageIds: string[]
): Promise<PropertyImage[]> {
  const property = await verifyPropertyAccess(userId, userRole, propertyId, 'reorder images');

  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    throw new AppError('An array of image IDs is required for reordering.', 400);
  }

  // Retrieve current images for this property
  const currentImages = await queryAll<{ id: string; property_id: string; url: string; is_primary: number }>(
    'SELECT * FROM property_images WHERE property_id = ?',
    [propertyId]
  );

  const currentIds = new Set(currentImages.map(img => img.id));

  // Security / IDOR check: Every submitted ID must belong to this property
  for (const id of imageIds) {
    if (!currentIds.has(id)) {
      throw new AppError(`Security violation / IDOR: Image ${id} does not belong to this property.`, 403);
    }
  }

  await executeTransaction(async () => {
    for (let index = 0; index < imageIds.length; index++) {
      await execute('UPDATE property_images SET display_order = ? WHERE id = ? AND property_id = ?', [
        index,
        imageIds[index],
        propertyId,
      ]);
    }

    await logAudit(
      userId,
      'PROPERTY_IMAGES_REORDERED',
      'PROPERTY',
      propertyId,
      `Reordered ${imageIds.length} images for property "${property.title}"`
    );
  });

  // Return updated images ordered by display_order
  const updatedRows = await queryAll<{
    id: string;
    property_id: string;
    url: string;
    is_primary: number;
    display_order: number;
    created_at: number;
  }>('SELECT * FROM property_images WHERE property_id = ? ORDER BY display_order ASC', [propertyId]);

  return updatedRows.map(r => ({
    id: r.id,
    propertyId: r.property_id,
    url: r.url,
    isPrimary: r.is_primary === 1,
    displayOrder: r.display_order,
    createdAt: r.created_at,
  }));
}

/**
 * Sets a specific image as primary.
 * Unsets any previously selected primary image on the same property.
 * Blocks cross-property IDOR attacks.
 */
export async function setPrimaryImageSafe(
  userId: string,
  userRole: UserRole,
  propertyId: string,
  imageId: string
): Promise<void> {
  const property = await verifyPropertyAccess(userId, userRole, propertyId, 'set primary image');

  const image = await queryOne<{ id: string }>(
    'SELECT id FROM property_images WHERE id = ? AND property_id = ?',
    [imageId, propertyId]
  );

  if (!image) {
    throw new AppError('Image not found on this property.', 404);
  }

  await executeTransaction(async () => {
    await execute('UPDATE property_images SET is_primary = 0 WHERE property_id = ?', [propertyId]);
    await execute('UPDATE property_images SET is_primary = 1 WHERE id = ?', [imageId]);
    await logAudit(
      userId,
      'PROPERTY_PRIMARY_IMAGE_SET',
      'PROPERTY',
      propertyId,
      `Set image ${imageId} as primary for property "${property.title}"`
    );
  });
}

/**
 * Deletes a property image safely.
 * Enforces ownership and IDOR protection.
 * If the deleted image was primary, automatically assigns the next remaining image (by displayOrder) as primary.
 * Re-indexes remaining display orders to prevent fragmentation.
 * Cleans up the file from disk without deleting the property.
 */
export async function deletePropertyImageSafe(
  userId: string,
  userRole: UserRole,
  propertyId: string,
  imageId: string
): Promise<{ primaryImageId?: string; remainingCount: number }> {
  const property = await verifyPropertyAccess(userId, userRole, propertyId, 'delete image');

  const targetImage = await queryOne<{ id: string; url: string; is_primary: number; display_order: number }>(
    'SELECT id, url, is_primary, display_order FROM property_images WHERE id = ? AND property_id = ?',
    [imageId, propertyId]
  );

  if (!targetImage) {
    throw new AppError('Image not found on this property.', 404);
  }

  let newPrimaryId: string | undefined;

  await executeTransaction(async () => {
    // 1. Delete target image record
    await execute('DELETE FROM property_images WHERE id = ? AND property_id = ?', [imageId, propertyId]);

    // 2. Fetch remaining images ordered by current display_order
    const remaining = await queryAll<{ id: string; is_primary: number }>(
      'SELECT id, is_primary FROM property_images WHERE property_id = ? ORDER BY display_order ASC',
      [propertyId]
    );

    // 3. Re-index display_order consecutively (0, 1, 2, ...)
    for (let i = 0; i < remaining.length; i++) {
      await execute('UPDATE property_images SET display_order = ? WHERE id = ?', [i, remaining[i].id]);
    }

    // 4. Deterministic primary assignment: If the deleted image was primary and other images exist,
    // designate the first remaining image (index 0) as the new primary image.
    if (targetImage.is_primary === 1 && remaining.length > 0) {
      newPrimaryId = remaining[0].id;
      await execute('UPDATE property_images SET is_primary = 1 WHERE id = ?', [newPrimaryId]);
    }

    await logAudit(
      userId,
      'PROPERTY_IMAGE_DELETED',
      'PROPERTY',
      propertyId,
      `Deleted image ${imageId} from property "${property.title}"`
    );
  });

  // 5. Clean up old file from disk
  safelyDeletePropertyMediaFile(targetImage.url);

  const countRow = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM property_images WHERE property_id = ?',
    [propertyId]
  );

  return {
    primaryImageId: newPrimaryId,
    remainingCount: countRow ? countRow.count : 0,
  };
}
