import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env";
import { parseImageRef } from "../lib/imageRef";
import { prisma } from "../lib/prisma";
import {
  countBySeverity,
  extractVulnerabilities,
  isTrivyImageReport,
  toVulnerabilityRows,
  type TrivyReport,
} from "../lib/trivyParser";

export interface ImportTally {
  imported: number;
  duplicate: number;
  skipped: number;
  total: number;
}

async function importFile(filePath: string): Promise<"imported" | "duplicate" | "skipped"> {
  const raw = fs.readFileSync(filePath, "utf-8");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    console.warn(`Skipping ${path.basename(filePath)}: invalid JSON`);
    return "skipped";
  }

  if (!isTrivyImageReport(data)) {
    console.warn(`Skipping ${path.basename(filePath)}: not a Trivy image report`);
    return "skipped";
  }
  const report: TrivyReport = data;

  const { repository, name, tag, registry } = parseImageRef(report.ArtifactName);
  const imageId = report.Metadata?.ImageID ?? null;
  const startedAt = report.CreatedAt ? new Date(report.CreatedAt) : fs.statSync(filePath).mtime;

  const image = await prisma.image.upsert({
    where: { repository_name_tag: { repository, name, tag } },
    update: { imageId: imageId ?? undefined, registry: registry ?? undefined },
    create: { repository, name, tag, imageId, registry },
  });

  const existing = await prisma.scan.findFirst({
    where: { imageId: image.id, startedAt },
    select: { id: true },
  });
  if (existing) return "duplicate";

  const vulnerabilities = extractVulnerabilities(report);
  const counts = countBySeverity(vulnerabilities);

  const scan = await prisma.scan.create({
    data: {
      imageId: image.id,
      status: "COMPLETED",
      scannerVersion: report.Trivy?.Version ?? null,
      progress: 100,
      startedAt,
      completedAt: startedAt,
      criticalCount: counts.CRITICAL,
      highCount: counts.HIGH,
      mediumCount: counts.MEDIUM,
      lowCount: counts.LOW,
      unknownCount: counts.UNKNOWN,
    },
  });

  if (vulnerabilities.length > 0) {
    await prisma.vulnerability.createMany({ data: toVulnerabilityRows(scan.id, vulnerabilities) });
  }

  return "imported";
}

/** Backfills Image/Scan/Vulnerability rows from the raw Trivy JSON files in REPORTS_DIR. */
export async function importReportsFromDisk(reportsDir: string = env.reportsDir): Promise<ImportTally> {
  const files = fs
    .readdirSync(reportsDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(reportsDir, f));

  const tally: ImportTally = { imported: 0, duplicate: 0, skipped: 0, total: files.length };
  for (const file of files) {
    const result = await importFile(file);
    tally[result] += 1;
  }
  return tally;
}

/** Deletes all scan-derived data (Images cascade to Scans, Vulnerabilities, Reports). Users are untouched. */
export async function resetScanData(): Promise<{ imagesDeleted: number }> {
  const { count } = await prisma.image.deleteMany({});
  return { imagesDeleted: count };
}
