import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  createPaymentLink,
  getPaymentLink,
  getSellerLinks,
  updateLinkStatus,
  getLinkAnalytics
} from '../controllers/linkController';
import { purchaseViaLink } from '../controllers/purchaseController';

const router = Router();

/**
 * Public Routes
 */

/**
 * GET /api/v1/links/:linkId
 * Get public details of a payment link
 */
router.get('/:linkId', getPaymentLink);

/**
 * POST /api/v1/links/:linkId/purchase
 * Purchase a product via payment link
 */
router.post('/:linkId/purchase', purchaseViaLink);

/**
 * Protected Seller Routes
 */

// All routes below require authentication and SELLER role
router.use(authenticate);
router.use(requireRole('SELLER', 'ADMIN'));

/**
 * POST /api/v1/links
 * Create a new payment link
 */
router.post('/', createPaymentLink);

/**
 * GET /api/v1/links/seller/my-links
 * Get all payment links for the authenticated seller
 */
router.get('/seller/my-links', getSellerLinks);

/**
 * PATCH /api/v1/links/:linkId/status
 * Update the status of a payment link
 */
router.patch('/:linkId/status', updateLinkStatus);

/**
 * GET /api/v1/links/:linkId/analytics
 * Get analytics for a specific payment link
 */
router.get('/:linkId/analytics', getLinkAnalytics);

export default router;
