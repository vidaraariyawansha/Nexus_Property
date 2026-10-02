import crypto from 'crypto';
import { execute, executeTransaction, queryAll, queryOne } from '../db/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { Appointment, AppointmentStatus, UserRole } from '../types/index.js';
import { logAudit } from './auditService.js';
import { createNotification } from './notificationService.js';

export async function createAppointment(
  customerId: string,
  data: {
    propertyId: string;
    agentId: string;
    appointmentTime: number;
    durationMinutes?: number;
    notes?: string;
  }
): Promise<Appointment> {
  const { propertyId, agentId, appointmentTime, durationMinutes = 60, notes } = data;

  if (!propertyId || !agentId || !appointmentTime) {
    throw new AppError('Property, agent, and appointment time are required.', 400);
  }

  // Future check: at least 15 minutes in the future
  const now = Date.now();
  if (appointmentTime < now + 15 * 60 * 1000) {
    throw new AppError('Appointment time must be in the future (at least 15 minutes ahead).', 400);
  }

  // Validate property exists and is ACTIVE
  const property = await queryOne<{ id: string; title: string; status: string }>(
    'SELECT id, title, status FROM properties WHERE id = ?',
    [propertyId]
  );
  if (!property) throw new AppError('Property not found.', 404);
  if (property.status !== 'ACTIVE') {
    throw new AppError('Viewing appointments can only be booked for publicly active properties.', 400);
  }

  // Validate agent exists, has role AGENT, and is enabled
  const agent = await queryOne<{ id: string; full_name: string; role: string; enabled: number }>(
    'SELECT id, full_name, role, enabled FROM users WHERE id = ?',
    [agentId]
  );
  if (!agent || agent.role !== 'AGENT' || agent.enabled !== 1) {
    throw new AppError('The selected agent is not available for bookings.', 400);
  }

  const durationMs = durationMinutes * 60 * 1000;
  const newStart = appointmentTime;
  const newEnd = appointmentTime + durationMs;

  return await executeTransaction(async () => {
    // Conflict Detection Logic:
    // Check if agent has overlapping active appointments
    // Overlap formula: (startA < endB) AND (endA > startB)
    const activeStatuses = "('REQUESTED', 'CONFIRMED', 'RESCHEDULED')";
    const conflicts = await queryAll<{ id: string }>(
      `SELECT id FROM appointments 
       WHERE agent_id = ? 
       AND status IN ${activeStatuses}
       AND (appointment_time < ? AND (appointment_time + (duration_minutes * 60 * 1000)) > ?)`,
      [agentId, newEnd, newStart]
    );

    if (conflicts.length > 0) {
      throw new AppError('The selected agent is already booked during this time slot. Please choose another time or agent.', 409);
    }

    // Check if customer already has a viewing scheduled during that time slot
    const customerConflicts = await queryAll<{ id: string }>(
      `SELECT id FROM appointments 
       WHERE customer_id = ? 
       AND status IN ${activeStatuses}
       AND (appointment_time < ? AND (appointment_time + (duration_minutes * 60 * 1000)) > ?)`,
      [customerId, newEnd, newStart]
    );

    if (customerConflicts.length > 0) {
      throw new AppError('You already have another viewing appointment scheduled during this time window.', 409);
    }

    const appointmentId = `apt_${crypto.randomUUID()}`;
    await execute(
      `INSERT INTO appointments (id, property_id, customer_id, agent_id, appointment_time, duration_minutes, status, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'REQUESTED', ?, ?, ?)`,
      [appointmentId, propertyId, customerId, agentId, newStart, durationMinutes, notes ? notes.trim() : null, now, now]
    );

    // Notify agent of new viewing request
    const customer = await queryOne<{ full_name: string }>('SELECT full_name FROM users WHERE id = ?', [customerId]);
    await createNotification(
      agentId,
      'APPOINTMENT_REQUESTED',
      'New Viewing Appointment Requested',
      `${customer?.full_name || 'A customer'} requested a viewing for "${property.title}" on ${new Date(newStart).toLocaleDateString()} at ${new Date(newStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      appointmentId
    );

    await logAudit(customerId, 'APPOINTMENT_REQUESTED', 'APPOINTMENT', appointmentId, `Requested appointment for property ${property.title}`);

    return getAppointmentById(appointmentId, 'CUSTOMER', customerId);
  });
}

export async function getAppointmentById(
  id: string,
  userRole: UserRole,
  userId: string
): Promise<Appointment> {
  const row = await queryOne<{
    id: string;
    property_id: string;
    property_title: string;
    property_location: string;
    primary_image: string | null;
    customer_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    agent_id: string;
    agent_name: string;
    agent_email: string;
    agent_phone: string | null;
    appointment_time: number;
    duration_minutes: number;
    status: string;
    notes: string | null;
    cancellation_reason: string | null;
    created_at: number;
    updated_at: number;
  }>(
    `SELECT 
      a.*,
      p.title as property_title,
      p.location as property_location,
      (SELECT url FROM property_images WHERE property_id = p.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) as primary_image,
      c.full_name as customer_name,
      c.email as customer_email,
      c.phone as customer_phone,
      ag.full_name as agent_name,
      ag.email as agent_email,
      ag.phone as agent_phone
     FROM appointments a
     JOIN properties p ON a.property_id = p.id
     JOIN users c ON a.customer_id = c.id
     JOIN users ag ON a.agent_id = ag.id
     WHERE a.id = ?`,
    [id]
  );

  if (!row) throw new AppError('Appointment not found.', 404);

  // Security: RBAC & isolation
  const isCustomer = row.customer_id === userId;
  const isAgent = row.agent_id === userId;
  const isAdmin = userRole === 'ADMIN';

  if (!isCustomer && !isAgent && !isAdmin) {
    throw new AppError('Access forbidden: You cannot view this appointment.', 403);
  }

  return {
    id: row.id,
    propertyId: row.property_id,
    propertyTitle: row.property_title,
    propertyLocation: row.property_location,
    propertyImage: row.primary_image || undefined,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    agentId: row.agent_id,
    agentName: row.agent_name,
    agentEmail: row.agent_email,
    agentPhone: row.agent_phone,
    appointmentTime: row.appointment_time,
    durationMinutes: row.duration_minutes,
    status: row.status as AppointmentStatus,
    notes: row.notes,
    cancellationReason: row.cancellation_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function updateAppointmentStatus(
  userId: string,
  userRole: UserRole,
  appointmentId: string,
  action: 'CONFIRM' | 'RESCHEDULE' | 'CANCEL' | 'COMPLETE',
  options?: {
    rescheduledTime?: number;
    reason?: string;
  }
): Promise<Appointment> {
  const current = await queryOne<{
    customer_id: string;
    agent_id: string;
    property_id: string;
    status: string;
    appointment_time: number;
    duration_minutes: number;
  }>('SELECT customer_id, agent_id, property_id, status, appointment_time, duration_minutes FROM appointments WHERE id = ?', [appointmentId]);

  if (!current) throw new AppError('Appointment not found.', 404);

  const isCustomer = current.customer_id === userId;
  const isAgent = current.agent_id === userId;
  const isAdmin = userRole === 'ADMIN';

  if (!isCustomer && !isAgent && !isAdmin) {
    throw new AppError('Access forbidden: You cannot modify this appointment.', 403);
  }

  const currentStatus = current.status as AppointmentStatus;

  return await executeTransaction(async () => {
    const now = Date.now();

    if (action === 'CONFIRM') {
      if (!isAgent && !isAdmin) {
        throw new AppError('Only the assigned agent or an administrator can confirm appointments.', 403);
      }
      if (currentStatus !== 'REQUESTED' && currentStatus !== 'RESCHEDULED') {
        throw new AppError(`Cannot confirm appointment currently in status ${currentStatus}.`, 400);
      }

      await execute('UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?', ['CONFIRMED', now, appointmentId]);
      await logAudit(userId, 'APPOINTMENT_CONFIRMED', 'APPOINTMENT', appointmentId, 'Viewing confirmed by agent');

      await createNotification(
        current.customer_id,
        'APPOINTMENT_CONFIRMED',
        'Viewing Appointment Confirmed',
        `Your viewing appointment on ${new Date(current.appointment_time).toLocaleDateString()} has been confirmed!`,
        appointmentId
      );
    } else if (action === 'RESCHEDULE') {
      const newTime = options?.rescheduledTime;
      if (!newTime || newTime < now + 15 * 60 * 1000) {
        throw new AppError('Valid future rescheduled time is required.', 400);
      }

      // Check conflict for agent
      const durationMs = current.duration_minutes * 60 * 1000;
      const conflicts = await queryAll<{ id: string }>(
        `SELECT id FROM appointments 
         WHERE agent_id = ? 
         AND id != ?
         AND status IN ('REQUESTED', 'CONFIRMED', 'RESCHEDULED')
         AND (appointment_time < ? AND (appointment_time + (duration_minutes * 60 * 1000)) > ?)`,
        [current.agent_id, appointmentId, newTime + durationMs, newTime]
      );

      if (conflicts.length > 0) {
        throw new AppError('The agent is already booked during the requested new time slot.', 409);
      }

      const nextStatus: AppointmentStatus = isAgent ? 'CONFIRMED' : 'REQUESTED';
      await execute(
        'UPDATE appointments SET appointment_time = ?, status = ?, updated_at = ? WHERE id = ?',
        [newTime, nextStatus, now, appointmentId]
      );

      await logAudit(userId, 'APPOINTMENT_RESCHEDULED', 'APPOINTMENT', appointmentId, `Rescheduled to ${new Date(newTime).toISOString()}`);

      const recipientId = isCustomer ? current.agent_id : current.customer_id;
      await createNotification(
        recipientId,
        'APPOINTMENT_RESCHEDULED',
        'Viewing Appointment Rescheduled',
        `The viewing appointment has been rescheduled to ${new Date(newTime).toLocaleDateString()} at ${new Date(newTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
        appointmentId
      );
    } else if (action === 'CANCEL') {
      if (currentStatus === 'CANCELLED' || currentStatus === 'COMPLETED') {
        throw new AppError(`Cannot cancel an appointment that is already ${currentStatus}.`, 400);
      }

      const reason = options?.reason ? options.reason.trim() : 'Cancelled by user';
      await execute(
        'UPDATE appointments SET status = ?, cancellation_reason = ?, updated_at = ? WHERE id = ?',
        ['CANCELLED', reason, now, appointmentId]
      );

      await logAudit(userId, 'APPOINTMENT_CANCELLED', 'APPOINTMENT', appointmentId, `Cancelled. Reason: ${reason}`);

      const recipientId = isCustomer ? current.agent_id : current.customer_id;
      await createNotification(
        recipientId,
        'APPOINTMENT_CANCELLED',
        'Viewing Appointment Cancelled',
        `The viewing appointment was cancelled. Reason: ${reason}`,
        appointmentId
      );
    } else if (action === 'COMPLETE') {
      if (!isAgent && !isAdmin) {
        throw new AppError('Only the assigned agent or an administrator can mark an appointment as completed.', 403);
      }
      if (currentStatus !== 'CONFIRMED' && currentStatus !== 'RESCHEDULED') {
        throw new AppError(`Cannot complete appointment with status ${currentStatus}.`, 400);
      }

      await execute('UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?', ['COMPLETED', now, appointmentId]);
      await logAudit(userId, 'APPOINTMENT_COMPLETED', 'APPOINTMENT', appointmentId, 'Viewing completed successfully');

      await createNotification(
        current.customer_id,
        'APPOINTMENT_COMPLETED',
        'Viewing Completed',
        'Thank you for attending the property viewing! Feel free to leave a rating or submit an inquiry.',
        appointmentId
      );
    }

    return getAppointmentById(appointmentId, userRole, userId);
  });
}

export async function getUserAppointments(
  userId: string,
  userRole: UserRole,
  statusFilter?: string
): Promise<Appointment[]> {
  let whereSql = '';
  const params: (string | number)[] = [];

  if (userRole === 'CUSTOMER') {
    whereSql = 'a.customer_id = ?';
    params.push(userId);
  } else if (userRole === 'AGENT') {
    whereSql = 'a.agent_id = ?';
    params.push(userId);
  } else if (userRole === 'ADMIN') {
    whereSql = '1=1';
  } else {
    // Owners can see appointments for their properties
    whereSql = 'p.owner_id = ?';
    params.push(userId);
  }

  if (statusFilter && statusFilter !== 'ALL') {
    whereSql += ' AND a.status = ?';
    params.push(statusFilter);
  }

  const rows = await queryAll<{
    id: string;
    property_id: string;
    property_title: string;
    property_location: string;
    primary_image: string | null;
    customer_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string | null;
    agent_id: string;
    agent_name: string;
    agent_email: string;
    agent_phone: string | null;
    appointment_time: number;
    duration_minutes: number;
    status: string;
    notes: string | null;
    cancellation_reason: string | null;
    created_at: number;
    updated_at: number;
  }>(
    `SELECT 
      a.*,
      p.title as property_title,
      p.location as property_location,
      (SELECT url FROM property_images WHERE property_id = p.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) as primary_image,
      c.full_name as customer_name,
      c.email as customer_email,
      c.phone as customer_phone,
      ag.full_name as agent_name,
      ag.email as agent_email,
      ag.phone as agent_phone
     FROM appointments a
     JOIN properties p ON a.property_id = p.id
     JOIN users c ON a.customer_id = c.id
     JOIN users ag ON a.agent_id = ag.id
     WHERE ${whereSql}
     ORDER BY a.appointment_time ASC`,
    params
  );

  return rows.map(r => ({
    id: r.id,
    propertyId: r.property_id,
    propertyTitle: r.property_title,
    propertyLocation: r.property_location,
    propertyImage: r.primary_image || undefined,
    customerId: r.customer_id,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    customerPhone: r.customer_phone,
    agentId: r.agent_id,
    agentName: r.agent_name,
    agentEmail: r.agent_email,
    agentPhone: r.agent_phone,
    appointmentTime: r.appointment_time,
    durationMinutes: r.duration_minutes,
    status: r.status as AppointmentStatus,
    notes: r.notes,
    cancellationReason: r.cancellation_reason,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getAvailableAgents(): Promise<{ id: string; fullName: string; email: string; phone: string | null }[]> {
  const rows = await queryAll<{ id: string; full_name: string; email: string; phone: string | null }>(
    `SELECT id, full_name, email, phone FROM users WHERE role = 'AGENT' AND enabled = 1 ORDER BY full_name ASC`
  );
  return rows.map(r => ({
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
  }));
}
