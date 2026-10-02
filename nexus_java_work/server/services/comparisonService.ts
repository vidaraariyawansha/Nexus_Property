import crypto from 'crypto';
import { execute, queryAll, queryOne } from '../db/database.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  ComparisonHighlights,
  ComparisonItem,
  ComparisonResponse,
  Property,
  PropertyComparison,
} from '../types/index.js';
import { logAudit } from './auditService.js';

export const MAX_COMPARISON_PROPERTIES = 4;

/**
 * Validates a comparison list name.
 * Rule: Required, 2 to 100 characters, no whitespace-only.
 */
export function validateComparisonName(name: string): string {
  if (!name || typeof name !== 'string') {
    throw new AppError('Comparison name is required.', 400);
  }
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 100) {
    throw new AppError('Comparison name must be between 2 and 100 characters.', 400);
  }
  return trimmed;
}

/**
 * Validates property existence and accessibility.
 */
export async function validatePropertyExists(propertyId: string): Promise<Property> {
  if (!propertyId || typeof propertyId !== 'string' || propertyId.trim().length === 0) {
    throw new AppError('Valid property ID is required.', 400);
  }

  const prop = await queryOne<{
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
  }>('SELECT * FROM properties WHERE id = ?', [propertyId.trim()]);

  if (!prop) {
    throw new AppError('Property not found.', 404);
  }

  const imageRows = await queryAll<{ url: string; is_primary: number; display_order: number }>(
    'SELECT url, is_primary, display_order FROM property_images WHERE property_id = ? ORDER BY is_primary DESC, display_order ASC',
    [prop.id]
  );

  let amenitiesList: string[] = [];
  try {
    amenitiesList = JSON.parse(prop.amenities);
  } catch {
    amenitiesList = [];
  }

  return {
    id: prop.id,
    ownerId: prop.owner_id,
    title: prop.title,
    description: prop.description,
    propertyType: prop.property_type as any,
    location: prop.location,
    price: prop.price,
    bedrooms: prop.bedrooms,
    bathrooms: prop.bathrooms,
    area: prop.area,
    amenities: amenitiesList,
    status: prop.status as any,
    primaryImage: imageRows[0]?.url,
    images: imageRows.map(img => ({
      id: crypto.randomUUID(),
      propertyId: prop.id,
      url: img.url,
      isPrimary: img.is_primary === 1,
      displayOrder: img.display_order,
      createdAt: prop.created_at,
    })),
    createdAt: prop.created_at,
    updatedAt: prop.updated_at,
  };
}

/**
 * Ensures the comparison exists and verifies customer ownership (IDOR prevention).
 */
export async function verifyComparisonOwnership(
  customerId: string,
  comparisonId: string
): Promise<{ id: string; customer_id: string; name: string; created_at: number; updated_at: number }> {
  if (!comparisonId || typeof comparisonId !== 'string') {
    throw new AppError('Comparison ID is required.', 400);
  }

  const comparison = await queryOne<{
    id: string;
    customer_id: string;
    name: string;
    created_at: number;
    updated_at: number;
  }>('SELECT * FROM property_comparisons WHERE id = ?', [comparisonId]);

  if (!comparison) {
    throw new AppError('Comparison not found.', 404);
  }

  if (comparison.customer_id !== customerId) {
    throw new AppError('You are not authorized to access this comparison.', 403);
  }

  return comparison;
}

/**
 * Calculates factual comparison highlights across properties (Lowest Price, Largest Area, Most Bedrooms).
 */
export function calculateHighlights(properties: Property[]): ComparisonHighlights {
  if (!properties || properties.length === 0) {
    return {};
  }

  let lowestPriceId: string | undefined = properties[0].id;
  let lowestPrice = properties[0].price;

  let largestAreaId: string | undefined = properties[0].id;
  let largestArea = properties[0].area;

  let mostBedroomsId: string | undefined = properties[0].id;
  let mostBedrooms = properties[0].bedrooms;

  for (const p of properties) {
    if (p.price < lowestPrice) {
      lowestPrice = p.price;
      lowestPriceId = p.id;
    }
    if (p.area > largestArea) {
      largestArea = p.area;
      largestAreaId = p.id;
    }
    if (p.bedrooms > mostBedrooms) {
      mostBedrooms = p.bedrooms;
      mostBedroomsId = p.id;
    }
  }

  return {
    lowestPricePropertyId: lowestPriceId,
    largestAreaPropertyId: largestAreaId,
    mostBedroomsPropertyId: mostBedroomsId,
  };
}

/**
 * Creates a new property comparison list for authenticated customer.
 */
