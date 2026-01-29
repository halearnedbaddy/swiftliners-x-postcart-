import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import { paymentRateLimiter } from '../middleware/security';
import { paystackService } from '../services/paystackService';
import { prisma } from '../config/database';
import { io } from '../index';

const router = Router();

/**
 * GET /api/v1/paystack/config
 * Get Paystack public key for frontend
 */
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      publicKey: paystackService.getPublicKey(),
    },
  });
});

/**
 * POST /api/v1/paystack/initialize
 * Initialize a payment transaction
 */
router.post('/initialize', paymentRateLimiter, optionalAuth, async (req, res) => {
  try {
    const { transactionId, email, metadata } = req.body;

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

    // Generate reference
    const reference = paystackService.generateReference(`TXN-${transactionId.slice(0, 8)}`);

    // Callback URL: direct customer back to product/payment page so they see success and can login with OTP if needed
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const linkId = metadata?.linkId as string | undefined;
    const callbackUrl = linkId
      ? `${frontendUrl}/buy/${linkId}?payment=success&reference=${reference}`
      : `${frontendUrl}/payment/callback?reference=${reference}`;

    // Initialize Paystack transaction
    const result = await paystackService.initializeTransaction({
      email,
      amount: Math.round(transaction.amount * 100), // Convert to cents
      currency: 'KES',
      reference,
      callbackUrl,
      metadata: {
        transactionId,
        itemName: transaction.itemName,
        sellerId: transaction.sellerId,
        ...metadata,
      },
    });

    // Store reference in transaction
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        paymentReference: reference,
        status: 'PROCESSING',
      },
    });

    res.json({
      success: true,
      data: {
        authorizationUrl: result.data.authorization_url,
        accessCode: result.data.access_code,
        reference: result.data.reference,
      },
    });
  } catch (error) {
    console.error('❌ Paystack initialization error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize payment',
    });
  }
});

/**
 * POST /api/v1/paystack/topup
 * Initialize a wallet top-up transaction
 */
router.post('/topup', authenticate, paymentRateLimiter, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { amount, email } = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({
        success: false,
        error: 'Minimum top-up amount is KES 100',
      });
    }

    // Get user email
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    const userEmail = email || user?.email;
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email is required for payment',
      });
    }

    // Generate reference
    const reference = paystackService.generateReference('TOPUP');

    // Initialize Paystack transaction
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const result = await paystackService.initializeTransaction({
      email: userEmail,
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'KES',
      reference,
      callbackUrl: `${frontendUrl}/buyer?topup=success&reference=${reference}`,
      metadata: {
        type: 'WALLET_TOPUP',
        userId: req.user.userId,
        amount,
      },
    });

    res.json({
      success: true,
      data: {
        authorizationUrl: result.data.authorization_url,
        accessCode: result.data.access_code,
        reference: result.data.reference,
      },
    });
  } catch (error) {
    console.error('❌ Paystack topup initialization error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initialize top-up',
    });
  }
});

/**
 * GET /api/v1/paystack/verify/:reference
 * Verify a payment transaction
 */
