import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useAddImage } from "../hooks/useScanActions";
import { Spinner } from "./ui/Spinner";

export function AddImageModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [imageRef, setImageRef] = useState("");
  const addImage = useAddImage();

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    addImage.mutate(imageRef.trim(), {
      onSuccess: () => {
        setImageRef("");
        onClose();
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            Scan a new image
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
              Image reference
            </label>
            <input
              type="text"
              required
              autoFocus
              value={imageRef}
              onChange={(e) => setImageRef(e.target.value)}
              placeholder="nginx:latest or my.registry.com/team/app:1.2.3"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-800"
            />
            <p className="mt-1 text-xs text-slate-400">
              Just the image reference — not the full <code>docker pull</code> command. Trivy
              scans it directly (pulling it if it isn't local yet).
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addImage.isPending}
              className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {addImage.isPending && <Spinner size={14} className="text-white" />}
              Start Scan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
