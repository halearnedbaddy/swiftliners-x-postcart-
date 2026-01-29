import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController';

const router = Router();

/**
 * GET /api/v1/notifications
 * Get user's notifications
 */
router.get('/', authenticate, getNotifications);

/**
 * PUT /api/v1/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', authenticate, markAsRead);

/**
 * PUT /api/v1/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', authenticate, markAllAsRead);

export default router;
