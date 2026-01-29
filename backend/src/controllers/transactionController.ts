import { Request, Response } from 'express';
import { prisma } from '../config/database';
import crypto from 'crypto';
import {
  notifyPaymentReceived,
  notifyOrderAccepted,
  notifyItemShipped,
  notifyDeliveryConfirmed,
  notifyDisputeOpened,
} from './notificationController';
import { wsManager } from '../services/websocket';
import { paystackService } from '../services/paystackService';

/**
 * Create a new transaction (payment link)
 */
export const createTransaction = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const { itemName, amount, description, quantity = 1, imageUrl, images } = req.body;

    // Validate required fields
    if (!itemName || typeof itemName !== 'string' || itemName.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Item name is required', code: 'VALIDATION_ERROR' });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid amount is required', code: 'VALIDATION_ERROR' });
    }

    // Process item images - store as array (support both single imageUrl and multiple images)
    const itemImages: string[] = [];
    
    // Handle multiple images array
    if (images && Array.isArray(images)) {
      for (const img of images) {
        if (typeof img === 'string' && img.length > 0) {
          if (img.startsWith('data:image/') || img.startsWith('http://') || img.startsWith('https://')) {
            itemImages.push(img);
          }
        }
      }
    }
    
    // Fallback to single imageUrl for backward compatibility
    if (itemImages.length === 0 && imageUrl && typeof imageUrl === 'string' && imageUrl.length > 0) {
      if (imageUrl.startsWith('data:image/') || imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        itemImages.push(imageUrl);
      }
    }

    // Limit to 5 images max
    const finalImages = itemImages.slice(0, 5);

    // Generate unique transaction ID
    const transactionId = `TXN-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const transaction = await prisma.transaction.create({
      data: {
        id: transactionId,
        sellerId: req.user.userId,
        itemName: itemName.trim(),
        itemDescription: description?.trim() || null,
        itemImages: finalImages,
        amount,
        quantity,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      include: {
        seller: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'TRANSACTION_CREATED',
        entity: 'Transaction',
        entityId: transaction.id,
        details: { itemName, amount, imageCount: finalImages.length },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true,
      },
    });

    // Notify admins in real-time
    wsManager.notifyAdmins({
      type: 'TRANSACTION_CREATED',
      title: 'New Transaction Created',
      message: `${transaction.seller.name} created a payment link for ${itemName} (KES ${amount.toLocaleString()})`,
      data: {
        type: 'TRANSACTION_CREATED',
        transactionId: transaction.id,
        itemName,
        amount,
        sellerName: transaction.seller.name,
      },
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      data: {
        ...transaction,
        paymentLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/${transaction.id}`,
      },
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ success: false, error: 'Failed to create transaction', code: 'SERVER_ERROR' });
  }
};

/**
 * Get transaction details
 */
export const getTransaction = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            profilePicture: true,
            sellerProfile: {
              select: { businessName: true, isVerified: true, rating: true },
            },
          },
        },
        buyer: {
          select: { id: true, name: true },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found', code: 'NOT_FOUND' });
    }

    // Check if expired
    if (transaction.expiresAt && new Date() > transaction.expiresAt && transaction.status === 'PENDING') {
      await prisma.transaction.update({
        where: { id },
        data: { status: 'EXPIRED' },
      });
      transaction.status = 'EXPIRED';
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transaction', code: 'SERVER_ERROR' });
  }
};

/**
 * Get user's transactions
 */
export const getUserTransactions = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const { role = 'all', status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};

    if (role === 'buyer') {
      where.buyerId = req.user.userId;
    } else if (role === 'seller') {
      where.sellerId = req.user.userId;
    } else {
      where.OR = [{ buyerId: req.user.userId }, { sellerId: req.user.userId }];
    }

    if (status) {
      where.status = status;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          seller: { select: { id: true, name: true } },
          buyer: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions', code: 'SERVER_ERROR' });
  }
};

/**
 * Initiate payment (buyer pays)
 */
