import { CheckCircle2, XCircle, Loader2, SlashIcon } from "lucide-react";
import type { ScanStatus } from "../../types";

const CONFIG: Record<ScanStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  RUNNING: {
    label: "Running",
    className: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
    icon: Loader2,
  },
  COMPLETED: {
    label: "Completed",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  FAILED: {
    label: "Failed",
    className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
    icon: XCircle,
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    icon: SlashIcon,
  },
};

export function StatusBadge({ status }: { status: ScanStatus }) {
  const { label, className, icon: Icon } = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      <Icon size={12} className={status === "RUNNING" ? "animate-spin" : ""} />
      {label}
    </span>
  );
}
