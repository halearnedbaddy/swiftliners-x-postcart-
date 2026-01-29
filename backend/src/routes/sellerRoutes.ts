import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { prisma } from '../config/database';
import {
  getSellerOrders,
  getOrderDetails,
  acceptOrder,
  rejectOrder,
  addShippingInfo,
  getSellerStats,
} from '../controllers/sellerController';

const router = Router();

// All seller routes require authentication and SELLER role
router.use(authenticate);
router.use(requireRole('SELLER', 'ADMIN'));

/**
 * GET /api/v1/seller/orders
 * Get seller's orders
 */
router.get('/orders', getSellerOrders);

/**
 * GET /api/v1/seller/orders/:id
 * Get specific order details
 */
router.get('/orders/:id', getOrderDetails);

/**
 * POST /api/v1/seller/orders/:id/accept
 * Accept an order
 */
router.post('/orders/:id/accept', acceptOrder);

/**
 * POST /api/v1/seller/orders/:id/reject
 * Reject an order
 */
router.post('/orders/:id/reject', rejectOrder);

/**
 * POST /api/v1/seller/orders/:id/shipping
 * Add shipping information
 */
router.post('/orders/:id/shipping', addShippingInfo);

/**
 * GET /api/v1/seller/stats
 * Get seller statistics
 */
router.get('/stats', getSellerStats);

/**
 * PATCH /api/v1/seller/profile/tax
 * Update seller tax information
 */
router.patch('/profile/tax', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Auth required' });
    const { taxId, businessRegNumber, isBusiness } = req.body;
    
    const updated = await prisma.sellerProfile.update({
      where: { userId: req.user.userId },
      data: { taxId, businessRegNumber, isBusiness }
    });
    
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update tax info' });
  }
});

export default router;
