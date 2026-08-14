import { useNavigate } from "react-router-dom";
import { Moon, Sun, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useToast } from "../../context/ToastContext";

export function Topbar({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    showToast("Logged out successfully");
    navigate("/login");
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h1>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-700">
          <div className="text-right">
            <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
              {user?.email}
            </div>
            <div className="text-xs text-slate-400">{user?.role}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
