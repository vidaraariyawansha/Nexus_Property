import { Router } from 'express';
import { queryAll, queryOne } from '../db/database.js';
import { getRecentAuditLogs } from '../services/auditService.js';
import { AuthenticatedRequest, requireRole } from '../middleware/auth.js';

export const adminRouter = Router();

// System Operational Metrics
adminRouter.get('/metrics', requireRole('ADMIN'), async (_req: AuthenticatedRequest, res, next) => {
  try {
    const userCountRow = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users');
    const propertyCountRow = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM properties');
    const activePropsRow = await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM properties WHERE status = 'ACTIVE'");
    const pendingPropsRow = await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM properties WHERE status = 'PENDING_APPROVAL'");
    const appointmentsRow = await queryOne<{ count: number }>('SELECT COUNT(*) as count FROM appointments');
    const complaintsRow = await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM complaints WHERE status IN ('NEW', 'IN_PROGRESS')");
    const inquiriesRow = await queryOne<{ count: number }>("SELECT COUNT(*) as count FROM inquiries WHERE status IN ('NEW', 'IN_PROGRESS')");

    const recentPendingProps = await queryAll<{
      id: string;
      title: string;
      location: string;
      price: number;
      owner_name: string;
      created_at: number;
    }>(
      `SELECT p.id, p.title, p.location, p.price, u.full_name as owner_name, p.created_at
       FROM properties p
       JOIN users u ON p.owner_id = u.id
       WHERE p.status = 'PENDING_APPROVAL'
       ORDER BY p.created_at DESC
       LIMIT 5`
    );

    res.json({
      success: true,
      message: 'Admin metrics retrieved.',
      data: {
        totalUsers: userCountRow ? userCountRow.count : 0,
        totalProperties: propertyCountRow ? propertyCountRow.count : 0,
        activeListings: activePropsRow ? activePropsRow.count : 0,
        pendingApprovals: pendingPropsRow ? pendingPropsRow.count : 0,
        totalAppointments: appointmentsRow ? appointmentsRow.count : 0,
        openComplaints: complaintsRow ? complaintsRow.count : 0,
        openInquiries: inquiriesRow ? inquiriesRow.count : 0,
        pendingListings: recentPendingProps,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Audit Logs
adminRouter.get('/audit-logs', requireRole('ADMIN'), async (_req: AuthenticatedRequest, res, next) => {
  try {
    const logs = await getRecentAuditLogs(50);
    res.json({
      success: true,
      message: 'Audit logs retrieved.',
      data: logs,
    });
  } catch (err) {
    next(err);
  }
});
