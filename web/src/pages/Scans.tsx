import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ScanLine, Trash2, XCircle } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/EmptyState";
import { StatusBadge } from "../components/ui/StatusBadge";
import { SeverityCounts } from "../components/ui/SeverityCounts";
import { SearchInput } from "../components/ui/SearchInput";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useCancelScan, useDeleteScan } from "../hooks/useScanActions";
import { formatDateTime, formatImageRef } from "../lib/format";
import type { Image, Paginated, Scan, ScanStatus } from "../types";

const PAGE_SIZE = 15;
const STATUSES: ScanStatus[] = ["RUNNING", "COMPLETED", "FAILED", "CANCELLED"];

export function Scans() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [imageId, setImageId] = useState("");
  const [page, setPage] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<Scan | null>(null);
  const cancelScan = useCancelScan();
  const deleteScan = useDeleteScan();

  const { data: images } = useQuery({
    queryKey: ["images"],
    queryFn: async () => (await api.get<Image[]>("/images")).data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["scans", { search, status, imageId, page }],
    queryFn: async () =>
      (
        await api.get<Paginated<Scan>>("/scans", {
          params: {
            search: search || undefined,
            status: status || undefined,
            imageId: imageId || undefined,
            limit: PAGE_SIZE,
            offset: page * PAGE_SIZE,
          },
        })
      ).data,
    // Socket events invalidate this on any scan lifecycle change; this interval
    // is just a safety net in case the websocket connection drops.
    refetchInterval: (query) =>
      query.state.data?.items.some((s) => s.status === "RUNNING") ? 15_000 : false,
  });

  function updateFilter(setter: (v: string) => void, value: string) {
    setter(value);
    setPage(0);
  }

  const scans = data?.items ?? [];
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <AppLayout title="Scans">
      <Card
        title="All Scans"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={search}
              onChange={(value) => updateFilter(setSearch, value)}
              placeholder="Search by image…"
            />
            <select
              value={status}
              onChange={(e) => updateFilter(setStatus, e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">All statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={imageId}
              onChange={(e) => updateFilter(setImageId, e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">All images</option>
              {images?.map((img) => (
                <option key={img.id} value={img.id}>
                  {img.name}:{img.tag}
                </option>
              ))}
            </select>
          </div>
        }
      >
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : scans.length === 0 ? (
          <EmptyState icon={ScanLine} title="No scans found" description="Adjust your filters or scan an image." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-400 dark:border-slate-800">
                    <th className="py-2 pr-4 font-medium">Image</th>
                    <th className="py-2 pr-4 font-medium">Started</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Severity</th>
                    <th className="py-2 pr-4 font-medium">Total</th>
                    <th className="py-2 pr-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.map((scan) => (
                    <tr key={scan.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                      <td className="py-2.5 pr-4">
                        <Link
                          to={`/images/${scan.image.id}`}
                          className="font-medium text-slate-800 hover:text-sky-600 dark:text-slate-200 dark:hover:text-sky-400"
                        >
                          {formatImageRef(scan.image)}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">
                        {formatDateTime(scan.startedAt)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <StatusBadge status={scan.status} />
                      </td>
                      <td className="py-2.5 pr-4">
                        {scan.status === "COMPLETED" ? <SeverityCounts counts={scan} /> : "—"}
                      </td>
                      <td className="py-2.5 pr-4 font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                        {scan.status === "COMPLETED"
                          ? scan.criticalCount + scan.highCount + scan.mediumCount + scan.lowCount
                          : "—"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="flex justify-end gap-1">
                          <Link
                            to={`/scans/${scan.id}`}
                            className="text-xs font-medium text-sky-600 hover:underline dark:text-sky-400"
                          >
                            View
                          </Link>
                          {user?.role === "ADMIN" && scan.status === "RUNNING" && (
                            <button
                              type="button"
                              onClick={() => cancelScan.mutate(scan.id)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950"
                              title="Cancel scan"
                            >
                              <XCircle size={15} />
                            </button>
                          )}
                          {user?.role === "ADMIN" && scan.status !== "RUNNING" && (
                            <button
                              type="button"
                              onClick={() => setPendingDelete(scan)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                              title="Delete scan"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Showing {from}-{to} of {total}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-30 dark:border-slate-700"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => (to < total ? p + 1 : p))}
                  disabled={to >= total}
                  className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-30 dark:border-slate-700"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete scan"
        description={`Delete this scan of ${pendingDelete ? formatImageRef(pendingDelete.image) : ""}? Its vulnerability records and reports will be removed too.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) deleteScan.mutate(pendingDelete.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </AppLayout>
  );
}
