import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { notifyItemShipped } from './notificationController';

/**
 * Get seller's orders
 */
export const getSellerOrders = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { sellerId: req.user.userId };
    if (status && status !== 'all') {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          buyer: {
            select: { id: true, name: true, phone: true, memberSince: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get seller orders error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders', code: 'SERVER_ERROR' });
  }
};

/**
 * Get order details
 */
export const getOrderDetails = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const { id } = req.params;

    const order = await prisma.transaction.findFirst({
      where: { id, sellerId: req.user.userId },
      include: {
        buyer: {
          select: { id: true, name: true, phone: true, memberSince: true },
        },
        dispute: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found', code: 'NOT_FOUND' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch order details', code: 'SERVER_ERROR' });
  }
};

/**
 * Accept order
 */
export const acceptOrder = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const { id } = req.params;

    const order = await prisma.transaction.findFirst({
      where: { id, sellerId: req.user.userId },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found', code: 'NOT_FOUND' });
    }

    if (order.status !== 'PAID') {
      return res.status(400).json({ success: false, error: 'Order cannot be accepted', code: 'INVALID_STATUS' });
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'ORDER_ACCEPTED',
        entity: 'Transaction',
        entityId: id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: true,
      },
    });

    res.json({ success: true, message: 'Order accepted', data: updated });
  } catch (error) {
    console.error('Accept order error:', error);
    res.status(500).json({ success: false, error: 'Failed to accept order', code: 'SERVER_ERROR' });
  }
};

/**
 * Reject order
 */
export const rejectOrder = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const { id } = req.params;
    const { reason } = req.body;

    const order = await prisma.transaction.findFirst({
      where: { id, sellerId: req.user.userId },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found', code: 'NOT_FOUND' });
    }

    if (order.status !== 'PAID') {
      return res.status(400).json({ success: false, error: 'Order cannot be rejected', code: 'INVALID_STATUS' });
    }

    // Reject and initiate refund
    const updated = await prisma.$transaction(async (tx) => {
      const rejected = await tx.transaction.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          rejectedAt: new Date(),
          rejectionReason: reason,
        },
      });

      // TODO: Initiate refund to buyer
      // This would integrate with payment provider

      return rejected;
    });

    res.json({ success: true, message: 'Order rejected', data: updated });
  } catch (error) {
    console.error('Reject order error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject order', code: 'SERVER_ERROR' });
  }
};

/**
 * Add shipping info
 */
export const addShippingInfo = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const { id } = req.params;
    const { courierName, trackingNumber, estimatedDeliveryDate, notes } = req.body;

    const order = await prisma.transaction.findFirst({
      where: { id, sellerId: req.user.userId },
    });

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found', code: 'NOT_FOUND' });
    }

    if (!['ACCEPTED', 'SHIPPED'].includes(order.status)) {
      return res.status(400).json({ success: false, error: 'Cannot add shipping info at this stage', code: 'INVALID_STATUS' });
    }

    const updated = await prisma.transaction.update({
      where: { id },
      data: {
        status: 'SHIPPED',
        shippedAt: new Date(),
        courierName,
        trackingNumber,
        estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : null,
        shippingNotes: notes,
      },
      include: { seller: true }
    });

    // Notify buyer about shipment
    await notifyItemShipped(updated);

    res.json({ success: true, message: 'Shipping info added', data: updated });
  } catch (error) {
    console.error('Add shipping info error:', error);
    res.status(500).json({ success: false, error: 'Failed to add shipping info', code: 'SERVER_ERROR' });
  }
};

/**
 * Get seller statistics
 */
export const getSellerStats = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const [
      totalOrders,
      completedOrders,
      pendingOrders,
      disputedOrders,
      wallet,
      sellerProfile,
    ] = await Promise.all([
      prisma.transaction.count({ where: { sellerId: req.user.userId } }),
      prisma.transaction.count({ where: { sellerId: req.user.userId, status: 'COMPLETED' } }),
      prisma.transaction.count({ where: { sellerId: req.user.userId, status: { in: ['PENDING', 'PAID', 'ACCEPTED', 'SHIPPED'] } } }),
      prisma.transaction.count({ where: { sellerId: req.user.userId, status: 'DISPUTED' } }),
      prisma.wallet.findUnique({ where: { userId: req.user.userId } }),
      prisma.sellerProfile.findUnique({ where: { userId: req.user.userId } }),
    ]);

    // Calculate rates
    const completionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
    const disputeRate = totalOrders > 0 ? Math.round((disputedOrders / totalOrders) * 100) : 0;

    res.json({
      success: true,
      data: {
        totalOrders,
        completedOrders,
        pendingOrders,
        disputedOrders,
        completionRate,
        disputeRate,
        wallet: wallet || { availableBalance: 0, pendingBalance: 0, totalEarned: 0 },
        profile: sellerProfile,
      },
    });
  } catch (error) {
    console.error('Get seller stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch statistics', code: 'SERVER_ERROR' });
  }
};
