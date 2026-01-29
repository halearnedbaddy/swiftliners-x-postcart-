/**
 * IntaSend Payment Routes
 * Handles payment creation, webhooks, and payouts
 */

import { Router, Request, Response } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import { paymentRateLimiter } from '../middleware/security';
import { intasendService, IntaSendWebhookPayload } from '../services/intasendService';
import { sendSMS } from '../services/smsService';
import { prisma } from '../config/database';
import { io } from '../index';

const router = Router();

/**
 * GET /api/v1/intasend/config
 * Get IntaSend publishable key for frontend
 */
router.get('/config', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      publishableKey: intasendService.getPublishableKey(),
      testMode: process.env.INTASEND_TEST_MODE === 'true',
    },
  });
});

/**
 * POST /api/v1/intasend/create-checkout
 * Create a hosted checkout session
 * Frontend redirects user to the returned URL
 */
router.post('/create-checkout', paymentRateLimiter, async (req: Request, res: Response) => {
  try {
    const { transactionId, email, firstName, lastName, phone } = req.body;

    if (!transactionId || !email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: transactionId, email',
      });
    }

    // Get transaction details
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { seller: true },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Transaction is not available for payment',
      });
    }

    // Create IntaSend checkout
    const checkout = await intasendService.createCheckout({
      firstName: firstName || 'Customer',
      lastName: lastName || '',
      email,
      phone,
      amount: transaction.amount,
      apiRef: transactionId,
      redirectUrl: `${process.env.FRONTEND_URL}/payment/success?txn=${transactionId}`,
      webhookUrl: `${process.env.BACKEND_URL}/api/v1/intasend/webhook`,
    });

    // Update transaction with checkout reference
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        paymentReference: checkout.id,
        status: 'PROCESSING',
        buyerEmail: email,
        buyerPhone: phone || null,
      },
    });

    res.json({
      success: true,
      data: {
        checkoutUrl: checkout.url,
        checkoutId: checkout.id,
      },
    });
  } catch (error) {
    console.error('❌ Create checkout error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create checkout',
    });
  }
});

/**
 * POST /api/v1/intasend/stk-push
 * Initiate M-Pesa STK Push payment
 */
router.post('/stk-push', paymentRateLimiter, async (req: Request, res: Response) => {
  try {
    const { transactionId, phoneNumber, email } = req.body;

    if (!transactionId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: transactionId, phoneNumber',
      });
    }

    // Get transaction details
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { seller: true },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Transaction is not available for payment',
      });
    }

    // Initiate STK Push
    const stkResponse = await intasendService.createMpesaStkPush({
      phoneNumber,
      email: email || 'customer@example.com',
      amount: transaction.amount,
      apiRef: transactionId,
      narrative: `Payment for ${transaction.itemName}`,
    });

    // Update transaction
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        paymentReference: stkResponse.invoice.invoice_id,
        status: 'PROCESSING',
        buyerPhone: phoneNumber,
        buyerEmail: email || null,
      },
    });

    res.json({
      success: true,
      data: {
        invoiceId: stkResponse.invoice.invoice_id,
        message: 'Check your phone for the M-Pesa prompt',
      },
    });
  } catch (error) {
    console.error('❌ STK Push error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate payment',
    });
  }
});

