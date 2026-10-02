import { Router } from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
} from '../services/notificationService.js';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.js';

export const notificationRouter = Router();

// Get notifications
notificationRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const notifications = await getUserNotifications(req.user!.userId);
    const unreadCount = await getUnreadNotificationCount(req.user!.userId);
    res.json({
      success: true,
      message: 'Notifications retrieved.',
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Mark single as read
notificationRouter.post('/:id/read', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await markNotificationAsRead(req.user!.userId, req.params.id);
    res.json({
      success: true,
      message: 'Notification marked as read.',
    });
  } catch (err) {
    next(err);
  }
});

// Mark all as read
notificationRouter.post('/read-all', requireAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    await markAllNotificationsAsRead(req.user!.userId);
    res.json({
      success: true,
      message: 'All notifications marked as read.',
    });
  } catch (err) {
    next(err);
  }
});
