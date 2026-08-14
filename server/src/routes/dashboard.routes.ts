import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

const latestScanSelect = {
  imageId: true,
  criticalCount: true,
  highCount: true,
  mediumCount: true,
  lowCount: true,
} as const;

function latestCompletedScans() {
  return prisma.scan.findMany({
    where: { status: "COMPLETED" },
    distinct: ["imageId"],
    orderBy: [{ imageId: "asc" }, { startedAt: "desc" }],
    select: latestScanSelect,
  });
}

dashboardRouter.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [latestScansPerImage, totalImages, scansToday, lastScan] = await Promise.all([
      latestCompletedScans(),
      prisma.image.count(),
      prisma.scan.count({ where: { startedAt: { gte: startOfToday } } }),
      prisma.scan.findFirst({ orderBy: { startedAt: "desc" }, select: { startedAt: true } }),
    ]);

    const totals = latestScansPerImage.reduce(
      (acc, scan) => {
        acc.critical += scan.criticalCount;
        acc.high += scan.highCount;
        acc.medium += scan.mediumCount;
        acc.low += scan.lowCount;
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0 }
    );

    const vulnerableImages = latestScansPerImage.filter(
      (s) => s.criticalCount + s.highCount + s.mediumCount + s.lowCount > 0
    ).length;
    const cleanImages = latestScansPerImage.length - vulnerableImages;

    res.json({
      criticalCount: totals.critical,
      highCount: totals.high,
      mediumCount: totals.medium,
      lowCount: totals.low,
      totalVulnerabilities: totals.critical + totals.high + totals.medium + totals.low,
      totalImages,
      vulnerableImages,
      cleanImages,
      scansToday,
      lastScanTime: lastScan?.startedAt ?? null,
    });
  })
);

dashboardRouter.get(
  "/severity",
  asyncHandler(async (_req, res) => {
    const latestScansPerImage = await latestCompletedScans();
    const totals = latestScansPerImage.reduce(
      (acc, scan) => {
        acc.CRITICAL += scan.criticalCount;
        acc.HIGH += scan.highCount;
        acc.MEDIUM += scan.mediumCount;
        acc.LOW += scan.lowCount;
        return acc;
      },
      { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
    );
    res.json(totals);
  })
);

const RANGE_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

dashboardRouter.get(
  "/trends",
  asyncHandler(async (req, res) => {
    const { range = "30d", start, end, imageId } = req.query as Record<string, string | undefined>;

    let rangeStart: Date;
    let rangeEnd: Date;
    if (start && end) {
      rangeStart = new Date(start);
      rangeEnd = new Date(end);
      if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
        throw new HttpError(400, "Invalid start/end date");
      }
    } else {
      const days = RANGE_DAYS[range];
      if (!days) throw new HttpError(400, `Invalid range: ${range}. Use 7d, 30d, 90d, or start/end.`);
      rangeEnd = new Date();
      rangeStart = new Date();
      rangeStart.setDate(rangeStart.getDate() - days);
    }

    const scans = await prisma.scan.findMany({
      where: {
        status: "COMPLETED",
        startedAt: { gte: rangeStart, lte: rangeEnd },
        ...(imageId ? { imageId } : {}),
      },
      orderBy: { startedAt: "asc" },
      select: {
        startedAt: true,
        criticalCount: true,
        highCount: true,
        mediumCount: true,
        lowCount: true,
      },
    });

    const byDay = new Map<
      string,
      { date: string; critical: number; high: number; medium: number; low: number }
    >();
    for (const scan of scans) {
      const date = scan.startedAt.toISOString().slice(0, 10);
      const bucket = byDay.get(date) ?? { date, critical: 0, high: 0, medium: 0, low: 0 };
      bucket.critical += scan.criticalCount;
      bucket.high += scan.highCount;
      bucket.medium += scan.mediumCount;
      bucket.low += scan.lowCount;
      byDay.set(date, bucket);
    }

    res.json([...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)));
  })
);

dashboardRouter.get(
  "/images",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 10, 50);

    const scans = await prisma.scan.findMany({
      where: { status: "COMPLETED" },
      distinct: ["imageId"],
      orderBy: [{ imageId: "asc" }, { startedAt: "desc" }],
      select: {
        criticalCount: true,
        highCount: true,
        mediumCount: true,
        lowCount: true,
        image: { select: { id: true, repository: true, name: true, tag: true } },
      },
    });

    const ranked = scans
      .map((s) => ({
        image: s.image,
        critical: s.criticalCount,
        high: s.highCount,
        medium: s.mediumCount,
        low: s.lowCount,
        total: s.criticalCount + s.highCount + s.mediumCount + s.lowCount,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);

    res.json(ranked);
  })
);
