import { prisma } from '../config/database';
import { wsManager } from './websocket';
import { createNotification } from '../controllers/notificationController';

/**
 * Send reminders for orders shipped 5 days ago
 */
export async function sendEscrowReminders() {
  const fiveDaysAgo = new Date();
  fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
  const sixDaysAgo = new Date();
  sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

  try {
    const pendingOrders = await prisma.transaction.findMany({
      where: {
        status: 'SHIPPED',
        shippedAt: {
          lte: fiveDaysAgo,
          gt: sixDaysAgo
        },
        buyerId: { not: null }
      },
      include: { seller: true }
    });

    for (const order of pendingOrders) {
      const message = `PayLoom Reminder 📦

Order #${order.id.slice(-8).toUpperCase()}
${order.itemName}

Have you received your order?

✅ Confirm delivery: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/track/${order.id}
⚠️ Report issue: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/track/${order.id}

Payment will auto-release in 2 days if no action taken.`;

      await createNotification(
        order.buyerId!,
        'REMINDER',
        'Order Reminder 📦',
        message,
        { transactionId: order.id }
      );
    }
  } catch (error) {
    console.error('[Escrow] Reminder error:', error);
  }
}

/**
 * Auto-release escrow funds for orders shipped more than 7 days ago
 */
export async function autoReleaseEscrow() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  try {
    // Find orders that are SHIPPED and were shipped more than 7 days ago
    const eligibleOrders = await prisma.transaction.findMany({
      where: {
        status: 'SHIPPED',
        shippedAt: {
          lte: sevenDaysAgo
        }
      }
    });

    console.log(`[Escrow] Found ${eligibleOrders.length} orders eligible for auto-release`);

    for (const order of eligibleOrders) {
      await prisma.$transaction(async (tx) => {
        // 1. Update order status
        await tx.transaction.update({
          where: { id: order.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          }
        });

        // 2. Calculate payout (should already be calculated at PAID stage, but fallback)
        const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT || '5');
        const platformFee = order.platformFee || (order.amount * platformFeePercent) / 100;
        const sellerPayout = order.sellerPayout || (order.amount - platformFee);

        // 3. Move funds from pending to available
        await tx.wallet.update({
          where: { userId: order.sellerId },
          data: {
            availableBalance: { increment: sellerPayout },
            pendingBalance: { decrement: sellerPayout },
            totalEarned: { increment: sellerPayout }
          }
        });

        // 4. Create payout record
        await tx.payout.create({
          data: {
            transactionId: order.id,
            sellerId: order.sellerId,
            amount: sellerPayout,
            platformFee,
            status: 'COMPLETED',
          }
        });

        console.log(`[Escrow] Auto-released funds for order ${order.id}`);
      });

      // Notify seller (optional real-time)
      wsManager.sendToUser(order.sellerId, {
        type: 'PAYMENT_RELEASED',
        title: 'Payment Auto-Released',
        message: `Funds for order ${order.id} have been released after 7 days.`,
        data: { orderId: order.id },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('[Escrow] Auto-release error:', error);
  }
}

let autoReleaseInterval: NodeJS.Timeout | null = null;

export function startEscrowScheduler() {
  // Run once on start
  autoReleaseEscrow();
  sendEscrowReminders();

  // Run every 24 hours
  const intervalMs = 24 * 60 * 60 * 1000;
  if (autoReleaseInterval) return;

  autoReleaseInterval = setInterval(() => {
    autoReleaseEscrow();
    sendEscrowReminders();
  }, intervalMs);
  console.log(`🕒 Escrow auto-release scheduler started (interval: 24h)`);
}
