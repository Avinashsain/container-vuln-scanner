import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env";
import { formatImageRef, safeFileName } from "../lib/imageRef";
import { prisma } from "../lib/prisma";
import { readScannerConfig } from "../lib/scannerConfig";
import {
  countBySeverity,
  extractVulnerabilities,
  isTrivyImageReport,
  toVulnerabilityRows,
} from "../lib/trivyParser";
import {
  emitScanCancelled,
  emitScanCompleted,
  emitScanFailed,
  emitScanProgress,
  emitScanStarted,
  emitVulnerabilityFound,
} from "../sockets/events";

const runningScans = new Map<string, ChildProcessWithoutNullStreams>();
const progressTimers = new Map<string, ReturnType<typeof setInterval>>();

function timestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  );
}

function stopProgressTimer(scanId: string) {
  const timer = progressTimers.get(scanId);
  if (timer) {
    clearInterval(timer);
    progressTimers.delete(scanId);
  }
}

/**
 * Trivy doesn't expose granular "packages analyzed / CVEs matched" progress —
 * it returns one JSON blob at the end. This simulates a smooth climb toward
 * ~90% while the process runs (persisted so REST polling sees it too), then
 * the real completion handler jumps straight to 100.
 */
function startProgressTimer(scanId: string) {
  let progress = 5;
  const stages = ["Pulling image", "Analyzing packages", "Finding CVEs"];
  const tick = async () => {
    progress = Math.min(progress + Math.max(1, (90 - progress) * 0.15), 90);
    const stage = stages[Math.min(stages.length - 1, Math.floor((progress / 90) * stages.length))];
    await prisma.scan
      .update({ where: { id: scanId }, data: { progress: Math.round(progress), stage } })
      .catch(() => undefined);
    emitScanProgress(scanId, Math.round(progress), stage);
  };
  progressTimers.set(scanId, setInterval(() => void tick(), 1200));
  void tick();
}

async function markFailed(scanId: string, imageId: string, errorMessage: string) {
  stopProgressTimer(scanId);
  await prisma.scan
    .update({
      where: { id: scanId },
      data: { status: "FAILED", errorMessage: errorMessage.slice(0, 2000), completedAt: new Date() },
    })
    .catch(() => undefined);
  emitScanFailed(scanId, imageId, errorMessage);
}

export function isScanRunning(scanId: string): boolean {
  return runningScans.has(scanId);
}

export async function startScan(image: {
  id: string;
  repository: string;
  name: string;
  tag: string;
}) {
  const scan = await prisma.scan.create({
    data: { imageId: image.id, status: "RUNNING", progress: 0, stage: "Scanning" },
  });

  emitScanStarted(scan.id, image);
  startProgressTimer(scan.id);
  runScanProcess(scan.id, image).catch((err) => markFailed(scan.id, image.id, err?.message ?? String(err)));

  return scan;
}

async function runScanProcess(
  scanId: string,
  image: { id: string; repository: string; name: string; tag: string }
) {
  const imageRef = formatImageRef(image);
  const config = readScannerConfig();
  const args = ["image", "--format", "json", "--quiet", imageRef];
  if (config.ignoreUnfixed) args.push("--ignore-unfixed");

  const child = spawn("trivy", args, { cwd: env.repoRoot });
  runningScans.set(scanId, child);

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => (stdout += chunk));
  child.stderr.on("data", (chunk) => (stderr += chunk));

  child.on("error", async (err) => {
    runningScans.delete(scanId);
    await markFailed(scanId, image.id, `Failed to start trivy: ${err.message}`);
  });

  child.on("close", async (code) => {
    runningScans.delete(scanId);
    stopProgressTimer(scanId);

    const current = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!current || current.status === "CANCELLED") return;

    if (code !== 0) {
      await markFailed(scanId, image.id, stderr.trim().slice(-2000) || `trivy exited with code ${code}`);
      return;
    }

    try {
      const data: unknown = JSON.parse(stdout);
      if (!isTrivyImageReport(data)) {
        throw new Error("Unexpected trivy output format");
      }

      const vulnerabilities = extractVulnerabilities(data);
      const counts = countBySeverity(vulnerabilities);

      await prisma.$transaction(async (tx) => {
        await tx.scan.update({
          where: { id: scanId },
          data: {
            status: "COMPLETED",
            progress: 100,
            stage: null,
            completedAt: new Date(),
            scannerVersion: data.Trivy?.Version ?? null,
            criticalCount: counts.CRITICAL,
            highCount: counts.HIGH,
            mediumCount: counts.MEDIUM,
            lowCount: counts.LOW,
            unknownCount: counts.UNKNOWN,
          },
        });

        if (vulnerabilities.length > 0) {
          await tx.vulnerability.createMany({ data: toVulnerabilityRows(scanId, vulnerabilities) });
        }
      });

      emitScanCompleted(scanId, image.id, {
        critical: counts.CRITICAL,
        high: counts.HIGH,
        medium: counts.MEDIUM,
        low: counts.LOW,
      });

      if (vulnerabilities.length > 0) {
        const saved = await prisma.vulnerability.findMany({ where: { scanId } });
        for (const vuln of saved) emitVulnerabilityFound(scanId, vuln);
      }

      // Raw trivy output, kept alongside CLI-driven scans for continuity with
      // scripts/scan_image.sh — not registered as a Report row. Downloadable
      // reports (Phase 4) are generated on demand from Scan/Vulnerability rows
      // via report.service.ts so every format reflects the same numbers as the UI.
      fs.mkdirSync(env.reportsDir, { recursive: true });
      const fileName = `${safeFileName(imageRef)}-${timestamp()}.json`;
      const filePath = path.join(env.reportsDir, fileName);
      fs.writeFileSync(filePath, stdout);
    } catch (err) {
      await markFailed(scanId, image.id, err instanceof Error ? err.message : String(err));
    }
  });
}

export async function cancelScan(scanId: string): Promise<boolean> {
  const child = runningScans.get(scanId);
  if (!child) return false;

  const scan = await prisma.scan.update({
    where: { id: scanId },
    data: { status: "CANCELLED", errorMessage: "Cancelled by user", completedAt: new Date() },
  });
  stopProgressTimer(scanId);
  runningScans.delete(scanId);
  child.kill("SIGTERM");
  emitScanCancelled(scanId, scan.imageId);
  return true;
}
