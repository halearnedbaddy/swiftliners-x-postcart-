import { prisma } from '../config/database';
import { scanStore } from './socialScanService';

let intervalHandle: NodeJS.Timeout | null = null;

export function startSyncScheduler() {
  // Run every 10 minutes in development; adjust via env in production
  const intervalMs = Number(process.env.SOCIAL_SYNC_INTERVAL_MS || 10 * 60 * 1000);
  if (intervalHandle) return;

  intervalHandle = setInterval(async () => {
    try {
      const activeStores = await prisma.store.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
      for (const s of activeStores) {
        await scanStore(s.id);
      }
    } catch (err) {
      console.error('Sync scheduler error:', err);
    }
  }, intervalMs);

  console.log(`🕒 Social sync scheduler started (interval: ${intervalMs}ms)`);
}

export function stopSyncScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}