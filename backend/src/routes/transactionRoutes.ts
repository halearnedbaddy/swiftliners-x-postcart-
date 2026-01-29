import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import { paymentRateLimiter, validateSchema } from '../middleware/security';
import {
  createTransaction,
  getTransaction,
  getUserTransactions,
  initiatePayment,
  confirmPayment,
  confirmDelivery,
  openDispute,
  verifyPaystackPayment,
} from '../controllers/transactionController';

const router = Router();

/**
 * POST /api/v1/transactions
 * Create a new transaction (payment link)
 */
router.post(
  '/',
  authenticate,
  validateSchema({
    itemName: { required: true, type: 'string', minLength: 2, maxLength: 200 },
    amount: { required: true, type: 'number' },
    description: { required: false, type: 'string', maxLength: 1000 },
  }),
  createTransaction
);

/**
 * GET /api/v1/transactions/:id
 * Get transaction details (public for payment page)
 */
router.get('/:id', optionalAuth, getTransaction);

/**
 * GET /api/v1/transactions
 * Get user's transactions (as buyer or seller)
 */
router.get('/', authenticate, getUserTransactions);

/**
 * POST /api/v1/transactions/:id/pay
 * Initiate payment for a transaction
 */
router.post(
  '/:id/pay',
  paymentRateLimiter,
  validateSchema({
    paymentMethod: { required: true, type: 'string' },
    phone: { required: true, type: 'string', minLength: 10, maxLength: 15 },
  }),
  initiatePayment
);

/**
 * POST /api/v1/transactions/:id/confirm-payment
 * Confirm payment (simulates M-Pesa callback for demo)
 */
router.post('/:id/confirm-payment', confirmPayment);

/**
 * POST /api/v1/transactions/:id/confirm
 * Buyer confirms delivery - releases funds to seller
 */
router.post('/:id/confirm', authenticate, confirmDelivery);

/**
 * POST /api/v1/transactions/:id/dispute
 * Open a dispute on a transaction
 */
router.post(
  '/:id/dispute',
  authenticate,
  validateSchema({
    reason: { required: true, type: 'string', minLength: 10, maxLength: 1000 },
  }),
  openDispute
);

/**
 * POST /api/v1/transactions/:id/verify-paystack
 * Verify Paystack payment
 */
router.post('/:id/verify-paystack', verifyPaystackPayment);

export default router;