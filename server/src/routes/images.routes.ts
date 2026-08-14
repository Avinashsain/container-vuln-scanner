import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { normalizeImageRefInput, parseImageRef } from "../lib/imageRef";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";
import { startScan } from "../services/scanner.service";

export const imagesRouter = Router();

imagesRouter.use(requireAuth);

const scanSelect = {
  id: true,
  status: true,
  progress: true,
  stage: true,
  errorMessage: true,
  scannerVersion: true,
  startedAt: true,
  completedAt: true,
  criticalCount: true,
  highCount: true,
  mediumCount: true,
  lowCount: true,
  unknownCount: true,
} as const;

imagesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const images = await prisma.image.findMany({
      orderBy: { createdAt: "desc" },
      include: { scans: { orderBy: { startedAt: "desc" }, take: 1, select: scanSelect } },
    });

    res.json(
      images.map(({ scans, ...image }) => ({
        ...image,
        latestScan: scans[0] ?? null,
      }))
    );
  })
);

const addImageSchema = z.object({
  imageRef: z.string().min(1, "Image reference is required"),
});

imagesRouter.post(
  "/",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = addImageSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const cleanedRef = normalizeImageRefInput(parsed.data.imageRef);
    if (!cleanedRef) {
      throw new HttpError(400, "Image reference is required");
    }

    const { repository, name, tag, registry } = parseImageRef(cleanedRef);
    const image = await prisma.image.upsert({
      where: { repository_name_tag: { repository, name, tag } },
      update: {},
      create: { repository, name, tag, registry },
    });

    const scan = await startScan(image);
    res.status(201).json({ image, scan });
  })
);

imagesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const image = await prisma.image.findUnique({
      where: { id: req.params.id },
      include: { scans: { orderBy: { startedAt: "desc" }, take: 1, select: scanSelect } },
    });
    if (!image) throw new HttpError(404, "Image not found");

    const { scans, ...rest } = image;
    res.json({ ...rest, latestScan: scans[0] ?? null });
  })
);

imagesRouter.get(
  "/:id/history",
  asyncHandler(async (req, res) => {
    const image = await prisma.image.findUnique({ where: { id: req.params.id } });
    if (!image) throw new HttpError(404, "Image not found");

    const scans = await prisma.scan.findMany({
      where: { imageId: image.id },
      orderBy: { startedAt: "asc" },
      select: scanSelect,
    });
    res.json(scans);
  })
);

const scheduleSchema = z.object({
  scanIntervalMinutes: z.number().int().min(0).nullable(),
});

imagesRouter.patch(
  "/:id",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const parsed = scheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const image = await prisma.image.findUnique({ where: { id: req.params.id } });
    if (!image) throw new HttpError(404, "Image not found");

    const updated = await prisma.image.update({
      where: { id: req.params.id },
      data: {
        scanIntervalMinutes:
          parsed.data.scanIntervalMinutes === 0 ? null : parsed.data.scanIntervalMinutes,
      },
    });
    res.json(updated);
  })
);

imagesRouter.post(
  "/:id/scan",
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const image = await prisma.image.findUnique({ where: { id: req.params.id } });
    if (!image) throw new HttpError(404, "Image not found");

    const activeScan = await prisma.scan.findFirst({
      where: { imageId: image.id, status: "RUNNING" },
    });
    if (activeScan) throw new HttpError(409, "A scan is already running for this image");

    const scan = await startScan(image);
    res.status(201).json(scan);
  })
);
