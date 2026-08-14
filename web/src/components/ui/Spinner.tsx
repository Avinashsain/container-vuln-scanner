import { Loader2 } from "lucide-react";

export function Spinner({ size = 20, className = "" }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin text-slate-400 ${className}`} />;
}

export function FullPageSpinner() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Spinner size={28} />
    </div>
  );
}
