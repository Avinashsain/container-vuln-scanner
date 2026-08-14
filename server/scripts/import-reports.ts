import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { parseImageRef } from "../src/lib/imageRef";
import {
  countBySeverity,
  extractVulnerabilities,
  isTrivyImageReport,
  toVulnerabilityRows,
  type TrivyReport,
} from "../src/lib/trivyParser";

const prisma = new PrismaClient();

const REPORTS_DIR = process.env.REPORTS_DIR ?? path.resolve(__dirname, "../../reports");

async function importFile(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf-8");
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    console.warn(`Skipping ${path.basename(filePath)}: invalid JSON`);
    return "skipped" as const;
  }

  if (!isTrivyImageReport(data)) {
    console.warn(`Skipping ${path.basename(filePath)}: not a Trivy image report`);
    return "skipped" as const;
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
  if (existing) return "duplicate" as const;

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

  return "imported" as const;
}

async function main() {
  const files = fs
    .readdirSync(REPORTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => path.join(REPORTS_DIR, f));

  console.log(`Found ${files.length} JSON files in ${REPORTS_DIR}`);

  const tally = { imported: 0, duplicate: 0, skipped: 0 };
  for (const file of files) {
    const result = await importFile(file);
    tally[result] += 1;
  }

  console.log(
    `Done. Imported: ${tally.imported}, already present: ${tally.duplicate}, skipped: ${tally.skipped}`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
