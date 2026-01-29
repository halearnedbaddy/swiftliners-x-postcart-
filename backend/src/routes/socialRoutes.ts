import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { listSocialAccounts, connectSocialPage, rescanSocialPage } from '../controllers/socialController';

const router = Router();

router.use(authenticate);
router.use(requireRole('SELLER'));

/**
 * GET /api/v1/social
 * List connected social pages for seller's store
 */
router.get('/', listSocialAccounts);

/**
 * POST /api/v1/social/connect
 * Connect a social page (one-time per platform)
 */
router.post('/connect', connectSocialPage);

/**
 * POST /api/v1/social/:id/rescan
 * Trigger rescan for a specific social account
 */
router.post('/:id/rescan', rescanSocialPage);

export default router;