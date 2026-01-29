import { Router } from 'express';
import { getStorefrontBySlug } from '../controllers/storeController';
import { getPublicProduct, checkoutProduct } from '../controllers/productController';

const router = Router();

/**
 * GET /api/v1/storefront/:slug
 * Public storefront data with published products
 */
router.get('/:slug', getStorefrontBySlug);

/**
 * GET /api/v1/storefront/:slug/products/:id
 * Public product detail within a store
 */
router.get('/:slug/products/:id', getPublicProduct);

/**
 * POST /api/v1/storefront/:slug/products/:id/checkout
 * Create transaction from product (guest checkout)
 */
router.post('/:slug/products/:id/checkout', checkoutProduct);

export default router;