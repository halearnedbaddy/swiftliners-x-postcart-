import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { getMyStore, createStore, updateStore, updateStoreStatus } from '../controllers/storeController';
import { scanStore } from '../services/socialScanService';
import { prisma } from '../config/database';

const router = Router();

// Seller-only routes
router.use(authenticate);
router.use(requireRole('SELLER'));

/**
 * GET /api/v1/store/me
 * Get current seller's store
 */
router.get('/me', getMyStore);

/**
 * POST /api/v1/store
 * Create store for current seller (one-time)
 */
router.post('/', createStore);

/**
 * PATCH /api/v1/store
 * Update store details (name, slug, logo, bio, visibility)
 */
router.patch('/', updateStore);

/**
 * PATCH /api/v1/store/status
 * Update store status (INACTIVE | ACTIVE | FROZEN)
 */
router.patch('/status', updateStoreStatus);

/**
 * POST /api/v1/store/rescan
 * Manually trigger rescan of all connected social pages
 */
router.post('/rescan', async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ success: false, error: 'Authentication required' });
    const store = await prisma.store.findUnique({ where: { sellerId: req.user.userId } });
    if (!store) return res.status(404).json({ success: false, error: 'Store not found' });
    await scanStore(store.id);
    res.json({ success: true, message: 'Rescan triggered' });
  } catch (error) {
    console.error('Manual rescan error:', error);
    res.status(500).json({ success: false, error: 'Failed to trigger rescan' });
  }
});

export default router;