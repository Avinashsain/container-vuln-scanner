import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Eye, FileText } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { EmptyState } from "../components/ui/EmptyState";
import { SeverityCounts } from "../components/ui/SeverityCounts";
import { SearchInput } from "../components/ui/SearchInput";
import { api } from "../api/client";
import { formatDateTime, formatImageRef } from "../lib/format";
import type { Image, Paginated, Scan } from "../types";

const PAGE_SIZE = 15;
const FORMATS = ["JSON", "HTML", "CSV", "PDF"] as const;

export function Reports() {
  const [search, setSearch] = useState("");
  const [imageId, setImageId] = useState("");
  const [page, setPage] = useState(0);

  const { data: images } = useQuery({
    queryKey: ["images"],
    queryFn: async () => (await api.get<Image[]>("/images")).data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["reports", { search, imageId, page }],
    queryFn: async () =>
      (
        await api.get<Paginated<Scan>>("/reports", {
          params: {
            search: search || undefined,
            imageId: imageId || undefined,
            limit: PAGE_SIZE,
            offset: page * PAGE_SIZE,
          },
        })
      ).data,
  });

  const reports = data?.items ?? [];
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <AppLayout title="Reports">
      <Card
        title="Scan Reports"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(0);
              }}
              placeholder="Search by image…"
            />
            <select
              value={imageId}
              onChange={(e) => {
                setImageId(e.target.value);
                setPage(0);
              }}
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
        ) : reports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No reports yet"
            description="Reports become available once a scan completes successfully."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase text-slate-400 dark:border-slate-800">
                    <th className="py-2 pr-4 font-medium">Image</th>
                    <th className="py-2 pr-4 font-medium">Scan Date</th>
                    <th className="py-2 pr-4 font-medium">Severity</th>
                    <th className="py-2 pr-4 font-medium">Total</th>
                    <th className="py-2 pr-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((scan) => (
                    <tr key={scan.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                      <td className="py-2.5 pr-4 font-medium text-slate-800 dark:text-slate-200">
                        {formatImageRef(scan.image)}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-500 dark:text-slate-400">
                        {formatDateTime(scan.startedAt)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <SeverityCounts counts={scan} />
                      </td>
                      <td className="py-2.5 pr-4 font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                        {scan.criticalCount + scan.highCount + scan.mediumCount + scan.lowCount}
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/reports/${scan.id}`}
                            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-sky-600 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950"
                          >
                            <Eye size={13} />
                            View
                          </Link>
                          {FORMATS.map((fmt) => (
                            <a
                              key={fmt}
                              href={`/api/reports/${scan.id}/download?format=${fmt}`}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                              title={`Download ${fmt}`}
                            >
                              {fmt}
                            </a>
                          ))}
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
    </AppLayout>
  );
}
