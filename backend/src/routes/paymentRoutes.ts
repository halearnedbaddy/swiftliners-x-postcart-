import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import { mpesaService } from '../services/mpesaService';
import { sendSMS } from '../services/smsService';
import { prisma } from '../config/database';
import { io } from '../index';

const router = Router();

/**
 * POST /api/v1/payments/initiate-stk
 * Initiate STK Push for buyer payment
 */
router.post('/initiate-stk', optionalAuth, async (req, res) => {
  try {
    const { transactionId, phoneNumber, amount, buyerName } = req.body;

    if (!transactionId || !phoneNumber || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: transactionId, phoneNumber, amount',
      });
    }

    // Get transaction details
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { seller: true, buyer: true },
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
    const stkResponse = await mpesaService.initiateSTKPush(
      phoneNumber,
      amount,
      transactionId,
      buyerName || req.user?.phone || 'Customer'
    );

    // Store checkout request ID and update status
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        paymentReference: stkResponse.CheckoutRequestID,
        status: 'PROCESSING',
        buyerPhone: phoneNumber,
      },
    });

    res.json({
      success: true,
      data: {
        checkoutRequestID: stkResponse.CheckoutRequestID,
        merchantRequestID: stkResponse.MerchantRequestID,
        message: stkResponse.CustomerMessage,
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
 * POST /api/v1/payments/mpesa-callback
 * M-Pesa Daraja callback webhook
 */
router.post('/mpesa-callback', async (req, res) => {
  try {
    const { Body } = req.body;

    if (!Body?.stkCallback) {
      console.warn('⚠️  Invalid callback format');
      return res.json({ ResultCode: 1 });
    }

    const { ResultCode, CheckoutRequestID, CallbackMetadata } = Body.stkCallback;

    // Find transaction by checkout request ID (stored in paymentReference)
    const transaction = await prisma.transaction.findFirst({
      where: { paymentReference: CheckoutRequestID },
      include: { buyer: true, seller: true },
    });

    if (!transaction) {
      console.error('❌ Transaction not found for callback:', CheckoutRequestID);
      return res.json({ ResultCode: 1 });
    }

    if (ResultCode === 0) {
      // Payment successful
      const mpesaCode = CallbackMetadata?.Item?.find((item: { Name: string }) => item.Name === 'MpesaReceiptNumber')?.Value;
      const paidAmount = CallbackMetadata?.Item?.find((item: { Name: string }) => item.Name === 'Amount')?.Value;

      // Calculate fees
      const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5');
      const platformFee = (transaction.amount * platformFeePercent) / 100;
      const sellerPayout = transaction.amount - platformFee;

      // Update transaction status
      await prisma.$transaction(async (tx) => {
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'PAID',
            paymentReference: mpesaCode || CheckoutRequestID,
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

      // Send SMS to seller - funds secured
      if (transaction.seller?.phone) {
        await sendSMS(
          transaction.seller.phone,
          `SWIFTLINE: KES ${paidAmount || transaction.amount} payment secured for "${transaction.itemName}". Ship the item now!`
        );
      }

      // Emit WebSocket notification
      io.to(`user:${transaction.sellerId}`).emit('notification:new', {
        id: `payment-${transaction.id}`,
        type: 'PAYMENT_RECEIVED',
        title: 'Payment Received! 🎉',
        message: `KES ${paidAmount || transaction.amount} payment secured for order. Ready to ship!`,
        timestamp: new Date().toISOString(),
      });

      console.log('✅ Payment confirmed for transaction:', transaction.id);
    } else {
      // Payment failed
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'CANCELLED' },
      });

      console.log('❌ Payment failed for transaction:', transaction.id);
    }

    res.json({ ResultCode: 0 });
  } catch (error) {
    console.error('❌ Callback processing error:', error);
    res.json({ ResultCode: 1 });
  }
});

/**
 * POST /api/v1/payments/confirm-delivery
 * Confirm delivery and release funds to seller
 */
router.post('/confirm-delivery', authenticate, async (req, res) => {
  try {
    const { transactionId, deliveryOTP } = req.body;

    if (!transactionId || !deliveryOTP) {
      return res.status(400).json({
        success: false,
        error: 'Missing transactionId or deliveryOTP',
      });
    }

    // Get transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { buyer: true, seller: true },
    });

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    // Verify OTP (in production, verify against stored OTP)
    if (deliveryOTP !== '1234') {
      return res.status(401).json({ success: false, error: 'Invalid OTP' });
    }

    // Calculate fees
    const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5');
    const platformFee = (transaction.amount * platformFeePercent) / 100;
    const sellerPayout = transaction.amount - platformFee;

    // Complete transaction and release funds
    await prisma.$transaction(async (tx) => {
      // Update transaction
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          platformFee,
          sellerPayout,
        },
      });

      // Credit seller's wallet
      await tx.wallet.update({
        where: { userId: transaction.sellerId },
        data: {
          availableBalance: { increment: sellerPayout },
          pendingBalance: { decrement: transaction.amount },
          totalEarned: { increment: sellerPayout },
        },
      });

      // Create payout record
      await tx.payout.create({
        data: {
          transactionId,
          sellerId: transaction.sellerId,
          amount: sellerPayout,
          platformFee,
          status: 'COMPLETED',
        },
      });
    });

    // Send SMS to seller - funds released
    if (transaction.seller?.phone) {
      await sendSMS(
        transaction.seller.phone,
        `SWIFTLINE: KES ${sellerPayout.toLocaleString()} has been released to your wallet for "${transaction.itemName}". Withdraw anytime!`
      );
    }

    // Emit WebSocket notification
    io.to(`user:${transaction.sellerId}`).emit('notification:new', {
      id: `completed-${transaction.id}`,
      type: 'DELIVERY_CONFIRMED',
      title: 'Payment Released! 💰',
      message: `KES ${sellerPayout.toLocaleString()} has been added to your wallet`,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Delivery confirmed. Funds released to seller.',
      data: { 
        status: 'COMPLETED',
        sellerPayout,
        platformFee,
      },
    });
  } catch (error) {
    console.error('❌ Delivery confirmation error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to confirm delivery',
    });
  }
});

