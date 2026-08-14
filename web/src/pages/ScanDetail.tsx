import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Trash2, XCircle } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { StatusBadge } from "../components/ui/StatusBadge";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { VulnerabilityTable } from "../components/VulnerabilityTable";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useScanProgress } from "../context/SocketContext";
import { useCancelScan, useDeleteScan } from "../hooks/useScanActions";
import { formatDateTime, formatImageRef } from "../lib/format";
import type { ScanDetail as ScanDetailType } from "../types";

const SEVERITY_TILES: Array<{ key: "criticalCount" | "highCount" | "mediumCount" | "lowCount"; label: string; className: string }> = [
  { key: "criticalCount", label: "Critical", className: "text-red-600 dark:text-red-400" },
  { key: "highCount", label: "High", className: "text-orange-600 dark:text-orange-400" },
  { key: "mediumCount", label: "Medium", className: "text-amber-600 dark:text-amber-400" },
  { key: "lowCount", label: "Low", className: "text-emerald-600 dark:text-emerald-400" },
];

export function ScanDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const cancelScan = useCancelScan();
  const deleteScan = useDeleteScan();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: scan, isLoading } = useQuery({
    queryKey: ["scans", id],
    queryFn: async () => (await api.get<ScanDetailType>(`/scans/${id}`)).data,
    // Socket events invalidate this query the instant something changes; this is
    // just a safety net in case the websocket connection drops.
    refetchInterval: (query) => (query.state.data?.status === "RUNNING" ? 10_000 : false),
  });

  const liveProgress = useScanProgress(scan?.status === "RUNNING" ? id : undefined);

  if (isLoading || !scan) {
    return (
      <AppLayout title="Scan Details">
        <div className="flex justify-center py-20">
          <Spinner size={28} />
        </div>
      </AppLayout>
    );
  }

  const total = scan.criticalCount + scan.highCount + scan.mediumCount + scan.lowCount;

  return (
    <AppLayout title="Scan Details">
      <div className="space-y-6">
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-medium uppercase text-slate-400">Image</div>
              <Link
                to={`/images/${scan.image.id}`}
                className="text-lg font-semibold text-slate-900 hover:text-sky-600 dark:text-slate-50 dark:hover:text-sky-400"
              >
                {formatImageRef(scan.image)}
              </Link>
              <div className="mt-2 flex items-center gap-3">
                <StatusBadge status={scan.status} />
                <span className="text-xs text-slate-400">Started {formatDateTime(scan.startedAt)}</span>
                {scan.completedAt && (
                  <span className="text-xs text-slate-400">· Completed {formatDateTime(scan.completedAt)}</span>
                )}
              </div>
            </div>
            {user?.role === "ADMIN" && (
              <div className="flex gap-2">
                {scan.status === "RUNNING" && (
                  <button
                    type="button"
                    onClick={() => cancelScan.mutate(scan.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950"
                  >
                    <XCircle size={15} />
                    Cancel Scan
                  </button>
                )}
                {scan.status !== "RUNNING" && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
                  >
                    <Trash2 size={15} />
                    Delete Scan
                  </button>
                )}
              </div>
            )}
          </div>

          {scan.status === "RUNNING" && (
            <div className="mt-6">
              <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>{liveProgress?.stage ?? scan.stage ?? "Scanning"}</span>
                <span>{liveProgress?.progress ?? scan.progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-sky-500 transition-all duration-700"
                  style={{ width: `${Math.max(liveProgress?.progress ?? scan.progress, 8)}%` }}
                />
              </div>
            </div>
          )}

          {scan.status === "FAILED" && scan.errorMessage && (
            <div className="mt-6 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span className="font-mono text-xs">{scan.errorMessage}</span>
            </div>
          )}

          {scan.status === "COMPLETED" && (
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
              {SEVERITY_TILES.map((tile) => (
                <div key={tile.key} className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800/60">
                  <div className={`text-2xl font-bold ${tile.className}`}>{scan[tile.key]}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{tile.label}</div>
                </div>
              ))}
              <div className="rounded-lg bg-slate-900 p-3 text-center text-white dark:bg-slate-100 dark:text-slate-900">
                <div className="text-2xl font-bold">{total}</div>
                <div className="text-xs opacity-70">Total</div>
              </div>
            </div>
          )}
        </Card>

        {scan.status === "COMPLETED" && (
          <Card title="Vulnerabilities">
            <VulnerabilityTable vulnerabilities={scan.vulnerabilities} />
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete scan"
        description="This removes the scan, its vulnerability records, and any generated reports."
        confirmLabel="Delete"
        onConfirm={() => {
          deleteScan.mutate(scan.id);
          setConfirmDelete(false);
          navigate("/scans");
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </AppLayout>
  );
}
