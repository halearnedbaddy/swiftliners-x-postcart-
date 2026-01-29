import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { paymentRateLimiter } from '../middleware/security';
import {
  getWallet,
  requestWithdrawal,
  getWithdrawalHistory,
  addPaymentMethod,
  getPaymentMethods,
  deletePaymentMethod,
} from '../controllers/walletController';

const router = Router();

// All wallet routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/wallet
 * Get current user's wallet balance
 */
router.get('/', getWallet);

/**
 * POST /api/v1/wallet/withdraw
 * Request a withdrawal
 */
router.post('/withdraw', paymentRateLimiter, requestWithdrawal);

/**
 * GET /api/v1/wallet/withdrawals
 * Get withdrawal history
 */
router.get('/withdrawals', getWithdrawalHistory);

/**
 * POST /api/v1/wallet/payment-methods
 * Add a new payment method
 */
router.post('/payment-methods', addPaymentMethod);

/**
 * GET /api/v1/wallet/payment-methods
 * Get all payment methods
 */
router.get('/payment-methods', getPaymentMethods);

/**
 * DELETE /api/v1/wallet/payment-methods/:id
 * Delete a payment method
 */
router.delete('/payment-methods/:id', deletePaymentMethod);

export default router;
