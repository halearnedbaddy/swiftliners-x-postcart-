import { Request, Response } from 'express';
import { prisma } from '../config/database';
import crypto from 'crypto';
import { exchangeRateService } from '../services/exchangeRateService';
import { Decimal } from '@prisma/client/runtime/library';

function ensureSeller(req: Request, res: Response): string | null {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return null;
  }
  if (req.user.role !== 'SELLER') {
    res.status(403).json({ success: false, error: 'Only sellers can access this resource' });
    return null;
  }
  return req.user.userId;
}

export const createProduct = async (req: Request, res: Response) => {
  try {
    const sellerId = ensureSeller(req, res);
    if (!sellerId) return;

    const { name, description, price, images, currency = 'KES' } = req.body;

    if (!name || typeof price !== 'number') {
      return res.status(400).json({ success: false, error: 'Product name and price are required' });
    }

    const store = await prisma.store.findUnique({ where: { sellerId }, include: { seller: true } });
    if (!store) {
      return res.status(404).json({ success: false, error: 'Store not found. Please create a store first.' });
    }

    // Calculate base price in USD
    const rateToUSD = await exchangeRateService.getRate(currency, 'USD');
    const basePriceUSD = price * rateToUSD;

    const product = await prisma.product.create({
      data: {
        name,
        description: description || null,
        price,
        currency,
        basePriceUSD,
        sellerCurrency: currency,
        sellerPrice: price,
        images: Array.isArray(images) ? images : [],
        status: 'DRAFT',
        storeId: store.id,
      },
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
};

export const listDraftProducts = async (req: Request, res: Response) => {
  try {
    const sellerId = ensureSeller(req, res);
    if (!sellerId) return;
    const store = await prisma.store.findUnique({ where: { sellerId } });
    if (!store) return res.json({ success: true, data: [] });
    const products = await prisma.product.findMany({ where: { storeId: store.id, status: 'DRAFT' }, orderBy: { updatedAt: 'desc' } });
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('List draft products error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch draft products' });
  }
};

export const listPublishedProducts = async (req: Request, res: Response) => {
  try {
    const sellerId = ensureSeller(req, res);
    if (!sellerId) return;
    const store = await prisma.store.findUnique({ where: { sellerId } });
    if (!store) return res.json({ success: true, data: [] });
    const products = await prisma.product.findMany({ where: { storeId: store.id, status: 'PUBLISHED' }, orderBy: { updatedAt: 'desc' } });
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('List published products error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
};

export const updateProductDetails = async (req: Request, res: Response) => {
  try {
    const sellerId = ensureSeller(req, res);
    if (!sellerId) return;

    const { id } = req.params;
    const { name, description, price, images, currency } = req.body;

    const product = await prisma.product.findUnique({
      where: { id },
      include: { store: true },
    });
    if (!product || product.store.sellerId !== sellerId) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const newCurrency = currency ?? product.currency;
    const newPrice = price ?? Number(product.price);
    
    let basePriceUSD = product.basePriceUSD;
    if (price !== undefined || currency !== undefined) {
      const rateToUSD = await exchangeRateService.getRate(newCurrency, 'USD');
      basePriceUSD = new Decimal(newPrice * rateToUSD);
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: name ?? product.name,
        description: description ?? product.description,
        price: newPrice,
        currency: newCurrency,
        basePriceUSD,
        sellerCurrency: newCurrency,
        sellerPrice: newPrice,
        images: Array.isArray(images) ? images : product.images,
        status: 'DRAFT', // any change resets to DRAFT
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update product details error:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
};

export const publishProduct = async (req: Request, res: Response) => {
  try {
    const sellerId = ensureSeller(req, res);
    if (!sellerId) return;
    const { id } = req.params;

    const product = await prisma.product.findUnique({ where: { id }, include: { store: true } });
    if (!product || product.store.sellerId !== sellerId) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const updated = await prisma.product.update({ where: { id }, data: { status: 'PUBLISHED' } });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Publish product error:', error);
    res.status(500).json({ success: false, error: 'Failed to publish product' });
  }
};

export const archiveProduct = async (req: Request, res: Response) => {
  try {
    const sellerId = ensureSeller(req, res);
    if (!sellerId) return;
    const { id } = req.params;

    const product = await prisma.product.findUnique({ where: { id }, include: { store: true } });
    if (!product || product.store.sellerId !== sellerId) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const updated = await prisma.product.update({ where: { id }, data: { status: 'ARCHIVED' } });
    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Archive product error:', error);
    res.status(500).json({ success: false, error: 'Failed to archive product' });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const sellerId = ensureSeller(req, res);
    if (!sellerId) return;
    const { id } = req.params;

    const product = await prisma.product.findUnique({ where: { id }, include: { store: true } });
    if (!product || product.store.sellerId !== sellerId) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    await prisma.product.delete({ where: { id } });
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
};

export const getPublicProduct = async (req: Request, res: Response) => {
  try {
    const { slug, id } = req.params;
    const store = await prisma.store.findUnique({ where: { slug } });
    if (!store || store.status !== 'ACTIVE') {
      return res.status(404).json({ success: false, error: 'Store not available' });
    }
    const product = await prisma.product.findFirst({ where: { id, storeId: store.id, status: 'PUBLISHED' } });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Get public product error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
};

/**
 * Create transaction from product (guest checkout)
 */
export const checkoutProduct = async (req: Request, res: Response) => {
  try {
    const { slug, id } = req.params;
    const { buyerName, buyerPhone, buyerEmail, buyerAddress, paymentMethod } = req.body;

    if (!buyerName || !buyerPhone) {
      return res.status(400).json({ success: false, error: 'Buyer name and phone are required' });
    }

    const store = await prisma.store.findUnique({ where: { slug } });
    if (!store || store.status !== 'ACTIVE') {
      return res.status(404).json({ success: false, error: 'Store not available' });
    }

    const product = await prisma.product.findFirst({ where: { id, storeId: store.id, status: 'PUBLISHED' } });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (!product.price) {
      return res.status(400).json({ success: false, error: 'Product price is not set' });
    }

    // Create transaction from product
    const transactionId = `TXN-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const transaction = await prisma.transaction.create({
      data: {
        id: transactionId,
        sellerId: store.sellerId,
        itemName: product.name,
        itemDescription: product.description || undefined,
        itemImages: product.images,
        amount: product.price,
        quantity: 1,
        currency: 'KES',
        buyerPhone,
        buyerName,
        buyerEmail: buyerEmail || undefined,
        buyerAddress: buyerAddress || undefined,
        paymentMethod: paymentMethod || 'MPESA',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      include: {
        seller: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        transactionId: transaction.id,
        ...transaction,
        paymentLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pay/${transaction.id}`,
      },
    });
  } catch (error) {
    console.error('Checkout product error:', error);
    res.status(500).json({ success: false, error: 'Failed to create checkout' });
  }
};