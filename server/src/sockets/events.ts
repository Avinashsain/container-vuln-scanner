import type { Vulnerability } from "@prisma/client";
import { getIo } from "./io";

interface ImageRef {
  id: string;
  repository: string;
  name: string;
  tag: string;
}

function emit(scanId: string, event: string, payload: unknown) {
  const io = getIo();
  if (!io) return;
  io.to("dashboard").to(`scan:${scanId}`).emit(event, payload);
}

export function emitScanStarted(scanId: string, image: ImageRef) {
  emit(scanId, "scan.started", { scanId, imageId: image.id, image });
}

export function emitScanProgress(scanId: string, progress: number, stage: string) {
  emit(scanId, "scan.progress", { scanId, progress, stage });
}

export function emitScanCompleted(
  scanId: string,
  imageId: string,
  summary: { critical: number; high: number; medium: number; low: number }
) {
  emit(scanId, "scan.completed", {
    scanId,
    imageId,
    summary: { ...summary, total: summary.critical + summary.high + summary.medium + summary.low },
  });
}

export function emitScanFailed(scanId: string, imageId: string, error: string) {
  emit(scanId, "scan.failed", { scanId, imageId, error });
}

export function emitScanCancelled(scanId: string, imageId: string) {
  emit(scanId, "scan.cancelled", { scanId, imageId });
}

export function emitVulnerabilityFound(scanId: string, vulnerability: Vulnerability) {
  emit(scanId, "vulnerability.found", { scanId, vulnerability });
}