export async function createComparison(customerId: string, rawName: string): Promise<PropertyComparison> {
  const name = validateComparisonName(rawName);
  const id = `cmp_${crypto.randomUUID()}`;
  const now = Date.now();

  await execute(
    'INSERT INTO property_comparisons (id, customer_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [id, customerId, name, now, now]
  );

  await logAudit(customerId, 'COMPARISON_CREATED', 'PROPERTY_COMPARISON', id, `Created comparison list "${name}"`);

  return {
    id,
    customerId,
    name,
    createdAt: now,
    updatedAt: now,
    itemCount: 0,
    items: [],
  };
}

/**
 * Retrieves all comparison lists for the authenticated customer.
 */
export async function getCustomerComparisons(customerId: string): Promise<PropertyComparison[]> {
  const rows = await queryAll<{
    id: string;
    customer_id: string;
    name: string;
    created_at: number;
    updated_at: number;
    item_count: number;
  }>(
    `SELECT 
      pc.id,
      pc.customer_id,
      pc.name,
      pc.created_at,
      pc.updated_at,
      COUNT(ci.id) as item_count
     FROM property_comparisons pc
     LEFT JOIN comparison_items ci ON pc.id = ci.comparison_id
     WHERE pc.customer_id = ?
     GROUP BY pc.id
     ORDER BY pc.updated_at DESC`,
    [customerId]
  );

  return rows.map(r => ({
    id: r.id,
    customerId: r.customer_id,
    name: r.name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    itemCount: Number(r.item_count || 0),
  }));
}

/**
 * Retrieves a single comparison list with full properties side-by-side and factual highlights.
 */
export async function getComparison(customerId: string, comparisonId: string): Promise<ComparisonResponse> {
  const comparison = await verifyComparisonOwnership(customerId, comparisonId);

  // Retrieve comparison items with positions
  const itemRows = await queryAll<{
    id: string;
    comparison_id: string;
    property_id: string;
    position: number;
    created_at: number;
  }>(
    'SELECT * FROM comparison_items WHERE comparison_id = ? ORDER BY position ASC, created_at ASC',
    [comparison.id]
  );

  const properties: Property[] = [];
  const items: ComparisonItem[] = [];

  for (const item of itemRows) {
    try {
      const prop = await validatePropertyExists(item.property_id);
      properties.push(prop);
      items.push({
        id: item.id,
        comparisonId: item.comparison_id,
        propertyId: item.property_id,
        position: item.position,
        createdAt: item.created_at,
        property: prop,
      });
    } catch {
      // If property was hard-deleted from database, do not break the comparison UI
      // Handled gracefully as unavailable placeholder
    }
  }

  const highlights = calculateHighlights(properties);

  return {
    comparison: {
      id: comparison.id,
      customerId: comparison.customer_id,
      name: comparison.name,
      createdAt: comparison.created_at,
      updatedAt: comparison.updated_at,
      itemCount: items.length,
      items,
    },
    properties,
    highlights,
  };
}

/**
 * Renames an existing comparison list.
 */
export async function updateComparison(
  customerId: string,
  comparisonId: string,
  rawName: string
): Promise<PropertyComparison> {
  const name = validateComparisonName(rawName);
  const comparison = await verifyComparisonOwnership(customerId, comparisonId);

  const now = Date.now();
  await execute('UPDATE property_comparisons SET name = ?, updated_at = ? WHERE id = ?', [name, now, comparison.id]);

  await logAudit(customerId, 'COMPARISON_RENAMED', 'PROPERTY_COMPARISON', comparison.id, `Renamed comparison list to "${name}"`);

  const countRow = await queryOne<{ count: number }>(
    'SELECT COUNT(*) as count FROM comparison_items WHERE comparison_id = ?',
    [comparison.id]
  );

  return {
    id: comparison.id,
    customerId,
    name,
    createdAt: comparison.created_at,
    updatedAt: now,
    itemCount: countRow?.count || 0,
  };
}

/**
 * Deletes a comparison list (cascades to comparison items, never deletes properties).
 */
export async function deleteComparison(
  customerId: string,
  comparisonId: string
): Promise<{ success: boolean; id: string }> {
  const comparison = await verifyComparisonOwnership(customerId, comparisonId);

  await execute('DELETE FROM comparison_items WHERE comparison_id = ?', [comparison.id]);
  await execute('DELETE FROM property_comparisons WHERE id = ?', [comparison.id]);

  await logAudit(customerId, 'COMPARISON_DELETED', 'PROPERTY_COMPARISON', comparison.id, `Deleted comparison list "${comparison.name}"`);

  return {
    success: true,
    id: comparison.id,
  };
}

/**
 * Adds a property to a comparison list.
 * Enforces:
 * - Customer ownership
 * - Property existence
 * - Duplicate prevention (unique per comparison)
 * - Maximum 4 properties limit
 */
