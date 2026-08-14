import { Router } from "express";
import { Severity } from "@prisma/client";
import { asyncHandler } from "../lib/asyncHandler";
import { prisma } from "../lib/prisma";
import { SEVERITY_RANK } from "../lib/severity";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../middleware/errorHandler";

export const vulnerabilitiesRouter = Router();

vulnerabilitiesRouter.use(requireAuth);

const VALID_SEVERITIES = new Set(Object.values(Severity));

/** scanIds representing each image's latest completed scan — "current" state of the fleet. */
async function latestScanIds(imageId?: string): Promise<string[]> {
  const scans = await prisma.scan.findMany({
    where: { status: "COMPLETED", ...(imageId ? { imageId } : {}) },
    distinct: ["imageId"],
    orderBy: [{ imageId: "asc" }, { startedAt: "desc" }],
    select: { id: true },
  });
  return scans.map((s) => s.id);
}

vulnerabilitiesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { severity, imageId, search } = req.query as {
      severity?: string;
      imageId?: string;
      search?: string;
    };
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Number(req.query.offset) || 0;

    if (severity && !VALID_SEVERITIES.has(severity as Severity)) {
      throw new HttpError(400, `Invalid severity filter: ${severity}`);
    }

    const scanIds = await latestScanIds(imageId);
    if (scanIds.length === 0) return res.json({ items: [], total: 0 });

    const all = await prisma.vulnerability.findMany({
      where: {
        scanId: { in: scanIds },
        ...(severity ? { severity: severity as Severity } : {}),
        ...(search
          ? {
              OR: [
                { vulnerabilityId: { contains: search, mode: "insensitive" } },
                { packageName: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { scan: { select: { image: { select: { id: true, repository: true, name: true, tag: true } } } } },
      take: 5000,
    });

    all.sort((a, b) => {
      const rankDiff = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (rankDiff !== 0) return rankDiff;
      return (b.cvss ?? 0) - (a.cvss ?? 0);
    });

    res.json({ items: all.slice(offset, offset + limit), total: all.length });
  })
);

vulnerabilitiesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const vulnerability = await prisma.vulnerability.findUnique({
      where: { id: req.params.id },
      include: {
        scan: {
          select: {
            id: true,
            startedAt: true,
            status: true,
            image: { select: { id: true, repository: true, name: true, tag: true } },
          },
        },
      },
    });
    if (!vulnerability) throw new HttpError(404, "Vulnerability not found");
    res.json(vulnerability);
  })
);
