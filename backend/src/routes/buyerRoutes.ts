import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  getMyOrders,
  getOrderDetails,
  getPublicOrderDetails,
  getWallet,
  confirmDelivery,
  openDispute,
  getDisputes,
  addDisputeMessage,
  getRecommendedSellers,
} from '../controllers/buyerController';

const router = Router();

/**
 * Public Routes
 */

/**
 * GET /api/v1/buyer/orders/track/:id
 * Get order details for tracking (public)
 */
router.get('/orders/track/:id', getPublicOrderDetails);

/**
 * GET /api/v1/buyer/sellers/recommended
 * Get recommended sellers (public)
 */
router.get('/sellers/recommended', getRecommendedSellers);

/**
 * Protected Routes
 */

// Most buyer routes require authentication and BUYER role
router.use(authenticate);
router.use(requireRole('BUYER'));

/**
 * GET /api/v1/buyer/orders
 * Get buyer's orders
 */
router.get('/orders', getMyOrders);

/**
 * GET /api/v1/buyer/orders/:id
 * Get order details
 */
router.get('/orders/:id', getOrderDetails);

/**
 * GET /api/v1/buyer/wallet
 * Get buyer's wallet
 */
router.get('/wallet', getWallet);

/**
 * POST /api/v1/buyer/orders/:transactionId/confirm-delivery
 * Confirm delivery
 */
router.post('/orders/:transactionId/confirm-delivery', confirmDelivery);

/**
 * POST /api/v1/buyer/disputes
 * Open a dispute
 */
router.post('/disputes', openDispute);

/**
 * GET /api/v1/buyer/disputes
 * Get buyer's disputes
 */
router.get('/disputes', getDisputes);

/**
 * POST /api/v1/buyer/disputes/:disputeId/messages
 * Add message to dispute
 */
router.post('/disputes/:disputeId/messages', addDisputeMessage);

/**
 * GET /api/v1/buyer/sellers/recommended
 * Get recommended sellers (public)
 */
router.get('/sellers/recommended', getRecommendedSellers);

export default router;
