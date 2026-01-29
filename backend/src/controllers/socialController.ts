import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { scanSocialAccount } from '../services/socialScanService';

function ensureSeller(req: Request, res: Response): { sellerId: string; storeId: string } | null {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return null;
  }
  if (req.user.role !== 'SELLER') {
    res.status(403).json({ success: false, error: 'Only sellers can access this resource' });
    return null;
  }
  const sellerId = req.user.userId;
  return { sellerId, storeId: '' };
}

export const listSocialAccounts = async (req: Request, res: Response) => {
  try {
    const auth = ensureSeller(req, res);
    if (!auth) return;
    const store = await prisma.store.findUnique({ where: { sellerId: auth.sellerId } });
    if (!store) return res.json({ success: true, data: [] });

    const accounts = await prisma.socialAccount.findMany({ where: { storeId: store.id }, orderBy: { platform: 'asc' } });
    res.json({ success: true, data: accounts });
  } catch (error) {
    console.error('List social accounts error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch social accounts' });
  }
};

export const connectSocialPage = async (req: Request, res: Response) => {
  try {
    const auth = ensureSeller(req, res);
    if (!auth) return;
    const { platform, pageUrl, pageId } = req.body as { platform: 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN'; pageUrl: string; pageId?: string };
    if (!platform || !pageUrl || platform === 'INSTAGRAM' && !pageUrl) {
      return res.status(400).json({ success: false, error: 'Missing platform or pageUrl' });
    }

    const store = await prisma.store.findUnique({ where: { sellerId: auth.sellerId } });
    if (!store) {
      return res.status(400).json({ success: false, error: 'Create store before connecting social pages' });
    }

    const created = await prisma.socialAccount.create({
      data: { storeId: store.id, platform, pageUrl, pageId },
    });

    // Initial scan
    await scanSocialAccount(created.id);

    res.json({ success: true, data: created });
  } catch (error) {
    // Unique constraint or other errors
    console.error('Connect social page error:', error);
    res.status(500).json({ success: false, error: 'Failed to connect social page' });
  }
};

export const rescanSocialPage = async (req: Request, res: Response) => {
  try {
    const auth = ensureSeller(req, res);
    if (!auth) return;
    const { id } = req.params;

    const account = await prisma.socialAccount.findUnique({ where: { id }, include: { store: true } });
    if (!account || account.store.sellerId !== auth.sellerId) {
      return res.status(404).json({ success: false, error: 'Social account not found' });
    }

    await scanSocialAccount(id);
    res.json({ success: true, message: 'Rescan triggered' });
  } catch (error) {
    console.error('Rescan social page error:', error);
    res.status(500).json({ success: false, error: 'Failed to rescan page' });
  }
};