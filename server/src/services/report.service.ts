import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { Prisma, ReportFormat } from "@prisma/client";
import { env } from "../config/env";
import { toCsv } from "../lib/csv";
import { formatImageRef } from "../lib/imageRef";
import { prisma } from "../lib/prisma";
import { HttpError } from "../middleware/errorHandler";

const scanWithDetails = Prisma.validator<Prisma.ScanDefaultArgs>()({
  include: {
    image: true,
    vulnerabilities: { orderBy: [{ severity: "asc" }, { cvss: "desc" }] },
  },
});
type ScanWithDetails = Prisma.ScanGetPayload<typeof scanWithDetails>;

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#d03b3b",
  HIGH: "#ec835a",
  MEDIUM: "#fab219",
  LOW: "#0ca30c",
  UNKNOWN: "#898781",
};

const GENERATED_DIR = path.join(env.reportsDir, "generated");
const EXTENSIONS: Record<ReportFormat, string> = {
  JSON: "json",
  HTML: "html",
  CSV: "csv",
  PDF: "pdf",
};
const CONTENT_TYPES: Record<ReportFormat, string> = {
  JSON: "application/json",
  HTML: "text/html",
  CSV: "text/csv",
  PDF: "application/pdf",
};

export async function getScanForReport(scanId: string): Promise<ScanWithDetails> {
  const scan = await prisma.scan.findUnique({ where: { id: scanId }, ...scanWithDetails });
  if (!scan) throw new HttpError(404, "Scan not found");
  if (scan.status !== "COMPLETED") {
    throw new HttpError(400, `Reports are only available for completed scans (this scan is ${scan.status})`);
  }
  return scan;
}

export async function getOrCreateReport(scanId: string, format: ReportFormat) {
  const scan = await getScanForReport(scanId);

  const existing = await prisma.report.findFirst({ where: { scanId, format } });
  if (existing && fs.existsSync(existing.path)) {
    return { report: existing, contentType: CONTENT_TYPES[format] };
  }

  fs.mkdirSync(GENERATED_DIR, { recursive: true });
  const filePath = path.join(GENERATED_DIR, `${scanId}.${EXTENSIONS[format]}`);

  if (format === "JSON") {
    fs.writeFileSync(filePath, generateJson(scan));
  } else if (format === "CSV") {
    fs.writeFileSync(filePath, generateCsv(scan));
  } else if (format === "HTML") {
    fs.writeFileSync(filePath, generateHtml(scan));
  } else {
    fs.writeFileSync(filePath, await generatePdf(scan));
  }

  const report = existing
    ? await prisma.report.update({ where: { id: existing.id }, data: { path: filePath } })
    : await prisma.report.create({ data: { scanId, format, path: filePath } });

  return { report, contentType: CONTENT_TYPES[format] };
}

function summary(scan: ScanWithDetails) {
  const { criticalCount, highCount, mediumCount, lowCount, unknownCount } = scan;
  return {
    critical: criticalCount,
    high: highCount,
    medium: mediumCount,
    low: lowCount,
    unknown: unknownCount,
    total: criticalCount + highCount + mediumCount + lowCount,
  };
}

function generateJson(scan: ScanWithDetails): string {
  return JSON.stringify(
    {
      scanId: scan.id,
      image: formatImageRef(scan.image),
      imageId: scan.image.imageId,
      scannedAt: scan.startedAt,
      completedAt: scan.completedAt,
      scannerVersion: scan.scannerVersion,
      summary: summary(scan),
      vulnerabilities: scan.vulnerabilities.map((v) => ({
        id: v.vulnerabilityId,
        package: v.packageName,
        installedVersion: v.installedVersion,
        fixedVersion: v.fixedVersion,
        severity: v.severity,
        cvss: v.cvss,
        title: v.title,
        description: v.description,
        status: v.status,
      })),
    },
    null,
    2
  );
}

function generateCsv(scan: ScanWithDetails): string {
  const rows: string[][] = [
    ["CVE ID", "Package", "Installed Version", "Fixed Version", "Severity", "CVSS", "Status", "Title"],
    ...scan.vulnerabilities.map((v) => [
      v.vulnerabilityId,
      v.packageName,
      v.installedVersion,
      v.fixedVersion ?? "No fix yet",
      v.severity,
      v.cvss?.toString() ?? "",
      v.status ?? "",
      v.title ?? "",
    ]),
  ];
  return toCsv(rows);
}

