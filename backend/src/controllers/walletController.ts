import { Request, Response } from 'express';
import { prisma } from '../config/database';

/**
 * Get user's wallet
 */
export const getWallet = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.userId },
    });

    if (!wallet) {
      // Create wallet if doesn't exist
      const newWallet = await prisma.wallet.create({
        data: {
          userId: req.user.userId,
          availableBalance: 0,
          pendingBalance: 0,
          totalEarned: 0,
          totalSpent: 0,
        },
      });
      return res.json({ success: true, data: newWallet });
    }

    res.json({ success: true, data: wallet });
  } catch (error) {
    console.error('Get wallet error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch wallet', code: 'SERVER_ERROR' });
  }
};

/**
 * Request withdrawal
 */
export const requestWithdrawal = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const { amount, paymentMethodId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount', code: 'INVALID_AMOUNT' });
    }

    if (!paymentMethodId) {
      return res.status(400).json({ success: false, error: 'Payment method required', code: 'MISSING_PAYMENT_METHOD' });
    }

    // Get wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.userId },
    });

    if (!wallet || wallet.availableBalance < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance', code: 'INSUFFICIENT_BALANCE' });
    }

    // Verify payment method belongs to user
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { id: paymentMethodId, userId: req.user.userId },
    });

    if (!paymentMethod) {
      return res.status(404).json({ success: false, error: 'Payment method not found', code: 'PAYMENT_METHOD_NOT_FOUND' });
    }

    // Get user country for fee calculation
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { countryCode: true, currencyCode: true }
    });
    const country = user?.countryCode || 'KE';
    const currency = user?.currencyCode || 'KES';

    // --- FEE CALCULATION START ---
    // 1. Platform Withdrawal Fee: 2% (Min/Max varies by currency)
    const minFees: Record<string, number> = { 'KES': 10, 'UGX': 300, 'TZS': 200, 'RWF': 100, 'USD': 0.1 };
    const maxFees: Record<string, number> = { 'KES': 500, 'UGX': 15000, 'TZS': 10000, 'RWF': 5000, 'USD': 5 };
    
    let platformFee = amount * 0.02;
    const minFee = minFees[currency] || minFees['KES'];
    const maxFee = maxFees[currency] || maxFees['KES'];
    
    if (platformFee < minFee) platformFee = minFee;
    if (platformFee > maxFee) platformFee = maxFee;

    // 2. Provider Fee (Pass-through)
    let providerFee = 0;
    const provider = paymentMethod.provider.toUpperCase();
    
    const providerFees: Record<string, Record<string, number>> = {
      'KE': { 'MPESA': 27, 'AIRTEL': 25, 'BANK': 50 },
      'UG': { 'MTN': 500, 'AIRTEL': 500, 'BANK': 1000 },
      'TZ': { 'MPESA': 500, 'TIGO': 500, 'AIRTEL': 500, 'BANK': 1000 },
      'RW': { 'MTN': 250, 'AIRTEL': 250, 'BANK': 500 },
    };

    const countryFees = providerFees[country] || providerFees['KE'];
    if (provider.includes('MPESA') || provider.includes('M-PESA')) {
      providerFee = countryFees['MPESA'] || 27;
    } else if (provider.includes('MTN')) {
      providerFee = countryFees['MTN'] || 500;
    } else if (provider.includes('TIGO')) {
      providerFee = countryFees['TIGO'] || 500;
    } else if (provider.includes('AIRTEL')) {
      providerFee = countryFees['AIRTEL'] || 25;
    } else if (provider.includes('BANK')) {
      providerFee = countryFees['BANK'] || 50;
    }

    const totalFee = platformFee + providerFee;
    const netAmount = amount - totalFee;

    // Ensure they are not withdrawing less than fees
    if (netAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: `Amount too low. Minimum fees are ${currency} ${totalFee.toFixed(2)}`,
        code: 'AMOUNT_TOO_LOW'
      });
    }
    // --- FEE CALCULATION END ---

    // Create withdrawal in transaction
    const withdrawal = await prisma.$transaction(async (tx) => {
      // Deduct GROSS amount from available balance
      await tx.wallet.update({
        where: { userId: req.user!.userId },
        data: { availableBalance: { decrement: amount } },
      });

      // Create withdrawal record
      const newWithdrawal = await tx.withdrawal.create({
        data: {
          userId: req.user!.userId,
          amount, // Gross amount requested
          paymentMethodId,
          status: 'PENDING',
          fee: totalFee,
          netAmount: netAmount, // Amount to be sent
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: req.user!.userId,
          action: 'WITHDRAWAL_REQUESTED',
          entity: 'Withdrawal',
          entityId: newWithdrawal.id,
          details: {
            requestedAmount: amount,
            platformFee,
            providerFee,
            totalFee,
            netAmount,
            provider
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          success: true,
        },
      });

      // TODO: Notify admin about new withdrawal request
      // TODO: Send WITHDRAWAL REQUEST CONFIRMATION (Template 4)

      return newWithdrawal;
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted',
      data: withdrawal,
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    res.status(500).json({ success: false, error: 'Failed to process withdrawal', code: 'SERVER_ERROR' });
  }
};

/**
 * Get withdrawal history
 */
export const getWithdrawalHistory = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where: { userId: req.user.userId },
        include: { paymentMethod: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.withdrawal.count({ where: { userId: req.user.userId } }),
    ]);

    res.json({
      success: true,
      data: withdrawals,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get withdrawals error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch withdrawals', code: 'SERVER_ERROR' });
  }
};

/**
 * Add payment method
 */
export const addPaymentMethod = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const { type, provider, accountNumber, accountName, isDefault } = req.body;

    if (!type || !provider || !accountNumber || !accountName) {
      return res.status(400).json({ success: false, error: 'Missing required fields', code: 'MISSING_FIELDS' });
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId: req.user.userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        userId: req.user.userId,
        type,
        provider,
        accountNumber,
        accountName,
        isDefault: isDefault || false,
      },
    });

    res.status(201).json({ success: true, data: paymentMethod });
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({ success: false, error: 'Failed to add payment method', code: 'SERVER_ERROR' });
  }
};

/**
 * Get payment methods
 */
export const getPaymentMethods = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { userId: req.user.userId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({ success: true, data: paymentMethods });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payment methods', code: 'SERVER_ERROR' });
  }
};

/**
 * Delete payment method
 */
export const deletePaymentMethod = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const { id } = req.params;

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { id, userId: req.user.userId },
    });

    if (!paymentMethod) {
      return res.status(404).json({ success: false, error: 'Payment method not found', code: 'NOT_FOUND' });
    }

    await prisma.paymentMethod.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ success: true, message: 'Payment method deleted' });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete payment method', code: 'SERVER_ERROR' });
  }
};
