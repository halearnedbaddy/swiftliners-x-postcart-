import { Request, Response } from 'express';
import { prisma } from '../config/database';

/**
 * Get user's notifications
 */
export const getNotifications = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { userId: req.user.userId };
    if (unreadOnly === 'true') {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: req.user.userId, isRead: false } }),
    ]);

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications', code: 'SERVER_ERROR' });
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const { id } = req.params;

    const notification = await prisma.notification.findFirst({
      where: { id, userId: req.user.userId },
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found', code: 'NOT_FOUND' });
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to update notification', code: 'SERVER_ERROR' });
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    await prisma.notification.updateMany({
      where: { userId: req.user.userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ success: false, error: 'Failed to update notifications', code: 'SERVER_ERROR' });
  }
};

/**
 * Create notification (internal use)
 */
import { socketService } from '../services/socketService';
import { sendSMS } from '../services/smsService';

/**
 * Create notification (internal use)
 */
export const createNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  data?: any
) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: type as any,
        title,
        message,
        data,
      },
    });

    // Send real-time update via Socket.IO
    socketService.emitToUser(userId, 'notification', notification);

    // Fetch user to get phone for SMS
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    if (user?.phone) {
      // Use concise SMS for specific types
      let smsMessage = message;
      if (type === 'PAYMENT_RECEIVED') {
        smsMessage = `NEW ORDER! 🎉\nOrder #${data?.transactionId?.slice(-8).toUpperCase()}\nAmount: ${formatCurrency(data?.netPayout || 0)} (in escrow)\n\nShip within 24hrs: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/seller`;
      }
      await sendSMS(user.phone, smsMessage);
    }

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
    return null;
  }
};

// Helper for currency formatting
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper for date formatting
const formatDate = (date: Date = new Date()) => {
  return date.toLocaleString('en-KE', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }) + ' EAT';
};

/**
 * Notify seller about payment received (funds secured)
 * Template: 2. SELLER PAYMENT NOTIFICATION
 */
export const notifyPaymentReceived = async (transaction: any) => {
  const platformFee = transaction.platformFee || transaction.amount * 0.05;
  const netPayout = transaction.sellerPayout || transaction.amount - platformFee;

  const message = `SWIFTLINE PAYMENT NOTIFICATION

Dear ${transaction.seller.name},

A new order has been placed! 🎉

Transaction ID: ${transaction.id}
Date & Time: ${formatDate()}
Buyer: ${transaction.buyerName || 'Guest'}
Product: ${transaction.itemName}
Quantity: ${transaction.quantity}

PAYMENT BREAKDOWN:
Gross Amount: ${formatCurrency(transaction.amount)}
Platform Fee (5%): -${formatCurrency(platformFee)}
Your Net Payout: ${formatCurrency(netPayout)}

ESCROW STATUS:
Amount Held: ${formatCurrency(transaction.amount)}
Status: HELD IN ESCROW 🔒
Release: After delivery confirmation
Auto-release: 7 days after shipping

ACTION REQUIRED:
⏰ Please confirm shipment within 24 hours.

Funds will be released to your wallet after:
✓ Delivery confirmation by buyer
✓ Or automatic release in 7 days`;

  return createNotification(
    transaction.sellerId,
    'PAYMENT_RECEIVED',
    'Payment Received! 💰',
    message,
    {
      transactionId: transaction.id,
      amount: transaction.amount,
      netPayout
    }
  );
};

/**
 * Notify buyer about purchase confirmation
 * Template: 1. PURCHASE CONFIRMATION MESSAGE
 */
export const notifyPurchaseConfirmation = async (transaction: any) => {
  if (!transaction.buyerEmail && !transaction.buyerId) return null; // Can't notify if no contact info

  // Note: For guest buyers, we might email. For registered, we create notification.
    if (transaction.buyerId) {
    const message = `PayLoom Order Confirmed!
Order #${transaction.id.slice(-8).toUpperCase()}
${transaction.itemName} - ${formatCurrency(transaction.amount)}
Seller: ${transaction.seller.name}

Your payment is secured. We'll notify you when shipped.

Track: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/track/${transaction.id}`;

    return createNotification(
      transaction.buyerId,
      'PURCHASE_CONFIRMED',
      'Purchase Confirmed ✓',
      message,
      { transactionId: transaction.id }
    );
  }
};


