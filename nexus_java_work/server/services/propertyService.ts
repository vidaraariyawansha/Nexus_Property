import crypto from 'crypto';
import { execute, executeTransaction, queryAll, queryOne } from '../db/database.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  PaginatedResult,
  Property,
  PropertyImage,
  PropertyStatus,
  PropertyType,
  SearchQuery,
  UserRole
} from '../types/index.js';
import { logAudit } from './auditService.js';
import { createNotification } from './notificationService.js';
import { safelyDeletePropertyMediaFile, MEDIA_CONFIG } from './propertyMediaService.js';

const VALID_PROPERTY_TYPES: PropertyType[] = ['HOUSE', 'APARTMENT', 'CONDO', 'VILLA', 'LAND', 'COMMERCIAL'];
const VALID_STATUSES: PropertyStatus[] = ['DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'UNDER_CONTRACT', 'SOLD', 'RENTED', 'ARCHIVED'];
const VALID_SORT_FIELDS = ['price', 'createdAt', 'bedrooms', 'area', 'location', 'title'];

export async function searchProperties(
  query: SearchQuery,
  currentUserRole?: UserRole,
  currentUserId?: string
): Promise<PaginatedResult<Property>> {
  const page = Math.max(1, Number(query.page) || 1);
  const size = Math.min(50, Math.max(1, Number(query.size) || 12));
  const offset = (page - 1) * size;

  const whereClauses: string[] = ['1=1'];
  const params: (string | number)[] = [];

  // Public Search Visibility Rule:
  // Public non-admin/non-owner searches MUST only show ACTIVE properties.
  // If an owner or admin requests specific status, only permitted within authorized scopes.
  if (!currentUserRole || currentUserRole === 'CUSTOMER') {
    whereClauses.push("p.status = 'ACTIVE'");
  } else if (query.status && query.status !== 'ALL') {
    if (VALID_STATUSES.includes(query.status)) {
      whereClauses.push('p.status = ?');
      params.push(query.status);
    }
  }

  // Keyword search
  if (query.keyword && query.keyword.trim().length > 0) {
    const term = `%${query.keyword.trim().toLowerCase()}%`;
    whereClauses.push('(LOWER(p.title) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(p.location) LIKE ? OR LOWER(p.amenities) LIKE ?)');
    params.push(term, term, term, term);
  }

  // Location search
  if (query.location && query.location.trim().length > 0) {
    const locTerm = `%${query.location.trim().toLowerCase()}%`;
    whereClauses.push('LOWER(p.location) LIKE ?');
    params.push(locTerm);
  }

  // Property Type
  if (query.propertyType && query.propertyType !== 'ALL') {
    if (VALID_PROPERTY_TYPES.includes(query.propertyType)) {
      whereClauses.push('p.property_type = ?');
      params.push(query.propertyType);
    }
  }

  // Price validation & range
  if (query.minPrice !== undefined && query.minPrice !== null && !isNaN(Number(query.minPrice))) {
    const min = Number(query.minPrice);
    if (min < 0) throw new AppError('Minimum price cannot be negative.', 400);
    whereClauses.push('p.price >= ?');
    params.push(min);
  }

  if (query.maxPrice !== undefined && query.maxPrice !== null && !isNaN(Number(query.maxPrice))) {
    const max = Number(query.maxPrice);
    if (max < 0) throw new AppError('Maximum price cannot be negative.', 400);
    whereClauses.push('p.price <= ?');
    params.push(max);
  }

  if (query.minPrice !== undefined && query.maxPrice !== undefined) {
    if (Number(query.minPrice) > Number(query.maxPrice)) {
      throw new AppError('Minimum price cannot exceed maximum price.', 400);
    }
  }

  // Bedrooms filter
  if (query.bedrooms !== undefined && query.bedrooms !== null && !isNaN(Number(query.bedrooms))) {
    const beds = Number(query.bedrooms);
    if (beds < 0) throw new AppError('Bedrooms cannot be negative.', 400);
    whereClauses.push('p.bedrooms >= ?');
    params.push(beds);
  }

  // Amenities filter
  if (query.amenities && Array.isArray(query.amenities) && query.amenities.length > 0) {
    for (const amenity of query.amenities) {
      if (amenity && amenity.trim()) {
        whereClauses.push('LOWER(p.amenities) LIKE ?');
        params.push(`%${amenity.trim().toLowerCase()}%`);
      }
    }
  }

  // Sorting whitelist
  let sortColumn = 'p.created_at';
  if (query.sortBy && VALID_SORT_FIELDS.includes(query.sortBy)) {
    if (query.sortBy === 'createdAt') sortColumn = 'p.created_at';
    else if (query.sortBy === 'price') sortColumn = 'p.price';
    else if (query.sortBy === 'bedrooms') sortColumn = 'p.bedrooms';
    else if (query.sortBy === 'area') sortColumn = 'p.area';
    else if (query.sortBy === 'location') sortColumn = 'p.location';
    else if (query.sortBy === 'title') sortColumn = 'p.title';
  }

  const sortDirection = query.sortOrder === 'ASC' ? 'ASC' : 'DESC';
  const whereSql = whereClauses.join(' AND ');

  // Get total count
  const countRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*) as total FROM properties p WHERE ${whereSql}`,
    params
  );
  const totalElements = countRow ? countRow.total : 0;

  // Query paginated properties with batch primary image and owner info
  const propertyRows = await queryAll<{
    id: string;
    owner_id: string;
    owner_name: string;
    owner_email: string;
    owner_phone: string | null;
    title: string;
    description: string;
    property_type: string;
    location: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    area: number;
    amenities: string;
    status: string;
    created_at: number;
    updated_at: number;
    primary_image: string | null;
    avg_score: number | null;
    rating_count: number | null;
  }>(
    `SELECT 
      p.*,
      u.full_name as owner_name,
      u.email as owner_email,
      u.phone as owner_phone,
      (SELECT url FROM property_images WHERE property_id = p.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) as primary_image,
      (SELECT AVG(score) FROM ratings WHERE property_id = p.id) as avg_score,
      (SELECT COUNT(*) FROM ratings WHERE property_id = p.id) as rating_count
     FROM properties p
     JOIN users u ON p.owner_id = u.id
     WHERE ${whereSql}
     ORDER BY ${sortColumn} ${sortDirection}
     LIMIT ? OFFSET ?`,
    [...params, size, offset]
  );

  const content: Property[] = propertyRows.map(r => ({
    id: r.id,
    ownerId: r.owner_id,
    ownerName: r.owner_name,
    ownerEmail: r.owner_email,
    ownerPhone: r.owner_phone,
    title: r.title,
    description: r.description,
    propertyType: r.property_type as PropertyType,
    location: r.location,
    price: r.price,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    area: r.area,
    amenities: JSON.parse(r.amenities || '[]'),
    status: r.status as PropertyStatus,
    primaryImage: r.primary_image || undefined,
    averageRating: r.avg_score ? Number(r.avg_score.toFixed(1)) : 0,
    ratingCount: r.rating_count || 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  const totalPages = Math.ceil(totalElements / size);

  return {
    content,
    page,
    size,
    totalElements,
    totalPages,
    hasMore: page < totalPages,
  };
}

export async function getPropertyById(id: string, viewerRole?: UserRole, viewerId?: string): Promise<Property> {
  const row = await queryOne<{
    id: string;
    owner_id: string;
    owner_name: string;
    owner_email: string;
    owner_phone: string | null;
    title: string;
    description: string;
    property_type: string;
    location: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    area: number;
    amenities: string;
    status: string;
    created_at: number;
    updated_at: number;
    avg_score: number | null;
    rating_count: number | null;
  }>(
    `SELECT 
      p.*,
      u.full_name as owner_name,
      u.email as owner_email,
      u.phone as owner_phone,
      (SELECT AVG(score) FROM ratings WHERE property_id = p.id) as avg_score,
      (SELECT COUNT(*) FROM ratings WHERE property_id = p.id) as rating_count
     FROM properties p
     JOIN users u ON p.owner_id = u.id
     WHERE p.id = ?`,
    [id]
  );

  if (!row) {
    throw new AppError('Property not found.', 404);
  }

  // Authorization check: non-active properties can only be viewed by owner, agent, or admin
  const isOwner = viewerId && viewerId === row.owner_id;
  const isStaff = viewerRole === 'ADMIN' || viewerRole === 'AGENT';
  if (row.status !== 'ACTIVE' && !isOwner && !isStaff) {
    throw new AppError('This property is not publicly available.', 403);
  }

  // Record recently viewed for authenticated viewers
  if (viewerId) {
    recordRecentlyViewed(viewerId, id).catch(() => {});
  }

  // Fetch all images
  const imageRows = await queryAll<{
    id: string;
    property_id: string;
    url: string;
    is_primary: number;
    display_order: number;
    caption: string | null;
    category: string | null;
    created_at: number;
  }>(
    `SELECT * FROM property_images WHERE property_id = ? ORDER BY is_primary DESC, display_order ASC`,
    [id]
  );

  const images: PropertyImage[] = imageRows.map(img => ({
    id: img.id,
    propertyId: img.property_id,
    url: img.url,
    isPrimary: img.is_primary === 1,
    displayOrder: img.display_order,
    caption: img.caption || undefined,
    category: img.category || undefined,
    createdAt: img.created_at,
  }));

  const primaryImage = images.find(img => img.isPrimary)?.url || images[0]?.url;

  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    ownerEmail: row.owner_email,
    ownerPhone: row.owner_phone,
    title: row.title,
    description: row.description,
    propertyType: row.property_type as PropertyType,
    location: row.location,
    price: row.price,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    area: row.area,
    amenities: JSON.parse(row.amenities || '[]'),
    status: row.status as PropertyStatus,
    primaryImage,
    images,
    averageRating: row.avg_score ? Number(row.avg_score.toFixed(1)) : 0,
    ratingCount: row.rating_count || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createProperty(
  ownerId: string,
  data: {
    title: string;
    description: string;
    propertyType: PropertyType;
    location: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    area: number;
    amenities?: string[];
    submitForApproval?: boolean;
    images?: { url: string; isPrimary?: boolean }[];
  }
): Promise<Property> {
  // Input validations
  if (!data.title || data.title.trim().length < 3 || data.title.trim().length > 150) {
    throw new AppError('Title must be between 3 and 150 characters.', 400);
  }

  if (!data.description || data.description.trim().length < 10) {
    throw new AppError('Description must be at least 10 characters.', 400);
  }

  if (!VALID_PROPERTY_TYPES.includes(data.propertyType)) {
    throw new AppError('Invalid property type.', 400);
  }

  if (!data.location || data.location.trim().length < 3) {
    throw new AppError('Location is required.', 400);
  }

  const price = Number(data.price);
  if (isNaN(price) || price <= 0) {
    throw new AppError('Price must be greater than zero.', 400);
  }

  const bedrooms = Number(data.bedrooms) || 0;
  if (bedrooms < 0) throw new AppError('Bedrooms cannot be negative.', 400);

  const bathrooms = Number(data.bathrooms) || 1;
  if (bathrooms < 0) throw new AppError('Bathrooms cannot be negative.', 400);

  const area = Number(data.area);
  if (isNaN(area) || area <= 0) {
    throw new AppError('Area must be greater than zero.', 400);
  }

  const status: PropertyStatus = data.submitForApproval ? 'PENDING_APPROVAL' : 'DRAFT';
  const propertyId = `prop_${crypto.randomUUID()}`;
  const now = Date.now();
  const amenitiesJson = JSON.stringify(data.amenities || []);

  return await executeTransaction(async () => {
    await execute(
      `INSERT INTO properties (id, owner_id, title, description, property_type, location, price, bedrooms, bathrooms, area, amenities, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [propertyId, ownerId, data.title.trim(), data.description.trim(), data.propertyType, data.location.trim(), price, bedrooms, bathrooms, area, amenitiesJson, status, now, now]
    );

    // Insert images if provided
    if (data.images && data.images.length > 0) {
      if (data.images.length > 15) {
        throw new AppError('A property can contain a maximum of 15 images. Maximum 15 images allowed.', 400);
      }
      let hasPrimary = false;
      for (let i = 0; i < data.images.length; i++) {
        const img = data.images[i];
        if (!img.url || !img.url.trim()) continue;
        const imgId = `img_${crypto.randomUUID()}`;
        const isPrimary = (!hasPrimary && (img.isPrimary || i === 0)) ? 1 : 0;
        if (isPrimary) hasPrimary = true;

        await execute(
          `INSERT INTO property_images (id, property_id, url, is_primary, display_order, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [imgId, propertyId, img.url.trim(), isPrimary, i, now]
        );
      }
    }

    await logAudit(ownerId, 'PROPERTY_CREATED', 'PROPERTY', propertyId, `Created property listing: ${data.title}`);

    // If submitted for approval, notify administrators
    if (status === 'PENDING_APPROVAL') {
      const admins = await queryAll<{ id: string }>('SELECT id FROM users WHERE role = ?', ['ADMIN']);
      for (const admin of admins) {
        await createNotification(
          admin.id,
          'LISTING_APPROVAL_REQUIRED',
          'New Listing Pending Approval',
          `A new listing "${data.title}" was submitted for review.`,
          propertyId
        );
      }
    }

    return getPropertyById(propertyId, 'PROPERTY_OWNER', ownerId);
  });
}

export async function updateProperty(
  userId: string,
  userRole: UserRole,
  propertyId: string,
  data: Partial<{
    title: string;
    description: string;
    propertyType: PropertyType;
    location: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    area: number;
    amenities: string[];
    status: PropertyStatus;
  }>
): Promise<Property> {
  const existing = await queryOne<{ owner_id: string; status: string; title: string }>(
    'SELECT owner_id, status, title FROM properties WHERE id = ?',
    [propertyId]
  );

  if (!existing) {
    throw new AppError('Property not found.', 404);
  }

  // Security: Ownership check
  const isOwner = existing.owner_id === userId;
  const isAdmin = userRole === 'ADMIN';
  const isAgent = userRole === 'AGENT';

  if (!isOwner && !isAdmin) {
    throw new AppError('Access forbidden: You do not have permission to modify this property.', 403);
  }

  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (data.title !== undefined) {
    if (!data.title || data.title.trim().length < 3 || data.title.trim().length > 150) {
      throw new AppError('Title must be between 3 and 150 characters.', 400);
    }
    updates.push('title = ?');
    params.push(data.title.trim());
  }

  if (data.description !== undefined) {
    if (!data.description || data.description.trim().length < 10) {
      throw new AppError('Description must be at least 10 characters.', 400);
    }
    updates.push('description = ?');
    params.push(data.description.trim());
  }

  if (data.propertyType !== undefined) {
    if (!VALID_PROPERTY_TYPES.includes(data.propertyType)) {
      throw new AppError('Invalid property type.', 400);
    }
    updates.push('property_type = ?');
    params.push(data.propertyType);
  }

  if (data.location !== undefined) {
    if (!data.location || data.location.trim().length < 3) {
      throw new AppError('Location is required.', 400);
    }
    updates.push('location = ?');
    params.push(data.location.trim());
  }

  if (data.price !== undefined) {
    const price = Number(data.price);
    if (isNaN(price) || price <= 0) {
      throw new AppError('Price must be greater than zero.', 400);
    }
    updates.push('price = ?');
    params.push(price);
  }

  if (data.bedrooms !== undefined) {
    const beds = Number(data.bedrooms);
    if (beds < 0) throw new AppError('Bedrooms cannot be negative.', 400);
    updates.push('bedrooms = ?');
    params.push(beds);
  }

  if (data.bathrooms !== undefined) {
    const baths = Number(data.bathrooms);
    if (baths < 0) throw new AppError('Bathrooms cannot be negative.', 400);
    updates.push('bathrooms = ?');
    params.push(baths);
  }

  if (data.area !== undefined) {
    const area = Number(data.area);
    if (isNaN(area) || area <= 0) throw new AppError('Area must be greater than zero.', 400);
    updates.push('area = ?');
    params.push(area);
  }

  if (data.amenities !== undefined) {
    updates.push('amenities = ?');
    params.push(JSON.stringify(data.amenities));
  }

  // Status transitions
  if (data.status !== undefined) {
    validateStatusTransition(existing.status as PropertyStatus, data.status, userRole);
    updates.push('status = ?');
    params.push(data.status);
  }

  if (updates.length === 0) {
    return getPropertyById(propertyId, userRole, userId);
  }

  updates.push('updated_at = ?');
  params.push(Date.now());
  params.push(propertyId);

  await execute(`UPDATE properties SET ${updates.join(', ')} WHERE id = ?`, params);
  await logAudit(userId, 'PROPERTY_UPDATED', 'PROPERTY', propertyId, `Updated property: ${data.title || existing.title}`);

  return getPropertyById(propertyId, userRole, userId);
}

function validateStatusTransition(current: PropertyStatus, next: PropertyStatus, role: UserRole): void {
  if (current === next) return;

  // Status transition state machine rules
  if (role === 'PROPERTY_OWNER') {
    // Owner transitions
    if (current === 'DRAFT' && next === 'PENDING_APPROVAL') return;
    if (current === 'ACTIVE' && (next === 'UNDER_CONTRACT' || next === 'ARCHIVED')) return;
    if (current === 'UNDER_CONTRACT' && (next === 'ACTIVE' || next === 'SOLD' || next === 'RENTED')) return;
    throw new AppError(`Invalid status transition from ${current} to ${next} for Property Owner.`, 400);
  }

  if (role === 'AGENT') {
    // Agent transitions
    if (current === 'ACTIVE' && next === 'UNDER_CONTRACT') return;
    if (current === 'UNDER_CONTRACT' && (next === 'ACTIVE' || next === 'SOLD' || next === 'RENTED')) return;
    throw new AppError(`Invalid status transition from ${current} to ${next} for Agent.`, 400);
  }

  if (role === 'ADMIN') {
    // Admin has full authorized workflow control
    return;
  }

  throw new AppError('Not authorized to change property status.', 403);
}

export async function adminApproveProperty(adminId: string, propertyId: string, approved: boolean): Promise<void> {
  const property = await queryOne<{ owner_id: string; title: string; status: string }>(
    'SELECT owner_id, title, status FROM properties WHERE id = ?',
    [propertyId]
  );

  if (!property) throw new AppError('Property not found.', 404);

  const nextStatus: PropertyStatus = approved ? 'ACTIVE' : 'DRAFT';
  await execute('UPDATE properties SET status = ?, updated_at = ? WHERE id = ?', [nextStatus, Date.now(), propertyId]);

  await logAudit(
    adminId,
    approved ? 'PROPERTY_APPROVED' : 'PROPERTY_REJECTED',
    'PROPERTY',
    propertyId,
    `Admin ${approved ? 'approved' : 'rejected'} listing "${property.title}"`
  );

  await createNotification(
    property.owner_id,
    approved ? 'PROPERTY_APPROVED' : 'PROPERTY_REJECTED',
    approved ? 'Listing Approved' : 'Listing Requires Updates',
    approved 
      ? `Your listing "${property.title}" has been approved and is now active on the marketplace!` 
      : `Your listing "${property.title}" was not approved. Please review and update details.`,
    propertyId
  );
}

export async function deleteProperty(userId: string, userRole: UserRole, propertyId: string): Promise<void> {
  const property = await queryOne<{ owner_id: string; title: string }>(
    'SELECT owner_id, title FROM properties WHERE id = ?',
    [propertyId]
  );

  if (!property) throw new AppError('Property not found.', 404);

  const isOwner = property.owner_id === userId;
  const isAdmin = userRole === 'ADMIN';

  if (!isOwner && !isAdmin) {
    throw new AppError('Access forbidden: You do not have permission to delete this property.', 403);
  }

  // Check for dependent active appointments
  const activeApt = await queryOne(
    "SELECT id FROM appointments WHERE property_id = ? AND status IN ('REQUESTED', 'CONFIRMED')",
    [propertyId]
  );
  if (activeApt) {
    throw new AppError('Cannot delete property with active viewing appointments. Please cancel scheduled appointments first.', 400);
  }

  await executeTransaction(async () => {
    // Delete property images and wishlist items
    await execute('DELETE FROM property_images WHERE property_id = ?', [propertyId]);
    await execute('DELETE FROM wishlist_items WHERE property_id = ?', [propertyId]);
    await execute('DELETE FROM ratings WHERE property_id = ?', [propertyId]);
    await execute('DELETE FROM inquiries WHERE property_id = ?', [propertyId]);
    await execute('DELETE FROM appointments WHERE property_id = ?', [propertyId]);
    await execute('DELETE FROM properties WHERE id = ?', [propertyId]);
    await logAudit(userId, 'PROPERTY_DELETED', 'PROPERTY', propertyId, `Deleted property: ${property.title}`);
  });
}

// Media / Image Management Services
export async function addPropertyImage(
  userId: string,
  userRole: UserRole,
  propertyId: string,
  imageUrl: string,
  isPrimary: boolean = false,
  caption?: string,
  category?: string
): Promise<PropertyImage> {
  const property = await queryOne<{ owner_id: string }>('SELECT owner_id FROM properties WHERE id = ?', [propertyId]);
  if (!property) throw new AppError('Property not found.', 404);

  if (property.owner_id !== userId && userRole !== 'ADMIN') {
    throw new AppError('Forbidden: You can only upload images to your own property.', 403);
  }

  const cleanUrl = imageUrl ? imageUrl.trim() : '';
  if (!cleanUrl || (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('/'))) {
    throw new AppError('A valid image URL is required.', 400);
  }

  const imageId = `img_${crypto.randomUUID()}`;
  const now = Date.now();

  return await executeTransaction(async () => {
    // Check if property currently has any images
    const existingCountRow = await queryOne<{ count: number }>(
      'SELECT COUNT(*) as count FROM property_images WHERE property_id = ?',
      [propertyId]
    );
    const existingCount = existingCountRow ? existingCountRow.count : 0;

    if (existingCount >= MEDIA_CONFIG.maxImagesPerProperty) {
      throw new AppError(`A property can contain a maximum of ${MEDIA_CONFIG.maxImagesPerProperty} images. Maximum 15 images allowed.`, 400);
    }

    // Primary flag discipline: If requested primary or if first image, make primary
    const willBePrimary = isPrimary || existingCount === 0;

    if (willBePrimary) {
      await execute('UPDATE property_images SET is_primary = 0 WHERE property_id = ?', [propertyId]);
    }

    await execute(
      `INSERT INTO property_images (id, property_id, url, is_primary, display_order, caption, category, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [imageId, propertyId, cleanUrl, willBePrimary ? 1 : 0, existingCount, caption || null, category || null, now]
    );

    return {
      id: imageId,
      propertyId,
      url: cleanUrl,
      isPrimary: willBePrimary,
      displayOrder: existingCount,
      caption: caption || undefined,
      category: category || undefined,
      createdAt: now,
    };
  });
}

export async function setPrimaryImage(
  userId: string,
  userRole: UserRole,
  propertyId: string,
  imageId: string
): Promise<void> {
  const property = await queryOne<{ owner_id: string }>('SELECT owner_id FROM properties WHERE id = ?', [propertyId]);
  if (!property) throw new AppError('Property not found.', 404);

  if (property.owner_id !== userId && userRole !== 'ADMIN') {
    throw new AppError('Forbidden: Not authorized.', 403);
  }

  const image = await queryOne('SELECT id FROM property_images WHERE id = ? AND property_id = ?', [imageId, propertyId]);
  if (!image) throw new AppError('Image not found.', 404);

  await executeTransaction(async () => {
    await execute('UPDATE property_images SET is_primary = 0 WHERE property_id = ?', [propertyId]);
    await execute('UPDATE property_images SET is_primary = 1 WHERE id = ?', [imageId]);
  });
}

export async function deletePropertyImage(
  userId: string,
  userRole: UserRole,
  propertyId: string,
  imageId: string
): Promise<void> {
  const property = await queryOne<{ owner_id: string }>('SELECT owner_id FROM properties WHERE id = ?', [propertyId]);
  if (!property) throw new AppError('Property not found.', 404);

  if (property.owner_id !== userId && userRole !== 'ADMIN') {
    throw new AppError('Forbidden: Not authorized.', 403);
  }

  const image = await queryOne<{ id: string; url: string; is_primary: number }>(
    'SELECT id, url, is_primary FROM property_images WHERE id = ? AND property_id = ?',
    [imageId, propertyId]
  );
  if (!image) throw new AppError('Image not found.', 404);

  await executeTransaction(async () => {
    await execute('DELETE FROM property_images WHERE id = ?', [imageId]);

    const remaining = await queryAll<{ id: string; is_primary: number }>(
      'SELECT id, is_primary FROM property_images WHERE property_id = ? ORDER BY display_order ASC',
      [propertyId]
    );

    // Re-index display_order
    for (let i = 0; i < remaining.length; i++) {
      await execute('UPDATE property_images SET display_order = ? WHERE id = ?', [i, remaining[i].id]);
    }

    // Deterministic primary behavior: if deleted image was primary, make the first remaining image primary
    if (image.is_primary === 1 && remaining.length > 0) {
      await execute('UPDATE property_images SET is_primary = 1 WHERE id = ?', [remaining[0].id]);
    }
  });

  // Safely clean up local file if stored on server
  safelyDeletePropertyMediaFile(image.url);
}

// Re-export media operations from propertyMediaService for controller access
export {
  uploadTempPropertyMedia,
  uploadAndAddPropertyImage,
  batchUploadPropertyImages,
  replacePropertyImage,
  reorderPropertyImages,
  setPrimaryImageSafe,
  deletePropertyImageSafe,
  MEDIA_CONFIG,
} from './propertyMediaService.js';

export async function getOwnerProperties(ownerId: string): Promise<Property[]> {
  const rows = await queryAll<{
    id: string;
    owner_id: string;
    title: string;
    description: string;
    property_type: string;
    location: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    area: number;
    amenities: string;
    status: string;
    created_at: number;
    updated_at: number;
    primary_image: string | null;
  }>(
    `SELECT 
      p.*,
      (SELECT url FROM property_images WHERE property_id = p.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) as primary_image
     FROM properties p
     WHERE p.owner_id = ?
     ORDER BY p.created_at DESC`,
    [ownerId]
  );

  return rows.map(r => ({
    id: r.id,
    ownerId: r.owner_id,
    title: r.title,
    description: r.description,
    propertyType: r.property_type as PropertyType,
    location: r.location,
    price: r.price,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    area: r.area,
    amenities: JSON.parse(r.amenities || '[]'),
    status: r.status as PropertyStatus,
    primaryImage: r.primary_image || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function recordRecentlyViewed(userId: string, propertyId: string): Promise<void> {
  if (!userId || !propertyId) return;
  const now = Date.now();
  const id = `rv_${crypto.randomUUID()}`;
  try {
    await execute(
      `INSERT INTO recently_viewed_properties (id, user_id, property_id, viewed_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, property_id) DO UPDATE SET viewed_at = excluded.viewed_at`,
      [id, userId, propertyId, now]
    );
  } catch (err) {
    // Non-critical, ignore
  }
}

export async function getRecentlyViewedProperties(userId: string, limit: number = 8): Promise<Property[]> {
  const rows = await queryAll<{
    id: string;
    owner_id: string;
    title: string;
    description: string;
    property_type: string;
    location: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    area: number;
    amenities: string;
    status: string;
    created_at: number;
    updated_at: number;
    primary_image: string | null;
  }>(
    `SELECT 
      p.*,
      (SELECT url FROM property_images WHERE property_id = p.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) as primary_image
     FROM recently_viewed_properties rv
     JOIN properties p ON rv.property_id = p.id
     WHERE rv.user_id = ? AND p.status = 'ACTIVE'
     ORDER BY rv.viewed_at DESC
     LIMIT ?`,
    [userId, limit]
  );

  return rows.map(r => ({
    id: r.id,
    ownerId: r.owner_id,
    title: r.title,
    description: r.description,
    propertyType: r.property_type as PropertyType,
    location: r.location,
    price: r.price,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    area: r.area,
    amenities: JSON.parse(r.amenities || '[]'),
    status: r.status as PropertyStatus,
    primaryImage: r.primary_image || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