export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentMethod, phone, buyerName, buyerEmail, buyerAddress } = req.body;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { seller: true },
    });

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found', code: 'NOT_FOUND' });
    }

    if (transaction.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'Transaction is not available for payment', code: 'INVALID_STATUS' });
    }

    if (transaction.expiresAt && new Date() > transaction.expiresAt) {
      return res.status(400).json({ success: false, error: 'Transaction has expired', code: 'EXPIRED' });
    }

    // Update transaction with buyer info
    const updatedTransaction = await prisma.transaction.update({
      where: { id },
      data: {
        buyerPhone: phone,
        buyerName,
        buyerEmail,
        buyerAddress,
        paymentMethod,
        status: 'PROCESSING',
      },
    });

    // TODO: Integrate with actual M-Pesa STK Push
    // For demo, we simulate immediate payment success
    // In production, this would be a webhook callback

    res.json({
      success: true,
      message: 'Payment initiated. Please complete on your phone.',
      data: {
        transactionId: updatedTransaction.id,
        status: 'PROCESSING',
        paymentMethod,
        checkoutRequestId: `CRQ-${Date.now()}`,
        // For demo: provide a URL to simulate payment confirmation
        simulatePaymentUrl: `/api/v1/transactions/${id}/simulate-payment`,
      },
    });
  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate payment', code: 'SERVER_ERROR' });
  }
};

/**
 * Simulate/Confirm payment (for demo - would be M-Pesa callback in production)
 */
export const confirmPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentReference } = req.body;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { seller: true },
    });

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found', code: 'NOT_FOUND' });
    }

    if (!['PENDING', 'PROCESSING'].includes(transaction.status)) {
      return res.status(400).json({ success: false, error: 'Transaction cannot be confirmed', code: 'INVALID_STATUS' });
    }

    // Calculate fees
    const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5');
    const platformFee = (transaction.amount * platformFeePercent) / 100;
    const sellerPayout = transaction.amount - platformFee;

    // Update transaction to PAID (funds now in escrow)
    const updatedTransaction = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paymentReference: paymentReference || `SIM-${Date.now()}`,
          platformFee,
          sellerPayout,
        },
      });

      // Add to seller's pending balance (escrow)
      await tx.wallet.update({
        where: { userId: transaction.sellerId },
        data: {
          pendingBalance: { increment: sellerPayout },
        },
      });

      return updated;
    });

    // Notify seller that funds are secured
    await notifyPaymentReceived(updatedTransaction);

    // Notify admins of payment received
    wsManager.notifyAdmins({
      type: 'PAYMENT_RECEIVED',
      title: 'Payment Received',
      message: `Payment of KES ${transaction.amount.toLocaleString()} received for transaction ${id}`,
      data: {
        type: 'PAYMENT_RECEIVED',
        transactionId: id,
        amount: transaction.amount,
        itemName: transaction.itemName,
      },
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Payment confirmed. Funds are now in escrow.',
      data: {
        transactionId: updatedTransaction.id,
        status: 'PAID',
        escrowedAmount: transaction.amount,
        sellerPayout,
        platformFee,
      },
    });
  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({ success: false, error: 'Failed to confirm payment', code: 'SERVER_ERROR' });
  }
};

/**
 * Confirm delivery (buyer confirms receipt)
 */
export const confirmDelivery = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const { id } = req.params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { seller: true },
    });

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found', code: 'NOT_FOUND' });
    }

    // Only buyer can confirm
    if (transaction.buyerId !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Only buyer can confirm delivery', code: 'FORBIDDEN' });
    }

    if (!['SHIPPED', 'DELIVERED'].includes(transaction.status)) {
      return res.status(400).json({ success: false, error: 'Transaction cannot be confirmed at this stage', code: 'INVALID_STATUS' });
    }

    // Complete transaction and release funds
    const result = await prisma.$transaction(async (tx) => {
      // Update transaction
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Calculate seller payout (minus platform fee)
      const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5');
      const platformFee = (transaction.amount * platformFeePercent) / 100;
      const sellerPayout = transaction.amount - platformFee;

      // Credit seller's wallet
      await tx.wallet.update({
        where: { userId: transaction.sellerId },
        data: {
          availableBalance: { increment: sellerPayout },
          pendingBalance: { decrement: sellerPayout },
          totalEarned: { increment: sellerPayout },
        },
      });

      // Create payout record
      await tx.payout.create({
        data: {
          transactionId: id,
          sellerId: transaction.sellerId,
          amount: sellerPayout,
          platformFee,
          status: 'COMPLETED',
        },
      });

      return updated;
    });

    res.json({
      success: true,
      message: 'Delivery confirmed. Funds released to seller.',
      data: { status: result.status },
    });
  } catch (error) {
    console.error('Confirm delivery error:', error);
    res.status(500).json({ success: false, error: 'Failed to confirm delivery', code: 'SERVER_ERROR' });
  }
};

