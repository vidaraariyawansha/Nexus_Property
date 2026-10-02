import crypto from 'crypto';
import { execute, queryAll, queryOne } from '../db/database.js';
import { Notification } from '../types/index.js';

export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  referenceId?: string | null
): Promise<void> {
  const id = `notif_${crypto.randomUUID()}`;
  const now = Date.now();
  await execute(
    `INSERT INTO notifications (id, user_id, type, title, message, reference_id, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, userId, type, title, message, referenceId || null, now]
  );
}

export async function getUserNotifications(userId: string): Promise<Notification[]> {
  const rows = await queryAll<{
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    reference_id: string | null;
    is_read: number;
    created_at: number;
  }>(
    `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );

  return rows.map(r => ({
    id: r.id,
    userId: r.user_id,
    type: r.type,
    title: r.title,
    message: r.message,
    referenceId: r.reference_id,
    isRead: r.is_read === 1,
    createdAt: r.created_at,
  }));
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  await execute(
    `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await execute(
    `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
    [userId]
  );
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const row = await queryOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`,
    [userId]
  );
  return row ? row.count : 0;
}
