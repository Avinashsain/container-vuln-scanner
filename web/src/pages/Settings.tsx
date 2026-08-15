import { useState } from "react";
import { DatabaseZap, Download, Moon, Sun, Trash2 } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Spinner } from "../components/ui/Spinner";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useImportReports, useResetData } from "../hooks/useAdminActions";

export function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const importReports = useImportReports();
  const resetData = useResetData();
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <AppLayout title="Settings">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Account">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Email</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-100">{user?.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 dark:text-slate-400">Role</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-100">{user?.role}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Appearance">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-800 dark:text-slate-100">Theme</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Switch between light and dark mode
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
        </Card>

        {user?.role === "ADMIN" && (
          <Card title="Data Management" className="lg:col-span-2">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                    <Download size={15} />
                    Pull Data
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Import any scan JSON currently in <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">reports/</code>{" "}
                    that isn't in the database yet — the same one-time backfill as{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">npm run import:reports</code>, without a terminal.
                  </p>
                  <button
                    type="button"
                    onClick={() => importReports.mutate()}
                    disabled={importReports.isPending}
                    className="mt-3 flex items-center gap-2 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                  >
                    {importReports.isPending ? <Spinner size={14} className="text-white" /> : <Download size={14} />}
                    Pull Data
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-lg border border-red-200 p-4 dark:border-red-900">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
                    <DatabaseZap size={15} />
                    Reset Data
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Permanently deletes every image, scan, vulnerability, and report. User accounts are
                    kept. Use <span className="font-medium">Pull Data</span> afterward to repopulate from{" "}
                    <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">reports/</code>.
                  </p>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    disabled={resetData.isPending}
                    className="mt-3 flex items-center gap-2 rounded-lg border border-red-300 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950"
                  >
                    {resetData.isPending ? <Spinner size={14} /> : <Trash2 size={14} />}
                    Reset Data
                  </button>
                </div>
              </div>
            </div>
          </Card>
        )}

        <Card title="Scanner Configuration" className="lg:col-span-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Scan thresholds and exception management (from{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">
              configs/scanner-config.env
            </code>
            ) become editable here in a later phase.
          </p>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all scan data"
        description="This deletes every image, scan, vulnerability, and report from the database. User accounts are not affected. This cannot be undone."
        confirmLabel="Reset Data"
        onConfirm={() => {
          resetData.mutate();
          setConfirmReset(false);
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </AppLayout>
  );
}
