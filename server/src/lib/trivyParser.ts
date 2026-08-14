import { Severity } from "@prisma/client";

const KNOWN_SEVERITIES = new Set<string>(["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]);

export interface TrivyVulnerability {
  VulnerabilityID: string;
  PkgName: string;
  InstalledVersion: string;
  FixedVersion?: string;
  Severity?: string;
  Title?: string;
  Description?: string;
  Status?: string;
  CVSS?: Record<string, { V3Score?: number; V2Score?: number }>;
}

export interface TrivyReport {
  ArtifactName: string;
  CreatedAt?: string;
  Trivy?: { Version?: string };
  Metadata?: { ImageID?: string };
  Results?: Array<{ Vulnerabilities?: TrivyVulnerability[] }>;
}

export type SeverityCounts = Record<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN", number>;

export function normalizeSeverity(severity: string | undefined): Severity {
  return (KNOWN_SEVERITIES.has(severity ?? "") ? severity! : "UNKNOWN") as Severity;
}

export function bestCvssScore(cvss?: TrivyVulnerability["CVSS"]): number | null {
  if (!cvss) return null;
  let best: number | null = null;
  for (const source of Object.values(cvss)) {
    const score = source.V3Score ?? source.V2Score;
    if (typeof score === "number" && (best === null || score > best)) best = score;
  }
  return best;
}

export function isTrivyImageReport(data: unknown): data is TrivyReport {
  // Trivy omits `Results` entirely (rather than `[]`) when an image has nothing
  // scannable (e.g. `hello-world`) — that's still a valid, clean report.
  if (typeof data !== "object" || data === null) return false;
  const report = data as TrivyReport;
  return (
    typeof report.ArtifactName === "string" &&
    (report.Results === undefined || Array.isArray(report.Results))
  );
}

export function extractVulnerabilities(report: TrivyReport): TrivyVulnerability[] {
  return (report.Results ?? []).flatMap((r) => r.Vulnerabilities ?? []);
}

export function countBySeverity(vulnerabilities: TrivyVulnerability[]): SeverityCounts {
  const counts: SeverityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
  for (const v of vulnerabilities) {
    counts[normalizeSeverity(v.Severity)] += 1;
  }
  return counts;
}

export function toVulnerabilityRows(scanId: string, vulnerabilities: TrivyVulnerability[]) {
  return vulnerabilities.map((v) => ({
    scanId,
    vulnerabilityId: v.VulnerabilityID,
    packageName: v.PkgName,
    installedVersion: v.InstalledVersion,
    fixedVersion: v.FixedVersion ?? null,
    severity: normalizeSeverity(v.Severity),
    cvss: bestCvssScore(v.CVSS),
    title: v.Title?.slice(0, 500) ?? null,
    description: v.Description?.slice(0, 4000) ?? null,
    status: v.Status ?? null,
  }));
}