export async function addPropertyToComparison(
  customerId: string,
  comparisonId: string,
  propertyId: string
): Promise<ComparisonResponse> {
  const comparison = await verifyComparisonOwnership(customerId, comparisonId);
  const property = await validatePropertyExists(propertyId);

  // Check current item count
  const existingItems = await queryAll<{ id: string; property_id: string }>(
    'SELECT id, property_id FROM comparison_items WHERE comparison_id = ?',
    [comparison.id]
  );

  // Duplicate prevention check
  const alreadyIn = existingItems.some(i => i.property_id === property.id);
  if (alreadyIn) {
    throw new AppError('This property is already in the comparison.', 400);
  }

  // Maximum 4 properties check
  if (existingItems.length >= MAX_COMPARISON_PROPERTIES) {
    throw new AppError(`A comparison can contain a maximum of ${MAX_COMPARISON_PROPERTIES} properties.`, 400);
  }

  const itemId = `cmi_${crypto.randomUUID()}`;
  const now = Date.now();
  const nextPosition = existingItems.length;

  try {
    await execute(
      'INSERT INTO comparison_items (id, comparison_id, property_id, position, created_at) VALUES (?, ?, ?, ?, ?)',
      [itemId, comparison.id, property.id, nextPosition, now]
    );
  } catch (err: any) {
    if (err?.message?.includes('UNIQUE') || err?.message?.includes('uq_comparison_property')) {
      throw new AppError('This property is already in the comparison.', 400);
    }
    throw err;
  }

  // Update comparison updated_at
  await execute('UPDATE property_comparisons SET updated_at = ? WHERE id = ?', [now, comparison.id]);

  await logAudit(
    customerId,
    'COMPARISON_PROPERTY_ADDED',
    'PROPERTY_COMPARISON',
    comparison.id,
    `Added property "${property.title}" (${property.id}) to comparison`
  );

  return getComparison(customerId, comparison.id);
}

/**
 * Removes a property from a comparison list.
 */
export async function removePropertyFromComparison(
  customerId: string,
  comparisonId: string,
  propertyId: string
): Promise<ComparisonResponse> {
  const comparison = await verifyComparisonOwnership(customerId, comparisonId);

  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM comparison_items WHERE comparison_id = ? AND property_id = ?',
    [comparison.id, propertyId]
  );

  if (!existing) {
    throw new AppError('Property is not in this comparison.', 404);
  }

  await execute('DELETE FROM comparison_items WHERE comparison_id = ? AND property_id = ?', [
    comparison.id,
    propertyId,
  ]);

  const now = Date.now();
  await execute('UPDATE property_comparisons SET updated_at = ? WHERE id = ?', [now, comparison.id]);

  await logAudit(
    customerId,
    'COMPARISON_PROPERTY_REMOVED',
    'PROPERTY_COMPARISON',
    comparison.id,
    `Removed property ${propertyId} from comparison`
  );

  return getComparison(customerId, comparison.id);
}

/**
 * Quick Add helper:
 * Allows 1-click adding to the customer's active/latest comparison list,
 * or auto-creates "My Comparisons" if none exists yet.
 */
export async function quickAddToComparison(
  customerId: string,
  propertyId: string,
  comparisonId?: string
): Promise<{ comparison: PropertyComparison; added: boolean; message: string }> {
  await validatePropertyExists(propertyId);

  let targetComp: PropertyComparison | null = null;

  if (comparisonId) {
    const found = await verifyComparisonOwnership(customerId, comparisonId);
    targetComp = {
      id: found.id,
      customerId: found.customer_id,
      name: found.name,
      createdAt: found.created_at,
      updatedAt: found.updated_at,
    };
  } else {
    // Find customer's most recent comparison list
    const comps = await getCustomerComparisons(customerId);
    if (comps.length > 0) {
      targetComp = comps[0];
    } else {
      // Auto-create initial list
      targetComp = await createComparison(customerId, 'My Comparison');
    }
  }

  // Check if already in target comparison
  const exists = await queryOne<{ id: string }>(
    'SELECT id FROM comparison_items WHERE comparison_id = ? AND property_id = ?',
    [targetComp.id, propertyId]
  );

  if (exists) {
    return {
      comparison: targetComp,
      added: false,
      message: 'Property is already in this comparison.',
    };
  }

  await addPropertyToComparison(customerId, targetComp.id, propertyId);

  return {
    comparison: targetComp,
    added: true,
    message: `Property added to "${targetComp.name}".`,
  };
}

/**
 * Returns an array of property IDs currently in any comparison list of the customer.
 * Used by PropertyCard and PropertyDetailPage to highlight [✓ In Compare].
 */
export async function getCustomerComparisonPropertyIds(customerId: string): Promise<string[]> {
  const rows = await queryAll<{ property_id: string }>(
    `SELECT DISTINCT ci.property_id 
     FROM comparison_items ci
     JOIN property_comparisons pc ON ci.comparison_id = pc.id
     WHERE pc.customer_id = ?`,
    [customerId]
  );

  return rows.map(r => r.property_id);
}
