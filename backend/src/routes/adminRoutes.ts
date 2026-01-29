import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getDashboardOverview,
  getAllTransactions,
  getAllDisputes,
  resolveDispute,
  getAllUsers,
  deactivateUser,
  getAnalytics,
} from '../controllers/adminController';

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(requireRole('ADMIN'));

/**
 * GET /api/v1/admin/dashboard
 * Get admin dashboard overview
 */
router.get('/dashboard', getDashboardOverview);

/**
 * GET /api/v1/admin/transactions
 * Get all transactions
 */
router.get('/transactions', getAllTransactions);

/**
 * GET /api/v1/admin/disputes
 * Get all disputes
 */
router.get('/disputes', getAllDisputes);

/**
 * POST /api/v1/admin/disputes/:disputeId/resolve
 * Resolve a dispute
 */
router.post('/disputes/:disputeId/resolve', resolveDispute);

/**
 * GET /api/v1/admin/users
 * Get all users
 */
router.get('/users', getAllUsers);

/**
 * POST /api/v1/admin/users/:userId/deactivate
 * Deactivate a user
 */
router.post('/users/:userId/deactivate', deactivateUser);

/**
 * GET /api/v1/admin/analytics
 * Get platform analytics
 */
router.get('/analytics', getAnalytics);

export default router;