/**
 * Notify buyer about order accepted (Optional - simplified)
 */
export const notifyOrderAccepted = async (transaction: any) => {
  if (!transaction.buyerId) return null;
  return createNotification(
    transaction.buyerId,
    'ORDER_ACCEPTED',
    'Order Accepted ✓',
    `Seller has accepted your order for "${transaction.itemName}". Shipping soon.`,
    { transactionId: transaction.id }
  );
};

/**
 * Notify buyer about shipment
 * Template: 3. SHIPMENT CONFIRMATION
 */
export const notifyItemShipped = async (transaction: any) => {
  if (!transaction.buyerId) return null;

  const message = `Your order #${transaction.id.slice(-8).toUpperCase()} has been shipped! 
Courier: ${transaction.courierName || 'Fargo Courier'}
Tracking: ${transaction.trackingNumber || 'N/A'}
Est. Delivery: ${transaction.estimatedDeliveryDate ? new Date(transaction.estimatedDeliveryDate).toLocaleDateString() : 'N/A'}
Track: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/track/${transaction.id}`;

  return createNotification(
    transaction.buyerId,
    'ITEM_SHIPPED',
    'Item Shipped 📦',
    message,
    { transactionId: transaction.id, trackingNumber: transaction.trackingNumber }
  );
};

/**
 * Notify seller about delivery confirmation & fund release
 * Template: 6. DELIVERY CONFIRMATION & FUND RELEASE
 */
export const notifyDeliveryConfirmed = async (transaction: any) => {
  const sellerPayout = transaction.sellerPayout || transaction.amount * 0.95;

  const message = `SWIFTLINE DELIVERY CONFIRMED ✓

Dear ${transaction.seller.name},

Good news! Payment has been released. 🎉

Transaction ID: ${transaction.id}
Release Time: ${formatDate()}
Product: ${transaction.itemName}

PAYMENT DETAILS:
Amount Released: ${formatCurrency(sellerPayout)}
Released to: Wallet Balance

Transaction Details:
Delivery Confirmed by: ${transaction.buyerName || 'Buyer'}
Confirmed on: ${formatDate()}
Days in Escrow: ${Math.ceil((new Date().getTime() - new Date(transaction.paidAt).getTime()) / (1000 * 3600 * 24))} days

Withdraw funds anytime from your wallet.`;

  return createNotification(
    transaction.sellerId,
    'DELIVERY_CONFIRMED',
    'Funds Released! 💰',
    message,
    { transactionId: transaction.id, amount: sellerPayout }
  );
};

/**
 * Notify about dispute opened
 * Templates: 8 & 9
 */
export const notifyDisputeOpened = async (transaction: any, dispute: any) => {
  // Notify seller (Template 8)
  const sellerMessage = `SWIFTLINE DISPUTE ALERT ⚠️

Dear ${transaction.seller.name},

A dispute has been opened for transaction ${transaction.id}

Dispute ID: ${dispute.id}
Opened: ${formatDate()}
Amount in Dispute: ${formatCurrency(transaction.amount)}

DISPUTE REASON:
${dispute.reason}

FUNDS STATUS: HELD IN ESCROW
Payment release is on hold pending resolution.

ACTION REQUIRED:
⏰ Please respond within 48 hours to avoid losing the dispute.`;

  await createNotification(
    transaction.sellerId,
    'DISPUTE_OPENED',
    'Dispute Opened ⚠️',
    sellerMessage,
    { transactionId: transaction.id, disputeId: dispute.id }
  );

  // Notify buyer if registered (Template 9)
  if (transaction.buyerId) {
    const buyerMessage = `SWIFTLINE DISPUTE OPENED

Dear ${transaction.buyerName || 'Customer'},

Your dispute has been registered.

Dispute ID: ${dispute.id}
Opened: ${formatDate()}
Transaction ID: ${transaction.id}
Product: ${transaction.itemName}

YOUR COMPLAINT:
${dispute.reason}

NEXT STEPS:
1. We've notified the seller
2. Seller has 48 hours to respond
3. We will review all evidence

FUNDS PROTECTED:
Your payment of ${formatCurrency(transaction.amount)} is held securely in escrow.`;

    await createNotification(
      transaction.buyerId,
      'DISPUTE_OPENED',
      'Dispute Submitted',
      buyerMessage,
      { transactionId: transaction.id, disputeId: dispute.id }
    );
  }
};

