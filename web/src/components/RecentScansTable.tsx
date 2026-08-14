import { Link } from "react-router-dom";
import { ScanLine } from "lucide-react";
import { EmptyState } from "./ui/EmptyState";
import { StatusBadge } from "./ui/StatusBadge";
import { SeverityCounts } from "./ui/SeverityCounts";
import { formatDateTime, formatImageRef } from "../lib/format";
import type { Scan } from "../types";

export function RecentScansTable({ scans }: { scans: Scan[] }) {
  if (scans.length === 0) {
    return (
      <EmptyState
        icon={ScanLine}
        title="No scans yet"
        description="Scan an image from the Images page to see activity here."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase text-slate-400 dark:border-slate-800">
            <th className="py-2 pr-4 font-medium">Image</th>
            <th className="py-2 pr-4 font-medium">Scan Time</th>
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 pr-4 font-medium">Severity</th>
            <th className="py-2 pr-4 font-medium">Total</th>
            <th className="py-2 pr-4 font-medium" />
          </tr>
        </thead>
        <tbody>
          {scans.map((scan) => (
            <tr
              key={scan.id}
              className="border-b border-slate-100 last:border-0 dark:border-slate-800/60"
            >
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
              <td className="py-2.5 pr-4 text-right">
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
  );
}
