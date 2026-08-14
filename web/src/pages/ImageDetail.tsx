import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Container, ScanLine, History, Clock } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { StatusBadge } from "../components/ui/StatusBadge";
import { SeverityCounts } from "../components/ui/SeverityCounts";
import { EmptyState } from "../components/ui/EmptyState";
import { SeverityTrendChart } from "../components/charts/SeverityTrendChart";
import { VulnerabilityTable } from "../components/VulnerabilityTable";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTriggerScan, useUpdateSchedule } from "../hooks/useScanActions";
import { formatDateTime, formatImageRef } from "../lib/format";
import type { Image, ScanDetail, ScanSummary } from "../types";

const SCHEDULE_OPTIONS = [
  { label: "Off", value: "" },
  { label: "Every hour", value: "60" },
  { label: "Every 6 hours", value: "360" },
  { label: "Every 24 hours", value: "1440" },
  { label: "Every week", value: "10080" },
];

export function ImageDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const triggerScan = useTriggerScan();
  const updateSchedule = useUpdateSchedule(id!);

  const { data: image, isLoading } = useQuery({
    queryKey: ["images", id],
    queryFn: async () => (await api.get<Image>(`/images/${id}`)).data,
    // Socket events invalidate this on any scan lifecycle change; this interval
    // is just a safety net in case the websocket connection drops.
    refetchInterval: (query) => (query.state.data?.latestScan?.status === "RUNNING" ? 15_000 : false),
  });

  const { data: history } = useQuery({
    queryKey: ["images", id, "history"],
    queryFn: async () => (await api.get<ScanSummary[]>(`/images/${id}/history`)).data,
  });

  const { data: latestScanDetail } = useQuery({
    queryKey: ["scans", image?.latestScan?.id],
    queryFn: async () => (await api.get<ScanDetail>(`/scans/${image!.latestScan!.id}`)).data,
    enabled: Boolean(image?.latestScan && image.latestScan.status === "COMPLETED"),
  });

  if (isLoading || !image) {
    return (
      <AppLayout title="Image Details">
        <div className="flex justify-center py-20">
          <Spinner size={28} />
        </div>
      </AppLayout>
    );
  }

  const trendData = (history ?? [])
    .filter((s) => s.status === "COMPLETED")
    .map((s) => ({
      date: s.startedAt,
      critical: s.criticalCount,
      high: s.highCount,
      medium: s.mediumCount,
      low: s.lowCount,
    }));

  return (
    <AppLayout title={formatImageRef(image)}>
      <div className="space-y-6">
        <Card
          title="Image Information"
          action={
            user?.role === "ADMIN" && (
              <button
                type="button"
                onClick={() => triggerScan.mutate(image.id)}
                disabled={image.latestScan?.status === "RUNNING"}
                className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
              >
                <ScanLine size={16} />
                {image.latestScan?.status === "RUNNING" ? "Scanning…" : "Scan Now"}
              </button>
            )
          }
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
            <Field label="Repository" value={image.repository || "—"} />
            <Field label="Name" value={image.name} />
            <Field label="Tag" value={image.tag} />
            <Field label="Registry" value={image.registry ?? "docker.io"} />
            <Field
              label="Image ID"
              value={image.imageId ? image.imageId.replace("sha256:", "").slice(0, 20) : "—"}
              mono
            />
            <Field label="Created" value={formatDateTime(image.createdAt)} />
            <Field label="Last Scan" value={image.latestScan ? formatDateTime(image.latestScan.startedAt) : "Never"} />
            <Field label="Scanner Version" value={image.latestScan?.scannerVersion ?? "—"} />
            <div>
              <div className="text-xs font-medium uppercase text-slate-400">Auto-Scan</div>
              {user?.role === "ADMIN" ? (
                <select
                  value={String(image.scanIntervalMinutes ?? "")}
                  onChange={(e) =>
                    updateSchedule.mutate(e.target.value === "" ? null : Number(e.target.value))
                  }
                  className="mt-0.5 rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  {SCHEDULE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-0.5 flex items-center gap-1 text-slate-800 dark:text-slate-200">
                  <Clock size={12} />
                  {SCHEDULE_OPTIONS.find((o) => o.value === String(image.scanIntervalMinutes ?? ""))?.label ?? "Off"}
                </div>
              )}
            </div>
          </div>

          {image.latestScan && (
            <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
              <StatusBadge status={image.latestScan.status} />
              {image.latestScan.status === "COMPLETED" && <SeverityCounts counts={image.latestScan} />}
              {image.latestScan.status === "FAILED" && image.latestScan.errorMessage && (
                <span className="text-xs text-red-600 dark:text-red-400">{image.latestScan.errorMessage}</span>
              )}
            </div>
          )}
        </Card>

        <Card title="Vulnerability Trend">
          <SeverityTrendChart data={trendData} />
        </Card>

        <Card title="Scan History">
          {!history || history.length === 0 ? (
            <EmptyState icon={History} title="No scan history" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-400 dark:border-slate-800">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Severity</th>
                    <th className="py-2 pr-4 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {[...history].reverse().map((scan) => (
                    <tr key={scan.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                      <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">
                        {formatDateTime(scan.startedAt)}
                      </td>
                      <td className="py-2 pr-4">
                        <StatusBadge status={scan.status} />
                      </td>
                      <td className="py-2 pr-4">
                        {scan.status === "COMPLETED" ? <SeverityCounts counts={scan} /> : "—"}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <Link
                          to={`/scans/${scan.id}`}
                          className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Vulnerabilities">
          {!image.latestScan ? (
            <EmptyState icon={Container} title="No scans yet for this image" />
          ) : image.latestScan.status !== "COMPLETED" ? (
            <EmptyState
              icon={Container}
              title={`Latest scan ${image.latestScan.status.toLowerCase()}`}
              description="Vulnerability details appear here once a scan completes successfully."
            />
          ) : (
            <VulnerabilityTable vulnerabilities={latestScanDetail?.vulnerabilities ?? []} />
          )}
        </Card>
      </div>
    </AppLayout>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase text-slate-400">{label}</div>
      <div className={`mt-0.5 text-slate-800 dark:text-slate-200 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </div>
    </div>
  );
}
