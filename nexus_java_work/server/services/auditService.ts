import crypto from 'crypto';
import { execute, queryAll } from '../db/database.js';
import { AuditLog } from '../types/index.js';

export async function logAudit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  details?: string | null
): Promise<void> {
  const id = `aud_${crypto.randomUUID()}`;
  const now = Date.now();
  await execute(
    `INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, actorId, action, entityType, entityId, details || null, now]
  );
}

export async function getRecentAuditLogs(limit: number = 50): Promise<AuditLog[]> {
  const rows = await queryAll<{
    id: string;
    actor_id: string;
    actor_name: string | null;
    action: string;
    entity_type: string;
    entity_id: string;
    details: string | null;
    created_at: number;
  }>(
    `SELECT a.*, u.full_name as actor_name 
     FROM audit_logs a
     LEFT JOIN users u ON a.actor_id = u.id
     ORDER BY a.created_at DESC 
     LIMIT ?`,
    [limit]
  );

  return rows.map(r => ({
    id: r.id,
    actorId: r.actor_id,
    actorName: r.actor_name || 'System',
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    details: r.details,
    createdAt: r.created_at,
  }));
}
