import { Request, Response } from 'express';
import { prisma } from '../config/database';

// Ensure the requester is authenticated and a SELLER
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

export const getMyStore = async (req: Request, res: Response) => {
  try {
    const sellerId = ensureSeller(req, res);
    if (!sellerId) return;

    const store = await prisma.store.findUnique({
      where: { sellerId },
      include: { socialAccounts: true },
    });

    if (!store) {
      return res.json({ success: true, data: null });
    }

    res.json({ success: true, data: store });
  } catch (error) {
    console.error('Get my store error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch store' });
  }
};

export const createStore = async (req: Request, res: Response) => {
  try {
    const sellerId = ensureSeller(req, res);
    if (!sellerId) return;

    const { name, slug } = req.body;
    if (!name || !slug) {
      return res.status(400).json({ success: false, error: 'Missing name or slug' });
    }

    const existing = await prisma.store.findUnique({ where: { sellerId } });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Seller already has a store' });
    }

    const created = await prisma.store.create({
      data: { sellerId, name, slug, status: 'INACTIVE' },
    });

    res.json({ success: true, data: created });
  } catch (error) {
    console.error('Create store error:', error);
    res.status(500).json({ success: false, error: 'Failed to create store' });
  }
};

export const updateStoreStatus = async (req: Request, res: Response) => {
  try {
    const sellerId = ensureSeller(req, res);
    if (!sellerId) return;

    const { status } = req.body as { status: 'INACTIVE' | 'ACTIVE' | 'FROZEN' };
    if (!status) {
      return res.status(400).json({ success: false, error: 'Missing status' });
    }

    const store = await prisma.store.findUnique({
      where: { sellerId },
      include: { socialAccounts: true },
    });
    if (!store) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    // Governance: ACTIVE requires at least one social page and a payout method.
    if (status === 'ACTIVE') {
      const hasSocial = store.socialAccounts.length > 0;
      const hasPayout = await prisma.paymentMethod.findFirst({
        where: { userId: sellerId, isActive: true },
      });
      if (!hasSocial || !hasPayout) {
        return res.status(400).json({
          success: false,
          error: 'Store cannot be activated without connected social page and active payout method',
        });
      }
    }

    const updated = await prisma.store.update({
      where: { id: store.id },
      data: { status },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update store status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
};

export const updateStore = async (req: Request, res: Response) => {
  try {
    const sellerId = ensureSeller(req, res);
    if (!sellerId) return;

    const { name, slug, logo, bio, visibility } = req.body;

    const store = await prisma.store.findUnique({ where: { sellerId } });
    if (!store) {
      return res.status(404).json({ success: false, error: 'Store not found' });
    }

    // Check if slug is being changed and if it's available
    if (slug && slug !== store.slug) {
      const existing = await prisma.store.findUnique({ where: { slug } });
      if (existing) {
        return res.status(400).json({ success: false, error: 'Slug already taken' });
      }
    }

    const updated = await prisma.store.update({
      where: { id: store.id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(logo !== undefined && { logo }),
        ...(bio !== undefined && { bio }),
        ...(visibility && { visibility }),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update store error:', error);
    res.status(500).json({ success: false, error: 'Failed to update store' });
  }
};

export const getStorefrontBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const store = await prisma.store.findUnique({
      where: { slug },
      include: {
        socialAccounts: true,
        products: { where: { status: 'PUBLISHED' }, orderBy: { updatedAt: 'desc' } },
      },
    });
    
    if (!store) {
      return res.status(404).json({ 
        success: false, 
        error: 'Store not found',
        code: 'STORE_NOT_FOUND'
      });
    }
    
    if (store.status !== 'ACTIVE') {
      return res.status(403).json({ 
        success: false, 
        error: `Store is ${store.status.toLowerCase()}. Please activate your store in settings to make it publicly accessible.`,
        code: 'STORE_INACTIVE',
        data: {
          status: store.status,
          name: store.name
        }
      });
    }
    
    res.json({ success: true, data: store });
  } catch (error) {
    console.error('Get storefront by slug error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch store' });
  }
};