/**
 * POST /api/v1/intasend/webhook
 * Handle IntaSend payment webhooks
 * This is the source of truth for payment confirmation
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const payload = req.body as IntaSendWebhookPayload;

    console.log('📥 IntaSend webhook received:', JSON.stringify(payload, null, 2));

    // Verify webhook challenge if configured
    const webhookChallenge = process.env.INTASEND_WEBHOOK_CHALLENGE;
    if (webhookChallenge && !intasendService.verifyWebhookChallenge(payload, webhookChallenge)) {
      console.warn('⚠️ Invalid webhook challenge');
      return res.status(401).json({ error: 'Invalid challenge' });
    }

    // Parse the webhook payload
    const { isComplete, isFailed, apiRef, amount, mpesaReference, failedReason } =
      intasendService.parseWebhookPayload(payload);

    // apiRef is the transactionId we passed when creating the checkout
    const transactionId = apiRef;

    if (!transactionId) {
      console.warn('⚠️ No transaction ID in webhook');
      return res.json({ received: true });
    }

    // Find the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { seller: true, buyer: true },
    });

    if (!transaction) {
      console.warn('⚠️ Transaction not found:', transactionId);
      return res.json({ received: true });
    }

    // Skip if already processed
    if (transaction.status === 'PAID' || transaction.status === 'COMPLETED') {
      console.log('ℹ️ Transaction already processed:', transactionId);
      return res.json({ received: true });
    }

    if (isComplete) {
      // Payment successful - update transaction and escrow funds
      const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5');
      const platformFee = (transaction.amount * platformFeePercent) / 100;
      const sellerPayout = transaction.amount - platformFee;

      await prisma.$transaction(async (tx) => {
        // Update transaction status
        await tx.transaction.update({
          where: { id: transactionId },
          data: {
            status: 'PAID',
            paymentReference: mpesaReference || payload.invoice_id,
            paidAt: new Date(),
            platformFee,
            sellerPayout,
          },
        });

        // Add to seller's pending balance (escrow)
        await tx.wallet.update({
          where: { userId: transaction.sellerId },
          data: {
            pendingBalance: { increment: transaction.amount },
          },
        });
      });

      // Send SMS to seller
      if (transaction.seller?.phone) {
        await sendSMS(
          transaction.seller.phone,
          `SWIFTLINE: KES ${amount.toLocaleString()} payment secured for "${transaction.itemName}". Ship the item now!`
        );
      }

      // Emit WebSocket notification to seller
      io.to(`user:${transaction.sellerId}`).emit('notification:new', {
        id: `payment-${transactionId}`,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Received! 🎉',
        message: `KES ${amount.toLocaleString()} payment secured. Ready to ship!`,
        timestamp: new Date().toISOString(),
      });

      console.log('✅ Payment confirmed for transaction:', transactionId);

    } else if (isFailed) {
      // Payment failed - update transaction status
      await prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'CANCELLED',
          cancellationReason: failedReason || 'Payment failed',
        },
      });

      // Notify seller of failure
      io.to(`user:${transaction.sellerId}`).emit('notification:new', {
        id: `payment-failed-${transactionId}`,
        type: 'PAYMENT_FAILED',
        title: 'Payment Failed',
        message: `Payment for "${transaction.itemName}" failed: ${failedReason || 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      });

      console.log('❌ Payment failed for transaction:', transactionId, failedReason);
    }

    // Acknowledge receipt
    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    // Still return 200 to prevent retries for unrecoverable errors
    res.json({ received: true, error: 'Processing error' });
  }
});

/**
 * POST /api/v1/intasend/check-status
 * Check payment status for a transaction
 */
router.post('/check-status', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing transactionId',
      });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    // If we have a payment reference, check with IntaSend
    let intasendStatus = null;
    if (transaction.paymentReference && transaction.status === 'PROCESSING') {
      try {
        intasendStatus = await intasendService.getPaymentStatusByRef(transactionId);
      } catch (e) {
        console.warn('Could not fetch IntaSend status:', e);
      }
    }

    res.json({
      success: true,
      data: {
        status: transaction.status,
        amount: transaction.amount,
        paidAt: transaction.paidAt,
        intasendStatus: intasendStatus?.invoice?.state,
      },
    });
  } catch (error) {
    console.error('❌ Check status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check payment status',
    });
  }
});

/**
 * POST /api/v1/intasend/payout
 * Request a payout/withdrawal to M-Pesa
 * Called when releasing funds to seller
 */
