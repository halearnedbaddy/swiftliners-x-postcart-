import { prisma } from '../config/database';

// Lightweight stub that simulates scanning a social page
// AI Governance: only reads pages, suggests products, never publishes.

export async function scanSocialAccount(socialAccountId: string) {
  const account = await prisma.socialAccount.findUnique({ where: { id: socialAccountId } });
  if (!account) return;

  const storeId = account.storeId;
  // Start log
  await prisma.syncLog.create({
    data: {
      storeId,
      socialAccountId,
      eventType: 'SCAN_STARTED',
      status: 'SUCCESS',
      message: `Scanning ${account.platform} page: ${account.pageUrl}`,
    },
  });

  // Simulate extracting "posts" identifiers using the page URL path segments
  const url = new URL(account.pageUrl, 'http://localhost');
  const segments = url.pathname.split('/').filter(Boolean);
  const baseKey = segments.join('-') || account.platform.toLowerCase();

  const candidatePosts = [
    `${baseKey}-post-1`,
    `${baseKey}-post-2`,
    `${baseKey}-post-3`,
  ];

  let newCount = 0;
  let updatedCount = 0;
  let archivedCount = 0;

  // Existing products for this account
  const existing = await prisma.product.findMany({
    where: { storeId, socialPostId: { in: candidatePosts }, platform: account.platform },
  });
  const existingMap = new Map(existing.map((p) => [p.socialPostId || '', p]));

  // Upsert detected posts as products (DRAFT)
  for (const postId of candidatePosts) {
    const name = `Product from ${account.platform} (${postId})`;
    const description = `Auto-detected from ${account.pageUrl}`;
    const price = 1000 + Math.floor(Math.random() * 9000);
    const images = [`${account.pageUrl}/images/${postId}.jpg`];

    if (existingMap.has(postId)) {
      const prod = existingMap.get(postId)!;
      await prisma.product.update({
        where: { id: prod.id },
        data: {
          name,
          description,
          price,
          images,
          status: 'DRAFT',
          lastSyncedAt: new Date(),
        },
      });
      updatedCount++;
    } else {
      await prisma.product.create({
        data: {
          storeId,
          socialPostId: postId,
          platform: account.platform,
          name,
          description,
          price,
          images,
          status: 'DRAFT',
          source: 'AI',
          lastSyncedAt: new Date(),
        },
      });
      newCount++;
    }
  }

  // Archive products whose socialPostId no longer detected
  const allProductsForAccount = await prisma.product.findMany({
    where: { storeId, platform: account.platform },
  });
  for (const prod of allProductsForAccount) {
    if (prod.socialPostId && !candidatePosts.includes(prod.socialPostId)) {
      if (prod.status !== 'ARCHIVED') {
        await prisma.product.update({ where: { id: prod.id }, data: { status: 'ARCHIVED' } });
        archivedCount++;
      }
    }
  }

  await prisma.socialAccount.update({
    where: { id: socialAccountId },
    data: { lastScannedAt: new Date(), scanStatus: 'SUCCESS' },
  });

  await prisma.syncLog.create({
    data: {
      storeId,
      socialAccountId,
      eventType: 'SCAN_COMPLETED',
      status: 'SUCCESS',
      newCount,
      updatedCount,
      archivedCount,
      message: `Scan completed: ${newCount} new, ${updatedCount} updated, ${archivedCount} archived`,
    },
  });
}

export async function scanStore(storeId: string) {
  const accounts = await prisma.socialAccount.findMany({ where: { storeId } });
  for (const acc of accounts) {
    await scanSocialAccount(acc.id);
  }
}