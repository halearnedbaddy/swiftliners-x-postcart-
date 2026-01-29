import { Request, Response } from 'express';
import { prisma } from '../config/database';
import crypto from 'crypto';
import { paystackService } from '../services/paystackService';
import { notifyPaymentReceived } from './notificationController';
import { wsManager } from '../services/websocket';
import { exchangeRateService } from '../services/exchangeRateService';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Purchase via payment link (Public)
 */
export const purchaseViaLink = async (req: Request, res: Response) => {
  try {
    const { linkId } = req.params;
    const {
      buyerPhone,
      buyerEmail,
      deliveryAddress,
      paymentMethod,
      paymentReference,
      buyerCurrency = 'KES',
      quantity = 1
    } = req.body;

    // 1. Validate link
    const paymentLink = await prisma.paymentLink.findUnique({
      where: { id: linkId },
      include: { seller: true }
    });

    if (!paymentLink) {
      return res.status(404).json({ success: false, error: 'Payment link not found', code: 'NOT_FOUND' });
    }

    if (paymentLink.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: `Link is ${paymentLink.status.toLowerCase()}`, code: 'INVALID_STATUS' });
    }

    if (paymentLink.expiryDate && new Date() > paymentLink.expiryDate) {
      return res.status(400).json({ success: false, error: 'Link has expired', code: 'EXPIRED' });
    }

    if (paymentLink.quantity < quantity) {
      return res.status(400).json({ success: false, error: 'Insufficient quantity available', code: 'OUT_OF_STOCK' });
    }

    // 2. Multi-currency calculations
    const sellerCurrency = paymentLink.currency;
    const sellerPrice = Number(paymentLink.price);
    
    // Get exchange rate for buyer
    const rateToBuyer = await exchangeRateService.getRate(sellerCurrency, buyerCurrency);
    const buyerAmount = sellerPrice * quantity * rateToBuyer;
    
    // Get exchange rate for base USD
    const rateToUSD = await exchangeRateService.getRate(sellerCurrency, 'USD');
    const baseAmountUSD = sellerPrice * quantity * rateToUSD;

    // 3. Verify payment if reference provided
    let isPaid = false;
    if (paymentReference && paymentMethod === 'PAYSTACK') {
      const verification = await paystackService.verifyTransaction(paymentReference);
      if (verification && verification.status && verification.data.status === 'success') {
        const paidAmount = verification.data.amount / 100;
        // Verify paid amount in buyer's currency
        if (paidAmount >= buyerAmount) {
          isPaid = true;
        }
      }
    }

    if (!isPaid && paymentReference) {
      return res.status(400).json({ success: false, error: 'Payment verification failed', code: 'PAYMENT_FAILED' });
    }

    // 4. Create Order (Transaction)
    const transactionId = `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    
    const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5');
    const totalSellerAmount = sellerPrice * quantity;
    const platformFee = (totalSellerAmount * platformFeePercent) / 100;
    const sellerPayout = totalSellerAmount - platformFee;

    const transaction = await prisma.$transaction(async (tx) => {
      // Create the transaction
      const newTx = await tx.transaction.create({
        data: {
          id: transactionId,
          sellerId: paymentLink.sellerId,
          paymentLinkId: paymentLink.id,
          itemName: paymentLink.productName,
          itemDescription: paymentLink.productDescription,
          itemImages: paymentLink.images,
          amount: totalSellerAmount, // Legacy field
          quantity,
          currency: sellerCurrency, // Legacy field
          
          // Multi-currency fields
          buyerCurrency,
          buyerAmount: new Decimal(buyerAmount),
          baseAmountUSD: new Decimal(baseAmountUSD),
          sellerCurrency,
          sellerAmount: new Decimal(totalSellerAmount),
          exchangeRate: new Decimal(rateToBuyer),
          exchangeRateTimestamp: new Date(),

          buyerPhone,
          buyerEmail,
          buyerName: buyerEmail?.split('@')[0] || 'Guest Buyer',
          buyerAddress: typeof deliveryAddress === 'string' ? deliveryAddress : JSON.stringify(deliveryAddress),
          paymentMethod,
          paymentReference,
          status: isPaid ? 'PAID' : 'PENDING',
          paidAt: isPaid ? new Date() : null,
          platformFee: isPaid ? platformFee : null,
          sellerPayout: isPaid ? sellerPayout : null,
        }
      });

      // Update link stats
      await tx.paymentLink.update({
        where: { id: linkId },
        data: {
          purchases: { increment: isPaid ? 1 : 0 },
          revenue: { increment: isPaid ? totalSellerAmount : 0 },
          quantity: { decrement: isPaid ? quantity : 0 },
          status: (paymentLink.quantity - quantity <= 0) && isPaid ? 'SOLD_OUT' : 'ACTIVE'
        }
      });

      // If paid, update seller wallet
      if (isPaid) {
        await tx.wallet.update({
          where: { userId: paymentLink.sellerId },
          data: {
            pendingBalance: { increment: sellerPayout }
          }
        });
      }

      return newTx;
    });

    // 5. Notifications
    if (isPaid) {
      await notifyPaymentReceived(transaction);
      
      wsManager.notifyAdmins({
        type: 'PAYMENT_RECEIVED',
        title: 'New Link Purchase',
        message: `KES ${totalSellerAmount.toLocaleString()} received for ${paymentLink.productName}`,
        data: { transactionId, amount: totalSellerAmount },
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      data: transaction
    });

  } catch (error) {
    console.error('Purchase via link error:', error);
    res.status(500).json({ success: false, error: 'Failed to process purchase', code: 'SERVER_ERROR' });
  }
};
