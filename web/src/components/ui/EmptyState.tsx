import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white/50 py-16 text-center dark:border-slate-700 dark:bg-slate-900/50">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Icon size={22} />
      </div>
      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</div>
      {description && (
        <div className="max-w-sm text-xs text-slate-500 dark:text-slate-400">{description}</div>
      )}
    </div>
  );
}
