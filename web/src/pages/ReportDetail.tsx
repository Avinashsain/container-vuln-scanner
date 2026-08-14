import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileJson, FileSpreadsheet, FileText, FileType } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { VulnerabilityTable } from "../components/VulnerabilityTable";
import { api } from "../api/client";
import { formatDateTime, formatImageRef } from "../lib/format";
import type { ScanDetail } from "../types";

const DOWNLOADS = [
  { format: "JSON", label: "Download JSON", icon: FileJson },
  { format: "HTML", label: "Download HTML", icon: FileText },
  { format: "CSV", label: "Download CSV", icon: FileSpreadsheet },
  { format: "PDF", label: "Download PDF", icon: FileType },
];

const SEVERITY_TILES: Array<{ key: "criticalCount" | "highCount" | "mediumCount" | "lowCount"; label: string; className: string }> = [
  { key: "criticalCount", label: "Critical", className: "text-red-600 dark:text-red-400" },
  { key: "highCount", label: "High", className: "text-orange-600 dark:text-orange-400" },
  { key: "mediumCount", label: "Medium", className: "text-amber-600 dark:text-amber-400" },
  { key: "lowCount", label: "Low", className: "text-emerald-600 dark:text-emerald-400" },
];

export function ReportDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: scan, isLoading } = useQuery({
    queryKey: ["reports", id],
    queryFn: async () => (await api.get<ScanDetail>(`/reports/${id}`)).data,
  });

  if (isLoading || !scan) {
    return (
      <AppLayout title="Report">
        <div className="flex justify-center py-20">
          <Spinner size={28} />
        </div>
      </AppLayout>
    );
  }

  const total = scan.criticalCount + scan.highCount + scan.mediumCount + scan.lowCount;

  return (
    <AppLayout title="Vulnerability Report">
      <div className="space-y-6">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium uppercase text-slate-400">Image</div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                {formatImageRef(scan.image)}
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-4">
                <div>
                  <dt className="inline font-medium">Scan ID: </dt>
                  <dd className="inline font-mono">{scan.id.slice(-12)}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Scanned: </dt>
                  <dd className="inline">{formatDateTime(scan.startedAt)}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Scanner: </dt>
                  <dd className="inline">Trivy {scan.scannerVersion ?? "—"}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Total: </dt>
                  <dd className="inline font-semibold text-slate-700 dark:text-slate-200">{total}</dd>
                </div>
              </dl>
            </div>
            <div className="flex flex-wrap gap-2">
              {DOWNLOADS.map(({ format, label, icon: Icon }) => (
                <a
                  key={format}
                  href={`/api/reports/${scan.id}/download?format=${format}`}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Icon size={14} />
                  {label}
                </a>
              ))}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {SEVERITY_TILES.map((tile) => (
              <div key={tile.key} className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                <div className={`text-2xl font-bold ${tile.className}`}>{scan[tile.key]}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{tile.label}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Vulnerabilities">
          <VulnerabilityTable vulnerabilities={scan.vulnerabilities} />
        </Card>
      </div>
    </AppLayout>
  );
}
