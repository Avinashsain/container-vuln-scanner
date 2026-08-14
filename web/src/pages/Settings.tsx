import { Moon, Sun } from "lucide-react";
import { AppLayout } from "../components/layout/AppLayout";
import { Card } from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

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
    </AppLayout>
  );
}
