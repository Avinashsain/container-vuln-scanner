import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { SearchInput } from "../components/ui/SearchInput";
import { VulnerabilityTable } from "../components/VulnerabilityTable";
import { api } from "../api/client";
import type { Image, Paginated, VulnerabilityWithContext } from "../types";

const PAGE_SIZE = 20;
const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "UNKNOWN"];

export function Vulnerabilities() {
  const [severity, setSeverity] = useState("");
  const [imageId, setImageId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const { data: images } = useQuery({
    queryKey: ["images"],
    queryFn: async () => (await api.get<Image[]>("/images")).data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["vulnerabilities", { severity, imageId, search, page }],
    queryFn: async () =>
      (
        await api.get<Paginated<VulnerabilityWithContext>>("/vulnerabilities", {
          params: {
            severity: severity || undefined,
            imageId: imageId || undefined,
            search: search || undefined,
            limit: PAGE_SIZE,
            offset: page * PAGE_SIZE,
          },
        })
      ).data,
  });

  function updateFilter(setter: (v: string) => void, value: string) {
    setter(value);
    setPage(0);
  }

  const rows = (data?.items ?? []).map((v) => ({ ...v, image: v.scan.image }));
  const total = data?.total ?? 0;
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, (page + 1) * PAGE_SIZE);

  return (
    <AppLayout title="Vulnerabilities">
      <Card
        title="Current Vulnerabilities"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={search}
              onChange={(value) => updateFilter(setSearch, value)}
              placeholder="Search CVE or package…"
            />
            <select
              value={severity}
              onChange={(e) => updateFilter(setSeverity, e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">All severities</option>
              {SEVERITIES.map((s) => (
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
        ) : (
          <>
            <VulnerabilityTable vulnerabilities={rows} />
            {total > 0 && (
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
            )}
          </>
        )}
      </Card>
    </AppLayout>
  );
}
