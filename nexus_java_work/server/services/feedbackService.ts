import crypto from 'crypto';
import { execute, executeTransaction, queryAll, queryOne } from '../db/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { Complaint, Inquiry, Rating, TicketStatus, UserRole } from '../types/index.js';
import { logAudit } from './auditService.js';
import { createNotification } from './notificationService.js';

// --- RATINGS ---
export async function submitRating(
  customerId: string,
  data: {
    propertyId: string;
    score: number;
    comment?: string;
  }
): Promise<Rating> {
  const { propertyId, score, comment } = data;

  if (!propertyId) throw new AppError('Property ID is required.', 400);

  const numScore = Math.floor(Number(score));
  if (isNaN(numScore) || numScore < 1 || numScore > 5) {
    throw new AppError('Rating score must be an integer between 1 and 5.', 400);
  }

  // Validate property exists
  const property = await queryOne<{ id: string; owner_id: string; title: string }>(
    'SELECT id, owner_id, title FROM properties WHERE id = ?',
    [propertyId]
  );
  if (!property) throw new AppError('Property not found.', 404);

  // Check if existing rating
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM ratings WHERE property_id = ? AND customer_id = ?',
    [propertyId, customerId]
  );

  const now = Date.now();

  if (existing) {
    // Update existing rating
    await execute(
      `UPDATE ratings SET score = ?, comment = ?, updated_at = ? WHERE id = ?`,
      [numScore, comment ? comment.trim() : null, now, existing.id]
    );

    return {
      id: existing.id,
      propertyId,
      customerId,
      score: numScore,
      comment: comment ? comment.trim() : null,
      createdAt: now,
      updatedAt: now,
    };
  }

  const ratingId = `rtg_${crypto.randomUUID()}`;
  await execute(
    `INSERT INTO ratings (id, property_id, customer_id, score, comment, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [ratingId, propertyId, customerId, numScore, comment ? comment.trim() : null, now, now]
  );

  return {
    id: ratingId,
    propertyId,
    customerId,
    score: numScore,
    comment: comment ? comment.trim() : null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getPropertyRatings(propertyId: string): Promise<Rating[]> {
  const rows = await queryAll<{
    id: string;
    property_id: string;
    customer_id: string;
    customer_name: string;
    score: number;
    comment: string | null;
    created_at: number;
    updated_at: number;
  }>(
    `SELECT r.*, u.full_name as customer_name
     FROM ratings r
     JOIN users u ON r.customer_id = u.id
     WHERE r.property_id = ?
     ORDER BY r.created_at DESC`,
    [propertyId]
  );

  return rows.map(r => ({
    id: r.id,
    propertyId: r.property_id,
    customerId: r.customer_id,
    customerName: r.customer_name,
    score: r.score,
    comment: r.comment,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getCustomerRatings(customerId: string): Promise<Rating[]> {
  const rows = await queryAll<{
    id: string;
    property_id: string;
    customer_id: string;
    score: number;
    comment: string | null;
    created_at: number;
    updated_at: number;
  }>(
    `SELECT * FROM ratings WHERE customer_id = ? ORDER BY created_at DESC`,
    [customerId]
  );

  return rows.map(r => ({
    id: r.id,
    propertyId: r.property_id,
    customerId: r.customer_id,
    score: r.score,
    comment: r.comment,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function deleteRating(customerId: string, userRole: UserRole, ratingId: string): Promise<void> {
  const rating = await queryOne<{ customer_id: string }>('SELECT customer_id FROM ratings WHERE id = ?', [ratingId]);
  if (!rating) throw new AppError('Rating not found.', 404);

  if (rating.customer_id !== customerId && userRole !== 'ADMIN') {
    throw new AppError('Access forbidden: You cannot delete this rating.', 403);
  }

  await execute('DELETE FROM ratings WHERE id = ?', [ratingId]);
}

// --- INQUIRIES ---
export async function createInquiry(
  customerId: string,
  data: {
    propertyId: string;
    subject: string;
    message: string;
    assignedAgentId?: string;
  }
): Promise<Inquiry> {
  const { propertyId, subject, message, assignedAgentId } = data;

  if (!propertyId) throw new AppError('Property is required.', 400);

  if (!subject || subject.trim().length < 3 || subject.trim().length > 150) {
    throw new AppError('Subject must be between 3 and 150 characters.', 400);
  }

  if (!message || message.trim().length < 5) {
    throw new AppError('Message must be at least 5 characters.', 400);
  }

  const property = await queryOne<{ id: string; title: string }>('SELECT id, title FROM properties WHERE id = ?', [propertyId]);
  if (!property) throw new AppError('Property not found.', 404);

  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const ticketId = `INQ-${randomNum}`;
  const id = `inq_${crypto.randomUUID()}`;
  const now = Date.now();

  await execute(
    `INSERT INTO inquiries (id, ticket_id, property_id, customer_id, assigned_agent_id, subject, message, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?)`,
    [id, ticketId, propertyId, customerId, assignedAgentId || null, subject.trim(), message.trim(), now, now]
  );

  // Notify assigned agent or all agents
  if (assignedAgentId) {
    await createNotification(
      assignedAgentId,
      'INQUIRY_RECEIVED',
      `New Inquiry [${ticketId}]`,
      `Inquiry received for "${property.title}": ${subject.trim()}`,
      id
    );
  } else {
    const agents = await queryAll<{ id: string }>('SELECT id FROM users WHERE role = ? AND enabled = 1', ['AGENT']);
    for (const ag of agents) {
      await createNotification(
        ag.id,
        'INQUIRY_RECEIVED',
        `New Inquiry [${ticketId}]`,
        `New inquiry for "${property.title}": ${subject.trim()}`,
        id
      );
    }
  }

  await logAudit(customerId, 'INQUIRY_CREATED', 'INQUIRY', id, `Submitted inquiry ${ticketId}`);

  return getInquiryById(id, 'CUSTOMER', customerId);
}

export async function getInquiryById(
  id: string,
  userRole: UserRole,
  userId: string
): Promise<Inquiry> {
  const row = await queryOne<{
    id: string;
    ticket_id: string;
    property_id: string;
    property_title: string;
    customer_id: string;
    customer_name: string;
    customer_email: string;
    assigned_agent_id: string | null;
    assigned_agent_name: string | null;
    subject: string;
    message: string;
    status: string;
    response: string | null;
    created_at: number;
    updated_at: number;
  }>(
    `SELECT 
      i.*,
      p.title as property_title,
      c.full_name as customer_name,
      c.email as customer_email,
      a.full_name as assigned_agent_name
     FROM inquiries i
     JOIN properties p ON i.property_id = p.id
     JOIN users c ON i.customer_id = c.id
     LEFT JOIN users a ON i.assigned_agent_id = a.id
     WHERE i.id = ?`,
    [id]
  );

  if (!row) throw new AppError('Inquiry not found.', 404);

  const isCustomer = row.customer_id === userId;
  const isAgent = userRole === 'AGENT';
  const isAdmin = userRole === 'ADMIN';

  if (!isCustomer && !isAgent && !isAdmin) {
    throw new AppError('Access forbidden: You cannot view this inquiry.', 403);
  }

  return {
    id: row.id,
    ticketId: row.ticket_id,
    propertyId: row.property_id,
    propertyTitle: row.property_title,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    assignedAgentId: row.assigned_agent_id,
    assignedAgentName: row.assigned_agent_name,
    subject: row.subject,
    message: row.message,
    status: row.status as TicketStatus,
    response: row.response,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listInquiries(
  userId: string,
  userRole: UserRole,
  statusFilter?: string
): Promise<Inquiry[]> {
  let whereSql = '';
  const params: (string | number)[] = [];

  if (userRole === 'CUSTOMER') {
    whereSql = 'i.customer_id = ?';
    params.push(userId);
  } else if (userRole === 'AGENT') {
    whereSql = '(i.assigned_agent_id = ? OR i.assigned_agent_id IS NULL)';
    params.push(userId);
  } else {
    // Admin
    whereSql = '1=1';
  }

  if (statusFilter && statusFilter !== 'ALL') {
    whereSql += ' AND i.status = ?';
    params.push(statusFilter);
  }

  const rows = await queryAll<{
    id: string;
    ticket_id: string;
    property_id: string;
    property_title: string;
    customer_id: string;
    customer_name: string;
    customer_email: string;
    assigned_agent_id: string | null;
    assigned_agent_name: string | null;
    subject: string;
    message: string;
    status: string;
    response: string | null;
    created_at: number;
    updated_at: number;
  }>(
    `SELECT 
      i.*,
      p.title as property_title,
      c.full_name as customer_name,
      c.email as customer_email,
      a.full_name as assigned_agent_name
     FROM inquiries i
     JOIN properties p ON i.property_id = p.id
     JOIN users c ON i.customer_id = c.id
     LEFT JOIN users a ON i.assigned_agent_id = a.id
     WHERE ${whereSql}
     ORDER BY i.created_at DESC`,
    params
  );

  return rows.map(r => ({
    id: r.id,
    ticketId: r.ticket_id,
    propertyId: r.property_id,
    propertyTitle: r.property_title,
    customerId: r.customer_id,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    assignedAgentId: r.assigned_agent_id,
    assignedAgentName: r.assigned_agent_name,
    subject: r.subject,
    message: r.message,
    status: r.status as TicketStatus,
    response: r.response,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function respondToInquiry(
  userId: string,
  userRole: UserRole,
  inquiryId: string,
  data: { response: string; status?: TicketStatus }
): Promise<Inquiry> {
  if (userRole !== 'AGENT' && userRole !== 'ADMIN') {
    throw new AppError('Only agents or administrators can respond to inquiries.', 403);
  }

  const inquiry = await queryOne<{ customer_id: string; ticket_id: string; subject: string }>(
    'SELECT customer_id, ticket_id, subject FROM inquiries WHERE id = ?',
    [inquiryId]
  );
  if (!inquiry) throw new AppError('Inquiry not found.', 404);

  if (!data.response || data.response.trim().length < 2) {
    throw new AppError('Response message is required.', 400);
  }

  const status: TicketStatus = data.status || 'RESOLVED';
  const now = Date.now();

  await execute(
    `UPDATE inquiries SET response = ?, status = ?, assigned_agent_id = COALESCE(assigned_agent_id, ?), updated_at = ? WHERE id = ?`,
    [data.response.trim(), status, userId, now, inquiryId]
  );

  await logAudit(userId, 'INQUIRY_RESPONDED', 'INQUIRY', inquiryId, `Replied to inquiry ${inquiry.ticket_id}`);

  await createNotification(
    inquiry.customer_id,
    'INQUIRY_REPLIED',
    `Response Received: [${inquiry.ticket_id}]`,
    `An agent responded to your inquiry "${inquiry.subject}".`,
    inquiryId
  );

  return getInquiryById(inquiryId, userRole, userId);
}

// --- COMPLAINTS ---
export async function createComplaint(
  customerId: string,
  data: {
    propertyId?: string;
    subject: string;
    description: string;
  }
): Promise<Complaint> {
  const { propertyId, subject, description } = data;

  if (!subject || subject.trim().length < 5 || subject.trim().length > 150) {
    throw new AppError('Subject must be between 5 and 150 characters.', 400);
  }

  if (!description || description.trim().length < 10) {
    throw new AppError('Description must be at least 10 characters.', 400);
  }

  const randomNum = Math.floor(2000 + Math.random() * 8000);
  const ticketId = `CMP-${randomNum}`;
  const id = `cmp_${crypto.randomUUID()}`;
  const now = Date.now();

  await execute(
    `INSERT INTO complaints (id, ticket_id, property_id, customer_id, subject, description, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'NEW', ?, ?)`,
    [id, ticketId, propertyId || null, customerId, subject.trim(), description.trim(), now, now]
  );

  // Notify admins of new complaint
  const admins = await queryAll<{ id: string }>('SELECT id FROM users WHERE role = ?', ['ADMIN']);
  for (const adm of admins) {
    await createNotification(
      adm.id,
      'COMPLAINT_FILED',
      `New Customer Complaint [${ticketId}]`,
      `Subject: ${subject.trim()}`,
      id
    );
  }

  await logAudit(customerId, 'COMPLAINT_SUBMITTED', 'COMPLAINT', id, `Filed complaint ${ticketId}`);

  return getComplaintById(id, 'CUSTOMER', customerId);
}

export async function getComplaintById(
  id: string,
  userRole: UserRole,
  userId: string
): Promise<Complaint> {
  const row = await queryOne<{
    id: string;
    ticket_id: string;
    property_id: string | null;
    property_title: string | null;
    customer_id: string;
    customer_name: string;
    customer_email: string;
    subject: string;
    description: string;
    status: string;
    resolution: string | null;
    created_at: number;
    updated_at: number;
  }>(
    `SELECT 
      c.*,
      p.title as property_title,
      u.full_name as customer_name,
      u.email as customer_email
     FROM complaints c
     LEFT JOIN properties p ON c.property_id = p.id
     JOIN users u ON c.customer_id = u.id
     WHERE c.id = ?`,
    [id]
  );

  if (!row) throw new AppError('Complaint not found.', 404);

  const isCustomer = row.customer_id === userId;
  const isStaff = userRole === 'ADMIN' || userRole === 'AGENT';

  if (!isCustomer && !isStaff) {
    throw new AppError('Access forbidden: You cannot view this complaint.', 403);
  }

  return {
    id: row.id,
    ticketId: row.ticket_id,
    propertyId: row.property_id,
    propertyTitle: row.property_title,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    subject: row.subject,
    description: row.description,
    status: row.status as TicketStatus,
    resolution: row.resolution,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listComplaints(
  userId: string,
  userRole: UserRole,
  statusFilter?: string
): Promise<Complaint[]> {
  let whereSql = '';
  const params: (string | number)[] = [];

  if (userRole === 'CUSTOMER') {
    whereSql = 'c.customer_id = ?';
    params.push(userId);
  } else {
    // Staff (Admin/Agent)
    whereSql = '1=1';
  }

  if (statusFilter && statusFilter !== 'ALL') {
    whereSql += ' AND c.status = ?';
    params.push(statusFilter);
  }

  const rows = await queryAll<{
    id: string;
    ticket_id: string;
    property_id: string | null;
    property_title: string | null;
    customer_id: string;
    customer_name: string;
    customer_email: string;
    subject: string;
    description: string;
    status: string;
    resolution: string | null;
    created_at: number;
    updated_at: number;
  }>(
    `SELECT 
      c.*,
      p.title as property_title,
      u.full_name as customer_name,
      u.email as customer_email
     FROM complaints c
     LEFT JOIN properties p ON c.property_id = p.id
     JOIN users u ON c.customer_id = u.id
     WHERE ${whereSql}
     ORDER BY c.created_at DESC`,
    params
  );

  return rows.map(r => ({
    id: r.id,
    ticketId: r.ticket_id,
    propertyId: r.property_id,
    propertyTitle: r.property_title,
    customerId: r.customer_id,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    subject: r.subject,
    description: r.description,
    status: r.status as TicketStatus,
    resolution: r.resolution,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function updateComplaintStatus(
  userId: string,
  userRole: UserRole,
  complaintId: string,
  data: { status: TicketStatus; resolution?: string }
): Promise<Complaint> {
  if (userRole !== 'ADMIN' && userRole !== 'AGENT') {
    throw new AppError('Only administrators or authorized agents can resolve complaints.', 403);
  }

  const complaint = await queryOne<{ customer_id: string; ticket_id: string; subject: string }>(
    'SELECT customer_id, ticket_id, subject FROM complaints WHERE id = ?',
    [complaintId]
  );
  if (!complaint) throw new AppError('Complaint not found.', 404);

  const now = Date.now();
  await execute(
    `UPDATE complaints SET status = ?, resolution = COALESCE(?, resolution), updated_at = ? WHERE id = ?`,
    [data.status, data.resolution ? data.resolution.trim() : null, now, complaintId]
  );

  await logAudit(userId, 'COMPLAINT_UPDATED', 'COMPLAINT', complaintId, `Status updated to ${data.status}`);

  if (data.status === 'RESOLVED' || data.status === 'CLOSED') {
    await createNotification(
      complaint.customer_id,
      'COMPLAINT_RESOLVED',
      `Complaint Resolved: [${complaint.ticket_id}]`,
      `Your complaint regarding "${complaint.subject}" has been updated with a resolution.`,
      complaintId
    );
  }

  return getComplaintById(complaintId, userRole, userId);
}
