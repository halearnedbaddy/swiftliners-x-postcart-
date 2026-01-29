import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { io } from '../index';

/**
 * Get admin dashboard overview
 */
export const getDashboardOverview = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const [
      totalUsers,
      totalBuyers,
      totalSellers,
      totalTransactions,
      pendingTransactions,
      completedTransactions,
      totalVolume,
      openDisputes,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'BUYER' } }),
      prisma.user.count({ where: { role: 'SELLER' } }),
      prisma.transaction.count(),
      prisma.transaction.count({ where: { status: 'PENDING' } }),
      prisma.transaction.count({ where: { status: 'COMPLETED' } }),
      prisma.transaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.dispute.count({ where: { status: 'OPEN' } }),
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          buyers: totalBuyers,
          sellers: totalSellers,
        },
        transactions: {
          total: totalTransactions,
          pending: pendingTransactions,
          completed: completedTransactions,
        },
        volume: {
          total: totalVolume._sum.amount || 0,
          currency: 'KES',
        },
        disputes: {
          open: openDisputes,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard data' });
  }
};

/**
 * Get all transactions (admin view)
 */
export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          seller: { select: { id: true, name: true, phone: true } },
          buyer: { select: { id: true, name: true, phone: true } },
          dispute: true,
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
    console.error('Get all transactions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
};

/**
 * Get all disputes
 */
export const getAllDisputes = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where,
        include: {
          transaction: {
            select: {
              id: true,
              itemName: true,
              amount: true,
              seller: { select: { name: true, phone: true } },
              buyer: { select: { name: true, phone: true } },
            },
          },
          openedBy: { select: { id: true, name: true } },
          messages: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.dispute.count({ where }),
    ]);

    res.json({
      success: true,
      data: disputes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get all disputes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch disputes' });
  }
};

/**
 * Resolve a dispute
 */
export const resolveDispute = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { disputeId } = req.params;
    const { resolution, favoriteSide } = req.body;

    if (!resolution || !favoriteSide) {
      return res.status(400).json({ success: false, error: 'Missing resolution or favoriteSide' });
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id: disputeId },
      include: { transaction: true },
    });

    if (!dispute) {
      return res.status(404).json({ success: false, error: 'Dispute not found' });
    }

    const updated = await prisma.dispute.update({
      where: { id: disputeId },
      data: {
        status: favoriteSide === 'buyer' ? 'RESOLVED_BUYER' : 'RESOLVED_SELLER',
        resolution,
        resolvedById: req.user.userId,
        resolvedAt: new Date(),
      },
    });

    // Notify both parties
    io.to(`user:${dispute.transaction.sellerId}`).emit('notification:new', {
      type: 'DISPUTE_RESOLVED',
      title: 'Dispute Resolved',
      message: `Your dispute has been resolved. ${resolution}`,
    });

    if (dispute.transaction.buyerId) {
      io.to(`user:${dispute.transaction.buyerId}`).emit('notification:new', {
        type: 'DISPUTE_RESOLVED',
        title: 'Dispute Resolved',
        message: `Your dispute has been resolved. ${resolution}`,
      });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ success: false, error: 'Failed to resolve dispute' });
  }
};

/**
 * Get all users
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { role, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (role && role !== 'all') {
      where.role = role;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          role: true,
          signupMethod: true,
          accountStatus: true,
          isPhoneVerified: true,
          isEmailVerified: true,
          isVerified: true,
          isActive: true,
          memberSince: true,
          lastLogin: true,
          wallet: { select: { availableBalance: true, pendingBalance: true } },
        },
        orderBy: { memberSince: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.user.count({ where }),
    ]);

    // Map users to ensure consistent field names for frontend
    const mappedUsers = users.map(user => ({
      ...user,
      signupMethod: user.signupMethod || 'PHONE_OTP',
      accountStatus: user.accountStatus || 'ACTIVE',
      isPhoneVerified: user.isPhoneVerified ?? false,
      isEmailVerified: user.isEmailVerified ?? false,
    }));

    res.json({
      success: true,
      data: mappedUsers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};

/**
 * Deactivate user account
 */
export const deactivateUser = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { userId } = req.params;
    const { reason } = req.body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'USER_DEACTIVATED',
        entity: 'User',
        entityId: userId,
        details: { reason },
        ipAddress: req.ip,
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({ success: false, error: 'Failed to deactivate user' });
  }
};

/**
 * Get platform analytics
 */
export const getAnalytics = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [weeklyTransactions, weeklyVolume, successRate] = await Promise.all([
      prisma.transaction.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.transaction.aggregate({
        where: { createdAt: { gte: sevenDaysAgo }, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { createdAt: { gte: sevenDaysAgo } },
        _count: true,
      }),
    ]);

    const completedCount = await prisma.transaction.count({
      where: { createdAt: { gte: sevenDaysAgo }, status: 'COMPLETED' },
    });

    res.json({
      success: true,
      data: {
        period: '7 days',
        transactions: weeklyTransactions,
        volume: weeklyVolume._sum.amount || 0,
        successRate: weeklyTransactions > 0 ? ((completedCount / weeklyTransactions) * 100).toFixed(2) : 0,
      },
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
};