/**
 * Open dispute
 */
export const openDispute = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const { id } = req.params;
    const { reason, description, evidence } = req.body;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found', code: 'NOT_FOUND' });
    }

    // Only buyer can open dispute
    if (transaction.buyerId !== req.user.userId) {
      return res.status(403).json({ success: false, error: 'Only buyer can open dispute', code: 'FORBIDDEN' });
    }

    if (!['PAID', 'SHIPPED', 'DELIVERED'].includes(transaction.status)) {
      return res.status(400).json({ success: false, error: 'Cannot open dispute at this stage', code: 'INVALID_STATUS' });
    }

    // Create dispute
    const dispute = await prisma.$transaction(async (tx) => {
      const newDispute = await tx.dispute.create({
        data: {
          transactionId: id,
          openedById: req.user!.userId,
          reason,
          description,
          evidence: evidence || [],
          status: 'OPEN',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Update transaction status
      await tx.transaction.update({
        where: { id },
        data: { status: 'DISPUTED' },
      });

      return newDispute;
    });

    // Notify admins of new dispute (HIGH PRIORITY)
    wsManager.notifyAdmins({
      type: 'DISPUTE_OPENED',
      title: 'New Dispute Opened',
      message: `Dispute opened for transaction ${id}: ${reason}. Amount at risk: KES ${transaction.amount.toLocaleString()}`,
      data: {
        type: 'DISPUTE_OPENED',
        disputeId: dispute.id,
        transactionId: id,
        reason,
        amount: transaction.amount,
      },
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: 'Dispute opened successfully',
      data: dispute,
    });
  } catch (error) {
    console.error('Open dispute error:', error);
    res.status(500).json({ success: false, error: 'Failed to open dispute', code: 'SERVER_ERROR' });
  }
};

/**
 * Verify Paystack Payment
 */
export const verifyPaystackPayment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ success: false, error: 'Payment reference required' });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { seller: true },
    });

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    // If already paid, just return success
    if (transaction.status === 'PAID' || transaction.status === 'PROCESSING') {
      // Ideally processing should be verified, but if already PAID return success
      if (transaction.status === 'PAID') {
        return res.json({ success: true, message: 'Transaction already paid' });
      }
    }

    // Verify with Paystack
    const verification = await paystackService.verifyTransaction(reference);

    if (!verification || !verification.status || verification.data.status !== 'success') {
      return res.status(400).json({ success: false, error: 'Payment verification failed' });
    }

    // Verify amount matches (Paystack amount is in kobo/cents)
    const paidAmount = verification.data.amount / 100;
    if (paidAmount < transaction.amount) {
      return res.status(400).json({ success: false, error: 'Paid amount is less than transaction amount' });
    }

    // Update Transaction to PAID
    // Calculate fees
    const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5');
    const platformFee = (transaction.amount * platformFeePercent) / 100;
    const sellerPayout = transaction.amount - platformFee;

    const updatedTransaction = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          paymentReference: reference,
          platformFee,
          sellerPayout,
          paymentMethod: 'PAYSTACK'
        },
      });

      // Add to seller's pending balance (escrow)
      await tx.wallet.update({
        where: { userId: transaction.sellerId },
        data: {
          pendingBalance: { increment: sellerPayout },
        },
      });

      return updated;
    });

    // Notify seller
    await notifyPaymentReceived(updatedTransaction);

    // Notify admins
    wsManager.notifyAdmins({
      type: 'PAYMENT_RECEIVED',
      title: 'Paystack Payment Received',
      message: `Payment of KES ${transaction.amount.toLocaleString()} received via Paystack`,
      data: {
        type: 'PAYMENT_RECEIVED',
        transactionId: id,
        amount: transaction.amount,
        reference
      },
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Payment verified successfully' });

  } catch (error) {
    console.error('Verify Paystack payment error:', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
};