router.post('/payout', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { amount, phoneNumber, narrative } = req.body;

    if (!amount || !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, phoneNumber',
      });
    }

    // Get user's wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found',
      });
    }

    if (wallet.availableBalance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
      });
    }

    // Minimum withdrawal amount
    const minWithdrawal = parseFloat(process.env.MIN_WITHDRAWAL_AMOUNT || '100');
    if (amount < minWithdrawal) {
      return res.status(400).json({
        success: false,
        error: `Minimum withdrawal amount is KES ${minWithdrawal}`,
      });
    }

    // Create payout via IntaSend
    const payoutResponse = await intasendService.createMpesaPayout({
      phoneNumber,
      name: wallet.user?.name || 'Seller',
      amount,
      narrative: narrative || 'Swiftline Withdrawal',
    });

    // Auto-approve the payout (optional - can be made manual)
    const approvedPayout = await intasendService.approvePayout(payoutResponse.tracking_id);

    // Deduct from wallet and create withdrawal
    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: {
          availableBalance: { decrement: amount },
        },
      });

      // Find or create payment method for this phone number
      let paymentMethod = await tx.paymentMethod.findFirst({
        where: {
          userId: userId!,
          type: 'MOBILE_MONEY',
          accountNumber: phoneNumber,
        },
      });

      if (!paymentMethod) {
        paymentMethod = await tx.paymentMethod.create({
          data: {
            userId: userId!,
            type: 'MOBILE_MONEY',
            provider: 'M-PESA',
            accountNumber: phoneNumber,
            accountName: wallet.user?.name || 'User',
            isDefault: false,
          },
        });
      }

      // Create withdrawal record
      await tx.withdrawal.create({
        data: {
          userId: userId!,
          paymentMethodId: paymentMethod.id,
          amount,
          status: 'PROCESSING',
          reference: payoutResponse.tracking_id,
        },
      });
    });

    res.json({
      success: true,
      message: 'Withdrawal initiated',
      data: {
        trackingId: payoutResponse.tracking_id,
        status: approvedPayout.status,
        amount,
      },
    });
  } catch (error) {
    console.error('❌ Payout error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process withdrawal',
    });
  }
});

/**
 * POST /api/v1/intasend/payout-webhook
 * Handle IntaSend payout/disbursement webhooks
 */
router.post('/payout-webhook', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    console.log('📥 IntaSend payout webhook:', JSON.stringify(payload, null, 2));

    // Extract tracking ID and status
    const { tracking_id, status, transactions } = payload;

    if (!tracking_id) {
      return res.json({ received: true });
    }

    // Find the withdrawal by reference
    const withdrawal = await prisma.withdrawal.findFirst({
      where: { reference: tracking_id },
      include: { 
        user: true,
        paymentMethod: true,
      },
    });

    if (!withdrawal) {
      console.warn('⚠️ Withdrawal not found for tracking:', tracking_id);
      return res.json({ received: true });
    }

    // Update withdrawal status based on payout status
    const newStatus = status === 'COMPLETE' ? 'COMPLETED' :
      status === 'FAILED' ? 'FAILED' : 'PROCESSING';

    await prisma.withdrawal.update({
      where: { id: withdrawal.id },
      data: { status: newStatus },
    });

    // Notify user
    if (withdrawal.user?.id) {
      io.to(`user:${withdrawal.user.id}`).emit('notification:new', {
        id: `withdrawal-${withdrawal.id}`,
        type: newStatus === 'COMPLETED' ? 'WITHDRAWAL_SUCCESS' : 'WITHDRAWAL_FAILED',
        title: newStatus === 'COMPLETED' ? 'Withdrawal Successful' : 'Withdrawal Failed',
        message: newStatus === 'COMPLETED'
          ? `KES ${withdrawal.amount.toLocaleString()} sent to ${withdrawal.paymentMethod?.accountNumber || 'your account'}`
          : 'Your withdrawal could not be processed',
        timestamp: new Date().toISOString(),
      });
    }

    // If failed, refund the amount to wallet
    if (newStatus === 'FAILED') {
      await prisma.wallet.update({
        where: { userId: withdrawal.userId },
        data: {
          availableBalance: { increment: withdrawal.amount },
        },
      });
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Payout webhook error:', error);
    res.json({ received: true });
  }
});

export default router;