function generateHtml(scan: ScanWithDetails): string {
  const s = summary(scan);
  const badge = (label: string, count: number, color: string) => `
    <div style="display:inline-block;margin:8px;padding:14px 22px;background:${color};
                color:white;border-radius:8px;text-align:center;min-width:70px">
      <div style="font-size:26px;font-weight:bold">${count}</div>
      <div style="font-size:12px">${label}</div>
    </div>`;

  const rows = scan.vulnerabilities
    .map(
      (v) => `
    <tr>
      <td><a href="https://nvd.nist.gov/vuln/detail/${v.vulnerabilityId}" target="_blank">${v.vulnerabilityId}</a></td>
      <td>${v.packageName}</td>
      <td><span style="background:${SEVERITY_COLORS[v.severity]};color:white;padding:3px 10px;
                        border-radius:12px;font-size:12px">${v.severity}</span></td>
      <td>${v.installedVersion}</td>
      <td>${v.fixedVersion ?? "No fix yet"}</td>
      <td>${v.cvss?.toFixed(1) ?? "—"}</td>
    </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Vulnerability Report - ${formatImageRef(scan.image)}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 30px; background: #f5f5f5; }
  .card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th { background: #263238; color: white; padding: 10px; text-align: left; }
  td { padding: 8px 10px; border-bottom: 1px solid #eee; }
  tr:hover { background: #f0f7ff; }
</style>
</head>
<body>
<div class="card">
  <h1>Container Vulnerability Report</h1>
  <p><b>Image:</b> ${formatImageRef(scan.image)}<br>
     <b>Scan ID:</b> ${scan.id}<br>
     <b>Scanner:</b> Trivy ${scan.scannerVersion ?? ""}<br>
     <b>Scan date:</b> ${scan.startedAt.toISOString()}<br>
     <b>Total findings:</b> ${s.total}</p>
  ${badge("CRITICAL", s.critical, SEVERITY_COLORS.CRITICAL)}
  ${badge("HIGH", s.high, SEVERITY_COLORS.HIGH)}
  ${badge("MEDIUM", s.medium, SEVERITY_COLORS.MEDIUM)}
  ${badge("LOW", s.low, SEVERITY_COLORS.LOW)}
  <table>
    <tr><th>CVE ID</th><th>Package</th><th>Severity</th><th>Installed Version</th><th>Fixed In</th><th>CVSS</th></tr>
    ${rows || '<tr><td colspan="6">No vulnerabilities found!</td></tr>'}
  </table>
</div>
</body>
</html>`;
}

function generatePdf(scan: ScanWithDetails): Promise<Buffer> {
  const s = summary(scan);
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).fillColor("#0b0b0b").text("Container Vulnerability Report", { align: "left" });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor("#52514e");
    doc.text(`Image: ${formatImageRef(scan.image)}`);
    doc.text(`Scan ID: ${scan.id}`);
    doc.text(`Scanner: Trivy ${scan.scannerVersion ?? "unknown"}`);
    doc.text(`Scanned: ${scan.startedAt.toISOString()}`);
    doc.moveDown(1);

    const tiles: Array<[string, number, string]> = [
      ["Critical", s.critical, SEVERITY_COLORS.CRITICAL],
      ["High", s.high, SEVERITY_COLORS.HIGH],
      ["Medium", s.medium, SEVERITY_COLORS.MEDIUM],
      ["Low", s.low, SEVERITY_COLORS.LOW],
    ];
    const tileWidth = 110;
    const tileHeight = 50;
    const startX = doc.page.margins.left;
    const tileY = doc.y;
    tiles.forEach(([label, count, color], i) => {
      const x = startX + i * (tileWidth + 10);
      doc.roundedRect(x, tileY, tileWidth, tileHeight, 6).fill(color);
      doc
        .fillColor("white")
        .fontSize(18)
        .text(String(count), x, tileY + 10, { width: tileWidth, align: "center" });
      doc.fontSize(9).text(label, x, tileY + 32, { width: tileWidth, align: "center" });
    });
    doc.x = startX;
    doc.y = tileY + tileHeight + 20;

    doc.fillColor("#0b0b0b").fontSize(12).text(`Vulnerabilities (${scan.vulnerabilities.length})`, startX, doc.y);
    doc.moveDown(0.5);

    const columns = [
      { label: "CVE ID", width: 100 },
      { label: "Package", width: 90 },
      { label: "Installed", width: 80 },
      { label: "Fixed", width: 80 },
      { label: "Severity", width: 60 },
      { label: "CVSS", width: 40 },
    ];

    function drawHeader() {
      let x = doc.page.margins.left;
      const y = doc.y;
      doc.fontSize(9).fillColor("#ffffff");
      doc.rect(x, y, columns.reduce((sum, c) => sum + c.width, 0), 18).fill("#263238");
      doc.fillColor("#ffffff");
      columns.forEach((col) => {
        doc.text(col.label, x + 4, y + 5, { width: col.width - 6 });
        x += col.width;
      });
      doc.y = y + 18;
      doc.fillColor("#0b0b0b");
    }

    drawHeader();
    scan.vulnerabilities.forEach((v, idx) => {
      if (doc.y > doc.page.height - doc.page.margins.bottom - 30) {
        doc.addPage();
        drawHeader();
      }
      const y = doc.y;
      if (idx % 2 === 0) {
        doc.rect(doc.page.margins.left, y, columns.reduce((sum, c) => sum + c.width, 0), 16).fill("#f5f5f5");
      }
      doc.fillColor("#0b0b0b").fontSize(8);
      let x = doc.page.margins.left;
      const values = [
        v.vulnerabilityId,
        v.packageName,
        v.installedVersion,
        v.fixedVersion ?? "—",
        v.severity,
        v.cvss?.toFixed(1) ?? "—",
      ];
      values.forEach((val, i) => {
        doc.text(val, x + 4, y + 4, { width: columns[i].width - 6, ellipsis: true });
        x += columns[i].width;
      });
      doc.y = y + 16;
    });

    doc.end();
  });
}
