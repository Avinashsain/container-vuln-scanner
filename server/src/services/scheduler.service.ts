import { prisma } from "../lib/prisma";
import { startScan } from "./scanner.service";

const CHECK_INTERVAL_MS = 60_000;

async function runDueScans() {
  const images = await prisma.image.findMany({
    where: { scanIntervalMinutes: { not: null, gt: 0 } },
    include: { scans: { orderBy: { startedAt: "desc" }, take: 1, select: { status: true, startedAt: true } } },
  });

  const now = Date.now();

  for (const image of images) {
    const latestScan = image.scans[0];
    if (latestScan?.status === "RUNNING") continue;

    const lastRun = image.lastAutoScanAt ?? latestScan?.startedAt ?? null;
    const dueAt = lastRun ? lastRun.getTime() + image.scanIntervalMinutes! * 60_000 : 0;
    if (now < dueAt) continue;

    // Set lastAutoScanAt before starting so an overlapping tick can't double-trigger.
    await prisma.image.update({ where: { id: image.id }, data: { lastAutoScanAt: new Date() } });
    console.log(`[scheduler] auto-scanning ${image.repository ? image.repository + "/" : ""}${image.name}:${image.tag}`);
    await startScan(image).catch((err) => console.error(`[scheduler] failed to start scan for ${image.id}:`, err));
  }
}

export function startScheduler() {
  setInterval(() => {
    runDueScans().catch((err) => console.error("[scheduler] tick failed:", err));
  }, CHECK_INTERVAL_MS);
  console.log(`[scheduler] started (checking every ${CHECK_INTERVAL_MS / 1000}s)`);
}
