import { Router } from "express";
import { ReportFormat } from "@prisma/client";
import { asyncHandler } from "../lib/asyncHandler";
import { safeFileName, formatImageRef } from "../lib/imageRef";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";
import { getOrCreateReport, getScanForReport } from "../services/report.service";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

const VALID_FORMATS = new Set(Object.values(ReportFormat));

reportsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { imageId, search } = req.query as { imageId?: string; search?: string };
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    const where = {
      status: "COMPLETED" as const,
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
        include: {
          image: { select: { id: true, repository: true, name: true, tag: true } },
        },
      }),
      prisma.scan.count({ where }),
    ]);

    res.json({ items: scans, total });
  })
);

reportsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const scan = await getScanForReport(req.params.id);
    res.json(scan);
  })
);

reportsRouter.get(
  "/:id/download",
  asyncHandler(async (req, res) => {
    const format = String(req.query.format ?? "JSON").toUpperCase();
    if (!VALID_FORMATS.has(format as ReportFormat)) {
      throw new HttpError(400, `Invalid format: ${format}. Use JSON, HTML, CSV, or PDF.`);
    }

    const scan = await getScanForReport(req.params.id);
    const { report, contentType } = await getOrCreateReport(req.params.id, format as ReportFormat);

    const fileName = `${safeFileName(formatImageRef(scan.image))}-${scan.id.slice(-8)}.${report.path.split(".").pop()}`;
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.sendFile(report.path);
  })
);
