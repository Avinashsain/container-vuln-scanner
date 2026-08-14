import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Container, Plus, ScanLine, ExternalLink } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { Spinner } from "../components/ui/Spinner";
import { StatusBadge } from "../components/ui/StatusBadge";
import { SeverityCounts } from "../components/ui/SeverityCounts";
import { SearchInput } from "../components/ui/SearchInput";
import { AddImageModal } from "../components/AddImageModal";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useTriggerScan } from "../hooks/useScanActions";
import { formatImageRef, formatDateTime } from "../lib/format";
import type { Image, ScanStatus } from "../types";

type ImageStatusFilter = ScanStatus | "NEVER" | "";

const STATUS_OPTIONS: Array<{ label: string; value: ImageStatusFilter }> = [
  { label: "All statuses", value: "" },
  { label: "Never scanned", value: "NEVER" },
  { label: "Running", value: "RUNNING" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Failed", value: "FAILED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export function Images() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ImageStatusFilter>("");
  const triggerScan = useTriggerScan();

  const { data: images, isLoading } = useQuery({
    queryKey: ["images"],
    queryFn: async () => (await api.get<Image[]>("/images")).data,
    // Socket events invalidate this on any scan lifecycle change; this interval
    // is just a safety net in case the websocket connection drops.
    refetchInterval: (query) =>
      query.state.data?.some((i) => i.latestScan?.status === "RUNNING") ? 15_000 : false,
  });

  const filteredImages = useMemo(() => {
    if (!images) return images;
    const term = search.trim().toLowerCase();
    return images.filter((image) => {
      const matchesSearch =
        !term ||
        formatImageRef(image).toLowerCase().includes(term) ||
        image.imageId?.toLowerCase().includes(term);
      const matchesStatus =
        !status || (status === "NEVER" ? !image.latestScan : image.latestScan?.status === status);
      return matchesSearch && matchesStatus;
    });
  }, [images, search, status]);

  return (
    <AppLayout title="Images">
      <Card
        title="All Images"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search repository, name, or tag…" />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ImageStatusFilter)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {user?.role === "ADMIN" && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700"
              >
                <Plus size={16} />
                Scan New Image
              </button>
            )}
          </div>
        }
      >
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : !images || images.length === 0 ? (
          <EmptyState
            icon={Container}
            title="No images yet"
            description="Add an image to run your first scan."
          />
        ) : !filteredImages || filteredImages.length === 0 ? (
          <EmptyState icon={Container} title="No images match your filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-400 dark:border-slate-800">
                  <th className="py-2 pr-4 font-medium">Image</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Severity</th>
                  <th className="py-2 pr-4 font-medium">Last Scan</th>
                  <th className="py-2 pr-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredImages.map((image) => (
                  <tr
                    key={image.id}
                    className="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
                  >
                    <td className="py-2.5 pr-4">
                      <Link
                        to={`/images/${image.id}`}
                        className="font-medium text-slate-800 hover:text-sky-600 dark:text-slate-200 dark:hover:text-sky-400"
                      >
                        {formatImageRef(image)}
                      </Link>
                      {image.imageId && (
                        <div className="font-mono text-xs text-slate-400">
                          {image.imageId.replace("sha256:", "").slice(0, 12)}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      {image.latestScan ? (
                        <StatusBadge status={image.latestScan.status} />
                      ) : (
                        <span className="text-xs text-slate-400">Never scanned</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      {image.latestScan && image.latestScan.status === "COMPLETED" ? (
                        <SeverityCounts counts={image.latestScan} />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">
                      {image.latestScan ? formatDateTime(image.latestScan.startedAt) : "—"}
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex justify-end gap-1">
                        {user?.role === "ADMIN" && (
                          <button
                            type="button"
                            onClick={() => triggerScan.mutate(image.id)}
                            disabled={image.latestScan?.status === "RUNNING"}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-sky-950"
                            title="Scan now"
                          >
                            <ScanLine size={16} />
                          </button>
                        )}
                        <Link
                          to={`/images/${image.id}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                          title="View details"
                        >
                          <ExternalLink size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <AddImageModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </AppLayout>
  );
}