router.get('/verify/:reference', optionalAuth, async (req, res) => {
  try {
    const { reference } = req.params;

    const result = await paystackService.verifyTransaction(reference);

    if (result && result.data.status === 'success') {
      const metadata = result.data.metadata as Record<string, unknown> | undefined;
      
      // Check if this is a top-up
      if (metadata?.type === 'WALLET_TOPUP') {
        const userId = metadata.userId as string;
        const amount = metadata.amount as number;

        // Credit wallet
        await prisma.$transaction(async (tx) => {
          await tx.wallet.upsert({
            where: { userId },
            create: {
              userId,
              availableBalance: amount,
              pendingBalance: 0,
              totalEarned: 0,
              totalSpent: 0,
            },
            update: {
              availableBalance: { increment: amount },
            },
          });

          // Create audit log
          await tx.auditLog.create({
            data: {
              userId,
              action: 'WALLET_TOPUP',
              entity: 'Wallet',
              entityId: userId,
              details: { amount, reference, paystackId: result.data.id },
              success: true,
            },
          });
        });

        // Emit notification
        io.to(`user:${userId}`).emit('notification:new', {
          id: `topup-${reference}`,
          type: 'WALLET_TOPUP',
          title: 'Top-up Successful! 💰',
          message: `KES ${amount.toLocaleString()} has been added to your wallet`,
          timestamp: new Date().toISOString(),
        });
      } else if (metadata?.transactionId) {
        // Regular transaction payment
        const transactionId = metadata.transactionId as string;
        
        const transaction = await prisma.transaction.findUnique({
          where: { id: transactionId },
          include: { seller: true },
        });

        if (transaction && transaction.status !== 'PAID') {
          const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5');
          const platformFee = (transaction.amount * platformFeePercent) / 100;
          const sellerPayout = transaction.amount - platformFee;

          await prisma.$transaction(async (tx) => {
            await tx.transaction.update({
              where: { id: transactionId },
              data: {
                status: 'PAID',
                paidAt: new Date(),
                platformFee,
                sellerPayout,
              },
            });

            // Add to seller's pending balance
            await tx.wallet.update({
              where: { userId: transaction.sellerId },
              data: {
                pendingBalance: { increment: transaction.amount },
              },
            });
          });

          // Notify seller
          io.to(`user:${transaction.sellerId}`).emit('notification:new', {
            id: `payment-${transactionId}`,
            type: 'PAYMENT_RECEIVED',
            title: 'Payment Received! 🎉',
            message: `KES ${transaction.amount.toLocaleString()} payment secured for "${transaction.itemName}". Ship the item now!`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    if (result) {
      res.json({
        success: true,
        data: {
          status: result.data.status,
          amount: result.data.amount / 100,
          reference: result.data.reference,
          paidAt: result.data.paid_at,
          channel: result.data.channel,
        },
      });
    } else {
      res.status(400).json({ success: false, error: 'Verification failed' });
    }
  } catch (error) {
    console.error('❌ Paystack verification error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify payment',
    });
  }
});

/**
 * POST /api/v1/paystack/webhook
 * Paystack webhook endpoint
 */
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    const payload = JSON.stringify(req.body);

    // Verify signature
    if (!paystackService.verifyWebhookSignature(payload, signature)) {
      console.warn('⚠️ Invalid Paystack webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { event, data } = req.body;

    console.log('📩 Paystack webhook received:', event);

    if (event === 'charge.success') {
      const reference = data.reference;
      const metadata = data.metadata;

      if (metadata?.type === 'WALLET_TOPUP') {
        const userId = metadata.userId;
        const amount = metadata.amount;

        await prisma.$transaction(async (tx) => {
          await tx.wallet.upsert({
            where: { userId },
            create: {
              userId,
              availableBalance: amount,
              pendingBalance: 0,
              totalEarned: 0,
              totalSpent: 0,
            },
            update: {
              availableBalance: { increment: amount },
            },
          });
        });

        io.to(`user:${userId}`).emit('notification:new', {
          id: `topup-${reference}`,
          type: 'WALLET_TOPUP',
          title: 'Top-up Successful! 💰',
          message: `KES ${amount.toLocaleString()} has been added to your wallet`,
          timestamp: new Date().toISOString(),
        });
      } else if (metadata?.transactionId) {
        const transactionId = metadata.transactionId;

        const transaction = await prisma.transaction.findUnique({
          where: { id: transactionId },
          include: { seller: true },
        });

        if (transaction && transaction.status !== 'PAID') {
          const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5');
          const platformFee = (transaction.amount * platformFeePercent) / 100;
          const sellerPayout = transaction.amount - platformFee;

          await prisma.$transaction(async (tx) => {
            await tx.transaction.update({
              where: { id: transactionId },
              data: {
                status: 'PAID',
                paidAt: new Date(),
                platformFee,
                sellerPayout,
              },
            });

            await tx.wallet.update({
              where: { userId: transaction.sellerId },
              data: {
                pendingBalance: { increment: transaction.amount },
              },
            });
          });

          io.to(`user:${transaction.sellerId}`).emit('notification:new', {
            id: `payment-${transactionId}`,
            type: 'PAYMENT_RECEIVED',
            title: 'Payment Received! 🎉',
            message: `KES ${transaction.amount.toLocaleString()} payment secured. Ship the item now!`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * GET /api/v1/paystack/banks
 * Get list of banks for transfers
 */
router.get('/banks', authenticate, async (req, res) => {
  try {
    const banks = await paystackService.getBanks('kenya');
    res.json({ success: true, data: banks });
  } catch (error) {
    console.error('❌ Get banks error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch banks',
    });
  }
});

export default router;
