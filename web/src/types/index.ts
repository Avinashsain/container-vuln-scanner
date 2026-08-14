export type Role = "ADMIN" | "VIEWER";

export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt?: string;
  updatedAt?: string;
}

export interface DashboardSummary {
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalVulnerabilities: number;
  totalImages: number;
  vulnerableImages: number;
  cleanImages: number;
  scansToday: number;
  lastScanTime: string | null;
}

export type ScanStatus = "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";

export interface SeverityCounts {
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  unknownCount: number;
}

export interface ScanSummary extends SeverityCounts {
  id: string;
  status: ScanStatus;
  progress: number;
  stage: string | null;
  errorMessage: string | null;
  scannerVersion: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface ImageRef {
  id: string;
  repository: string;
  name: string;
  tag: string;
}

export interface Image extends ImageRef {
  imageId: string | null;
  registry: string | null;
  createdAt: string;
  updatedAt: string;
  scanIntervalMinutes: number | null;
  lastAutoScanAt: string | null;
  latestScan: ScanSummary | null;
}

export interface Vulnerability {
  id: string;
  scanId: string;
  vulnerabilityId: string;
  packageName: string;
  installedVersion: string;
  fixedVersion: string | null;
  severity: Severity;
  cvss: number | null;
  title: string | null;
  description: string | null;
  status: string | null;
  createdAt: string;
}

export interface VulnerabilityWithContext extends Vulnerability {
  scan: { image: ImageRef };
}

export interface Scan extends ScanSummary {
  imageId: string;
  createdAt: string;
  image: ImageRef;
}

export interface ScanDetail extends Scan {
  vulnerabilities: Vulnerability[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
}

export interface SeverityTrendPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface TopVulnerableImage {
  image: ImageRef;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}
