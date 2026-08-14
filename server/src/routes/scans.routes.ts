import { Router } from "express";
import { ScanStatus } from "@prisma/client";
import { asyncHandler } from "../lib/asyncHandler";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";
import { cancelScan } from "../services/scanner.service";

const VALID_STATUSES = new Set(Object.values(ScanStatus));

export const scansRouter = Router();

scansRouter.use(requireAuth);

const imageSelect = {
  id: true,
  repository: true,
  name: true,
  tag: true,
} as const;

scansRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status, imageId, search } = req.query as { status?: string; imageId?: string; search?: string };
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    if (status && !VALID_STATUSES.has(status as ScanStatus)) {
      throw new HttpError(400, `Invalid status filter: ${status}`);
    }

    const where = {
      ...(status ? { status: status as ScanStatus } : {}),
      ...(imageId ? { imageId } : {}),
      ...(search
        ? {
            image: {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { repository: { contains: search, mode: "insensitive" as const } },
                { tag: { contains: search, mode: "insensitive" as const } },
              ],
            },
          }
        : {}),
    };

    const [scans, total] = await Promise.all([
      prisma.scan.findMany({
        where,
        orderBy: { startedAt: "desc" },
        take: limit,
        skip: offset,
        include: { image: { select: imageSelect } },
      }),
      prisma.scan.count({ where }),
    ]);

    res.json({ items: scans, total });
  })
);

scansRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const scan = await prisma.scan.findUnique({
      where: { id: req.params.id },
      include: {
        image: { select: imageSelect },
        vulnerabilities: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!scan) throw new HttpError(404, "Scan not found");
    res.json(scan);
  })
);

scansRouter.post(
  "/:id/cancel",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const cancelled = await cancelScan(req.params.id);
    if (!cancelled) throw new HttpError(409, "Scan is not currently running");
    res.status(204).send();
  })
);

scansRouter.delete(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const scan = await prisma.scan.findUnique({ where: { id: req.params.id } });
    if (!scan) throw new HttpError(404, "Scan not found");

    await prisma.scan.delete({ where: { id: req.params.id } });
    res.status(204).send();
  })
);
