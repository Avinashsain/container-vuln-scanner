interface Counts {
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

const ITEMS: Array<{ key: keyof Counts; label: string; className: string }> = [
  { key: "criticalCount", label: "C", className: "text-red-600 dark:text-red-400" },
  { key: "highCount", label: "H", className: "text-orange-600 dark:text-orange-400" },
  { key: "mediumCount", label: "M", className: "text-amber-600 dark:text-amber-400" },
  { key: "lowCount", label: "L", className: "text-emerald-600 dark:text-emerald-400" },
];

export function SeverityCounts({ counts }: { counts: Counts }) {
  return (
    <div className="flex items-center gap-3 text-xs font-semibold tabular-nums">
      {ITEMS.map((item) => (
        <span key={item.key} className={item.className} title={item.label}>
          {counts[item.key]}
          <span className="ml-0.5 font-normal text-slate-400">{item.label}</span>
        </span>
      ))}
    </div>
  );
}
