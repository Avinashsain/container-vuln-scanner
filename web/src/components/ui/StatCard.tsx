import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "default" | "critical" | "high" | "medium" | "low";
}

const ACCENTS: Record<string, string> = {
  default: "text-sky-600 bg-sky-100 dark:text-sky-300 dark:bg-sky-950",
  critical: "text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-950",
  high: "text-orange-600 bg-orange-100 dark:text-orange-300 dark:bg-orange-950",
  medium: "text-amber-600 bg-amber-100 dark:text-amber-300 dark:bg-amber-950",
  low: "text-emerald-600 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-950",
};

export function StatCard({ label, value, icon: Icon, accent = "default" }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${ACCENTS[accent]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <div
          className={`truncate font-semibold tabular-nums text-slate-900 dark:text-slate-50 ${
            typeof value === "string" ? "text-base" : "text-2xl"
          }`}
          title={String(value)}
        >
          {value}
        </div>
        <div className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
          {label}
        </div>
      </div>
    </div>
  );
}
