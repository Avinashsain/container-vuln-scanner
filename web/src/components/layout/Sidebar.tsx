import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Container,
  Bug,
  ScanLine,
  FileText,
  Users,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/images", label: "Images", icon: Container },
  { to: "/vulnerabilities", label: "Vulnerabilities", icon: Bug },
  { to: "/scans", label: "Scans", icon: ScanLine },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/users", label: "Users", icon: Users, adminOnly: true },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2 px-5 py-5">
        <ShieldCheck className="text-sky-600 dark:text-sky-400" size={24} />
        <span className="text-sm font-bold leading-tight text-slate-900 dark:text-slate-50">
          Vuln Scanner
        </span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.filter((item) => !item.adminOnly || user?.role === "ADMIN").map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-400 dark:border-slate-800">
        v0.1.0 — Phase 1
      </div>
    </aside>
  );
}
