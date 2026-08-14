import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldAlert,
  ShieldX,
  ShieldQuestion,
  ShieldCheck,
  Bug,
  Container,
  Biohazard,
  Sparkles,
  ScanLine,
  Clock,
} from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { StatCard } from "../components/ui/StatCard";
import { Card } from "../components/ui/Card";
import { Spinner } from "../components/ui/Spinner";
import { SeverityDonutChart } from "../components/charts/SeverityDonutChart";
import { SeverityTrendChart } from "../components/charts/SeverityTrendChart";
import { TopVulnerableImagesChart } from "../components/charts/TopVulnerableImagesChart";
import { RecentScansTable } from "../components/RecentScansTable";
import { api } from "../api/client";
import type {
  DashboardSummary,
  Image,
  Paginated,
  Scan,
  SeverityTrendPoint,
  TopVulnerableImage,
} from "../types";

function formatLastScan(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

const RANGES = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
];

function RangeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
      {RANGES.map((r) => (
        <button
          key={r.key}
          type="button"
          onClick={() => onChange(r.key)}
          className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
            value === r.key
              ? "bg-white text-sky-700 shadow-sm dark:bg-slate-700 dark:text-sky-300"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}

export function Dashboard() {
  const [range, setRange] = useState("30d");
  const [selectedImageId, setSelectedImageId] = useState<string>("");

  const { data: summary, isLoading } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => (await api.get<DashboardSummary>("/dashboard/summary")).data,
    // Socket events invalidate this on any scan lifecycle change; this interval
    // is just a safety net in case the websocket connection drops.
    refetchInterval: 60_000,
  });

  const { data: severity } = useQuery({
    queryKey: ["dashboard", "severity"],
    queryFn: async () =>
      (await api.get<{ CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number }>(
        "/dashboard/severity"
      )).data,
  });

  const { data: trends } = useQuery({
    queryKey: ["dashboard", "trends", range],
    queryFn: async () =>
      (await api.get<SeverityTrendPoint[]>("/dashboard/trends", { params: { range } })).data,
  });

  const { data: topImages } = useQuery({
    queryKey: ["dashboard", "images"],
    queryFn: async () => (await api.get<TopVulnerableImage[]>("/dashboard/images", { params: { limit: 8 } })).data,
  });

  const { data: images } = useQuery({
    queryKey: ["images"],
    queryFn: async () => (await api.get<Image[]>("/images")).data,
  });

  const { data: recentScans } = useQuery({
    queryKey: ["scans", "recent"],
    queryFn: async () => (await api.get<Paginated<Scan>>("/scans", { params: { limit: 10 } })).data,
    refetchInterval: 60_000,
  });

  const effectiveImageId = useMemo(() => {
    if (selectedImageId) return selectedImageId;
    return topImages?.[0]?.image.id ?? "";
  }, [selectedImageId, topImages]);

  const { data: imageTrend } = useQuery({
    queryKey: ["dashboard", "trends", "byImage", effectiveImageId],
    queryFn: async () =>
      (
        await api.get<SeverityTrendPoint[]>("/dashboard/trends", {
          params: { range: "90d", imageId: effectiveImageId },
        })
      ).data,
    enabled: Boolean(effectiveImageId),
  });

  if (isLoading || !summary) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex justify-center py-20">
          <Spinner size={28} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Critical" value={summary.criticalCount} icon={Biohazard} accent="critical" />
          <StatCard label="High" value={summary.highCount} icon={ShieldAlert} accent="high" />
          <StatCard label="Medium" value={summary.mediumCount} icon={ShieldQuestion} accent="medium" />
          <StatCard label="Low" value={summary.lowCount} icon={ShieldCheck} accent="low" />
          <StatCard label="Total Vulnerabilities" value={summary.totalVulnerabilities} icon={Bug} />
          <StatCard label="Total Images" value={summary.totalImages} icon={Container} />
          <StatCard label="Vulnerable Images" value={summary.vulnerableImages} icon={ShieldX} accent="high" />
          <StatCard label="Clean Images" value={summary.cleanImages} icon={Sparkles} accent="low" />
          <StatCard label="Scans Today" value={summary.scansToday} icon={ScanLine} />
          <StatCard label="Last Scan" value={formatLastScan(summary.lastScanTime)} icon={Clock} />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Vulnerabilities by Severity">
            {severity && (
              <SeverityDonutChart
                critical={severity.CRITICAL}
                high={severity.HIGH}
                medium={severity.MEDIUM}
                low={severity.LOW}
              />
            )}
          </Card>

          <Card title="Vulnerabilities Over Time" action={<RangeSelector value={range} onChange={setRange} />}>
            <SeverityTrendChart data={trends ?? []} />
          </Card>

          <Card
            title="Vulnerabilities Over Time by Image"
            action={
              images && (
                <select
                  value={effectiveImageId}
                  onChange={(e) => setSelectedImageId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
                >
                  {images.map((img) => (
                    <option key={img.id} value={img.id}>
                      {img.name}:{img.tag}
                    </option>
                  ))}
                </select>
              )
            }
          >
            <SeverityTrendChart data={imageTrend ?? []} />
          </Card>

          <Card title="Top Vulnerable Images">
            <TopVulnerableImagesChart data={topImages ?? []} />
          </Card>
        </div>

        <Card title="Recent Scans">
          <RecentScansTable scans={recentScans?.items ?? []} />
        </Card>
      </div>
    </AppLayout>
  );
}