/**
 * POST /api/v1/payments/check-status
 * Check payment status
 */
router.post('/check-status', optionalAuth, async (req, res) => {
  try {
    const { transactionId } = req.body;

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    res.json({
      success: true,
      data: {
        status: transaction.status,
        amount: transaction.amount,
        paidAt: transaction.paidAt,
        createdAt: transaction.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to check payment status' });
  }
});

/**
 * POST /api/v1/payments/simulate-payment
 * Simulate payment confirmation (for demo/testing)
 */
router.post('/simulate-payment', async (req, res) => {
  try {
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ success: false, error: 'Missing transactionId' });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { seller: true },
    });

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    if (!['PENDING', 'PROCESSING'].includes(transaction.status)) {
      return res.status(400).json({ success: false, error: 'Transaction cannot be confirmed' });
    }

    // Calculate fees
    const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5');
    const platformFee = (transaction.amount * platformFeePercent) / 100;
    const sellerPayout = transaction.amount - platformFee;

    // Update transaction to PAID (funds now in escrow)
    await prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paymentReference: `SIM-${Date.now()}`,
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

    // Notify seller
    io.to(`user:${transaction.sellerId}`).emit('notification:new', {
      id: `payment-${transaction.id}`,
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Received! 🎉',
      message: `KES ${transaction.amount.toLocaleString()} payment secured for "${transaction.itemName}". Ship the item now!`,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Payment simulated. Funds are now in escrow.',
      data: {
        transactionId,
        status: 'PAID',
        escrowedAmount: transaction.amount,
        sellerPayout,
        platformFee,
      },
    });
  } catch (error) {
    console.error('Simulate payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to simulate payment' });
  }
});

export default router;
