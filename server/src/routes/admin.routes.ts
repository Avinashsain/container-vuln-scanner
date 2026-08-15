import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { importReportsFromDisk, resetScanData } from "../services/importReports.service";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("ADMIN"));

adminRouter.post(
  "/import-reports",
  asyncHandler(async (_req, res) => {
    const tally = await importReportsFromDisk();
    res.json(tally);
  })
);

adminRouter.post(
  "/reset",
  asyncHandler(async (_req, res) => {
    const result = await resetScanData();
    res.json(result);
  })
);
