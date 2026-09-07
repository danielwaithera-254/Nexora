import {
  LayoutDashboard,
  CalendarDays,
  LineChart,
  FileText,
  RadioTower,
  FilePen,
  BookOpen,
  Target,
  RotateCcw,
  Settings,
  ChevronRight,
  Bell,
  User,
  ChevronDown,
  Plus,
} from "lucide-react";
import { cn } from "../utils/cn";

export type PageId =
  | "dashboard"
  | "journal"
  | "trades"
  | "mt5"
  | "notebook"
  | "playbooks"
  | "progress"
  | "replay"
  | "resources"
  | "calendar"
  | "accounts"
  | "risk"
  | "settings";

const NAV: { id: PageId; name: string; icon: React.ComponentType<{ size?: number; className?: string }>; badge?: string; badgeVariant?: "live" | "new" | "beta" }[] = [
  { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
  { id: "journal", name: "Daily Journal", icon: CalendarDays },
  { id: "trades", name: "Trades", icon: LineChart },
  { id: "mt5", name: "MT5 Gateway", icon: RadioTower, badge: "LIVE", badgeVariant: "live" },
  { id: "notebook", name: "Notebook", icon: FilePen, badge: "NEW", badgeVariant: "new" },
  { id: "playbooks", name: "Playbooks", icon: BookOpen },
  { id: "progress", name: "Progress Tracker", icon: Target },
  { id: "replay", name: "Trade Replay", icon: RotateCcw, badge: "BETA", badgeVariant: "beta" },
];

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function Sidebar({
  open,
  onClose,
  onNavigate,
  active,
  name,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (id: PageId) => void;
  active: PageId;
  name: string;
}) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col sidebar-bg text-white transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:sticky lg:top-0 lg:h-full lg:translate-x-0 lg:shadow-xl"
        )}
      >
        {/* Brand Section */}
        <div className="space-y-6 p-4">
          <div className="flex items-center space-x-3 px-2 pt-2">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-[#5c1c9c]" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight leading-none text-white">Nexora</h1>
              <p className="text-[10px] uppercase font-bold tracking-widest text-purple-200/70 mt-1">Trading Journal</p>
            </div>
          </div>

          {/* Add Trade Primary CTA */}
          <button
            onClick={() => { onNavigate("trades"); onClose(); }}
            className="w-full py-3 px-4 bg-white text-[#52178d] font-bold rounded-full shadow-lg hover:bg-purple-50 transition-colors flex items-center justify-center space-x-2 group"
          >
            <Plus className="w-5 h-5 text-[#52178d] transition-transform group-hover:scale-110" />
            <span className="text-sm">Add trade</span>
          </button>

          {/* Navigation Menu */}
          <nav className="space-y-1" aria-label="Main Navigation">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-purple-300/80 px-3 pb-2">Workspace</p>
            {NAV.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); onClose(); }}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-2 rounded-full text-sm font-medium transition-all",
                    isActive
                      ? "bg-white text-[#52178d] font-semibold shadow-sm"
                      : "text-purple-100/85 hover:bg-white/10"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-[#52178d]" : "text-purple-200")} />
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className={cn(
                      "ml-auto text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md border",
                      item.badgeVariant === "live"
                        ? "bg-purple-900/60 border-purple-400/40 text-purple-200"
                        : item.badgeVariant === "new"
                        ? "bg-purple-900/60 border-purple-400/40 text-purple-200"
                        : "bg-purple-900/60 border-purple-400/40 text-purple-200"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile Card */}
        <div className="pt-6 border-t border-purple-700/50 mt-6 flex items-center justify-between px-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white text-[#49157c] font-bold text-sm flex items-center justify-center ring-2 ring-purple-300">
              {initials(name)}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-white">{name}</p>
              <p className="text-xs text-purple-200/70">Funded · 3 accounts</p>
            </div>
          </div>
          <button className="text-purple-200 hover:text-white p-1 rounded-lg transition" title="User Settings">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </aside>
    </>
  );
}