import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { exchangeRateService } from '../services/exchangeRateService';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Generate a unique link ID (e.g., PL-8X9K2M4N)
 */
const generateLinkId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous characters
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PL-${result}`;
};

/**
 * Create a new payment link
 */
export const createPaymentLink = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const {
      productName,
      productDescription,
      price,
      originalPrice,
      images,
      customerPhone,
      currency = 'KES',
      quantity = 1,
      expiryHours
    } = req.body;

    // Validation
    if (!productName || !price) {
      return res.status(400).json({ success: false, error: 'Product name and price are required', code: 'VALIDATION_ERROR' });
    }

    const linkId = generateLinkId();
    const expiryDate = expiryHours ? new Date(Date.now() + expiryHours * 60 * 60 * 1000) : null;

    // Calculate base price in USD
    const rateToUSD = await exchangeRateService.getRate(currency, 'USD');
    const basePriceUSD = Number(price) * rateToUSD;

    const paymentLink = await prisma.paymentLink.create({
      data: {
        id: linkId,
        sellerId: req.user.userId,
        productName,
        productDescription,
        price: new Decimal(price),
        originalPrice: originalPrice ? new Decimal(originalPrice) : null,
        currency,
        basePriceUSD: new Decimal(basePriceUSD),
        images: images || [],
        customerPhone,
        quantity: Number(quantity),
        expiryDate,
        status: 'ACTIVE'
      }
    });

    res.status(201).json({
      success: true,
      data: {
        ...paymentLink,
        linkUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/buy/${linkId}`
      }
    });
  } catch (error) {
    console.error('Create payment link error:', error);
    res.status(500).json({ success: false, error: 'Failed to create payment link', code: 'SERVER_ERROR' });
  }
};

/**
 * Get payment link details (Public)
 */
export const getPaymentLink = async (req: Request, res: Response) => {
  try {
    const { linkId } = req.params;

    const paymentLink = await prisma.paymentLink.findUnique({
      where: { id: linkId },
      include: {
        seller: {
          select: {
            name: true,
            sellerProfile: {
              select: {
                rating: true,
                totalReviews: true,
                isVerified: true
              }
            }
          }
        }
      }
    });

    if (!paymentLink) {
      return res.status(404).json({ success: false, error: 'Payment link not found', code: 'NOT_FOUND' });
    }

    // Check if expired
    if (paymentLink.expiryDate && new Date() > paymentLink.expiryDate) {
      if (paymentLink.status === 'ACTIVE') {
        await prisma.paymentLink.update({
          where: { id: linkId },
          data: { status: 'EXPIRED' }
        });
      }
      return res.status(400).json({ success: false, error: 'Payment link has expired', code: 'EXPIRED' });
    }

    // Increment clicks
    await prisma.paymentLink.update({
      where: { id: linkId },
      data: { clicks: { increment: 1 } }
    });

    res.json({ success: true, data: paymentLink });
  } catch (error) {
    console.error('Get payment link error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payment link', code: 'SERVER_ERROR' });
  }
};

/**
 * Get seller's payment links
 */
export const getSellerLinks = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { sellerId: req.user.userId };
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [links, total] = await Promise.all([
      prisma.paymentLink.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.paymentLink.count({ where }),
    ]);

    res.json({
      success: true,
      data: links,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('Get seller links error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payment links', code: 'SERVER_ERROR' });
  }
};

/**
 * Update payment link status
 */
export const updateLinkStatus = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const { linkId } = req.params;
    const { status } = req.body;

    const paymentLink = await prisma.paymentLink.findFirst({
      where: { id: linkId, sellerId: req.user.userId }
    });

    if (!paymentLink) {
      return res.status(404).json({ success: false, error: 'Payment link not found', code: 'NOT_FOUND' });
    }

    const updated = await prisma.paymentLink.update({
      where: { id: linkId },
      data: { status }
    });

    res.json({ success: true, message: 'Status updated', data: updated });
  } catch (error) {
    console.error('Update link status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update status', code: 'SERVER_ERROR' });
  }
};

/**
 * Get link analytics
 */
export const getLinkAnalytics = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required', code: 'NO_AUTH' });
    }

    const { linkId } = req.params;

    const link = await prisma.paymentLink.findFirst({
      where: { id: linkId, sellerId: req.user.userId }
    });

    if (!link) {
      return res.status(404).json({ success: false, error: 'Payment link not found', code: 'NOT_FOUND' });
    }

    const conversionRate = link.clicks > 0 ? (link.purchases / link.clicks) * 100 : 0;

    res.json({
      success: true,
      data: {
        clicks: link.clicks,
        purchases: link.purchases,
        revenue: Number(link.revenue),
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        clicksByDate: [], // Placeholder for future implementation
        topReferrers: []  // Placeholder for future implementation
      }
    });
  } catch (error) {
    console.error('Get link analytics error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch analytics', code: 'SERVER_ERROR' });
  }
};
