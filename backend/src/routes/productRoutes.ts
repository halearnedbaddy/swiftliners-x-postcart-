import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import {
  createProduct,
  listDraftProducts,
  listPublishedProducts,
  updateProductDetails,
  publishProduct,
  archiveProduct,
  deleteProduct,
} from '../controllers/productController';

const router = Router();

router.use(authenticate);
router.use(requireRole('SELLER'));

/**
 * POST /api/v1/products
 * Create a new product (manual add)
 */
router.post('/', createProduct);

/**
 * GET /api/v1/products/drafts
 */
router.get('/drafts', listDraftProducts);

/**
 * GET /api/v1/products/published
 */
router.get('/published', listPublishedProducts);

/**
 * PATCH /api/v1/products/:id
 * Update product details (resets to DRAFT)
 */
router.patch('/:id', updateProductDetails);

/**
 * POST /api/v1/products/:id/publish
 */
router.post('/:id/publish', publishProduct);

/**
 * POST /api/v1/products/:id/archive
 */
router.post('/:id/archive', archiveProduct);

/**
 * DELETE /api/v1/products/:id
 */
router.delete('/:id', deleteProduct);

export default router;