import crypto from 'crypto';
import { execute, queryAll, queryOne } from '../db/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { Property, Wishlist } from '../types/index.js';

export async function getCustomerWishlist(customerId: string): Promise<Wishlist> {
  let wishlist = await queryOne<{ id: string; customer_id: string; name: string; created_at: number; updated_at: number }>(
    'SELECT * FROM wishlists WHERE customer_id = ? ORDER BY created_at ASC LIMIT 1',
    [customerId]
  );

  const now = Date.now();
  if (!wishlist) {
    const id = `wsh_${crypto.randomUUID()}`;
    await execute(
      'INSERT INTO wishlists (id, customer_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [id, customerId, 'My Saved Properties', now, now]
    );
    wishlist = {
      id,
      customer_id: customerId,
      name: 'My Saved Properties',
      created_at: now,
      updated_at: now,
    };
  }

  // Get wishlist items with joined property data (batch query, avoiding N+1)
  const itemRows = await queryAll<{
    item_id: string;
    wishlist_id: string;
    property_id: string;
    item_created_at: number;
    prop_id: string | null;
    owner_id: string | null;
    title: string | null;
    description: string | null;
    property_type: string | null;
    location: string | null;
    price: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    area: number | null;
    status: string | null;
    primary_image: string | null;
  }>(
    `SELECT 
      wi.id as item_id,
      wi.wishlist_id,
      wi.property_id,
      wi.created_at as item_created_at,
      p.id as prop_id,
      p.owner_id,
      p.title,
      p.description,
      p.property_type,
      p.location,
      p.price,
      p.bedrooms,
      p.bathrooms,
      p.area,
      p.status,
      (SELECT url FROM property_images WHERE property_id = p.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) as primary_image
     FROM wishlist_items wi
     LEFT JOIN properties p ON wi.property_id = p.id
     WHERE wi.wishlist_id = ?
     ORDER BY wi.created_at DESC`,
    [wishlist.id]
  );

  const items = itemRows.map(r => ({
    id: r.item_id,
    wishlistId: r.wishlist_id,
    propertyId: r.property_id,
    createdAt: r.item_created_at,
    property: r.prop_id ? {
      id: r.prop_id,
      ownerId: r.owner_id!,
      title: r.title!,
      description: r.description!,
      propertyType: r.property_type as any,
      location: r.location!,
      price: r.price!,
      bedrooms: r.bedrooms!,
      bathrooms: r.bathrooms!,
      area: r.area!,
      amenities: [],
      status: r.status as any,
      primaryImage: r.primary_image || undefined,
      createdAt: 0,
      updatedAt: 0,
    } : undefined
  }));

  return {
    id: wishlist.id,
    customerId: wishlist.customer_id,
    name: wishlist.name,
    items,
    createdAt: wishlist.created_at,
    updatedAt: wishlist.updated_at,
  };
}

export async function toggleWishlistItem(
  customerId: string,
  propertyId: string
): Promise<{ saved: boolean; wishlistId: string }> {
  if (!propertyId) throw new AppError('Property ID is required.', 400);

  // Validate property exists
  const prop = await queryOne('SELECT id FROM properties WHERE id = ?', [propertyId]);
  if (!prop) throw new AppError('Property not found.', 404);

  const wishlist = await getCustomerWishlist(customerId);

  const existingItem = await queryOne<{ id: string }>(
    'SELECT id FROM wishlist_items WHERE wishlist_id = ? AND property_id = ?',
    [wishlist.id, propertyId]
  );

  if (existingItem) {
    // Remove from wishlist
    await execute('DELETE FROM wishlist_items WHERE id = ?', [existingItem.id]);
    return { saved: false, wishlistId: wishlist.id };
  } else {
    // Add to wishlist
    const itemId = `wshi_${crypto.randomUUID()}`;
    await execute(
      'INSERT INTO wishlist_items (id, wishlist_id, property_id, created_at) VALUES (?, ?, ?, ?)',
      [itemId, wishlist.id, propertyId, Date.now()]
    );
    return { saved: true, wishlistId: wishlist.id };
  }
}

export async function getCustomerDashboardSummary(customerId: string): Promise<{
  savedPropertiesCount: number;
  comparisonsCount: number;
  upcomingAppointmentsCount: number;
  openInquiriesCount: number;
  openComplaintsCount: number;
  recentAppointments: any[];
  savedProperties: Property[];
  recentActivities: {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    details: string | null;
    createdAt: number;
  }[];
}> {
  // Batch queries for dashboard performance
  const wishlist = await getCustomerWishlist(customerId);
  const savedPropertiesCount = wishlist.items.length;

  const compCountRow = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM property_comparisons WHERE customer_id = ?`,
    [customerId]
  );
  const comparisonsCount = compCountRow ? compCountRow.count : 0;

  const now = Date.now();
  const aptCountRow = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM appointments 
     WHERE customer_id = ? AND appointment_time >= ? AND status IN ('REQUESTED', 'CONFIRMED', 'RESCHEDULED')`,
    [customerId, now]
  );
  const upcomingAppointmentsCount = aptCountRow ? aptCountRow.count : 0;

  const inqCountRow = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM inquiries WHERE customer_id = ? AND status IN ('NEW', 'IN_PROGRESS')`,
    [customerId]
  );
  const openInquiriesCount = inqCountRow ? inqCountRow.count : 0;

  const cmpCountRow = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM complaints WHERE customer_id = ? AND status IN ('NEW', 'IN_PROGRESS')`,
    [customerId]
  );
  const openComplaintsCount = cmpCountRow ? cmpCountRow.count : 0;

  // Upcoming appointments list (top 3)
  const aptRows = await queryAll<{
    id: string;
    property_id: string;
    property_title: string;
    property_location: string;
    primary_image: string | null;
    agent_name: string;
    appointment_time: number;
    status: string;
  }>(
    `SELECT 
      a.id, a.property_id, p.title as property_title, p.location as property_location,
      (SELECT url FROM property_images WHERE property_id = p.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) as primary_image,
      u.full_name as agent_name, a.appointment_time, a.status
     FROM appointments a
     JOIN properties p ON a.property_id = p.id
     JOIN users u ON a.agent_id = u.id
     WHERE a.customer_id = ? AND a.appointment_time >= ?
     ORDER BY a.appointment_time ASC
     LIMIT 5`,
    [customerId, now]
  );

  const savedProps = wishlist.items.map(i => i.property).filter(Boolean) as Property[];

  const activityRows = await queryAll<{
    id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    details: string | null;
    created_at: number;
  }>(
    `SELECT id, action, entity_type, entity_id, details, created_at
     FROM audit_logs
     WHERE actor_id = ?
     ORDER BY created_at DESC
     LIMIT 8`,
    [customerId]
  );

  return {
    savedPropertiesCount,
    comparisonsCount,
    upcomingAppointmentsCount,
    openInquiriesCount,
    openComplaintsCount,
    recentAppointments: aptRows.map(r => ({
      id: r.id,
      propertyId: r.property_id,
      propertyTitle: r.property_title,
      propertyLocation: r.property_location,
      propertyImage: r.primary_image || undefined,
      agentName: r.agent_name,
      appointmentTime: r.appointment_time,
      status: r.status,
    })),
    savedProperties: savedProps.slice(0, 6),
    recentActivities: activityRows.map(r => ({
      id: r.id,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      details: r.details,
      createdAt: r.created_at,
    })),
  };
}
