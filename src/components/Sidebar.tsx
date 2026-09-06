import {
  LayoutDashboard,
  CalendarDays,
  CandlestickChart,
  RadioTower,
  NotebookPen,
  Layers,
  TrendingUp,
  RotateCw,
  GraduationCap,
  Images,
  BarChart3,
  BookOpen,
  Wallet,
  ShieldAlert,
  Settings,
  X,
  Plus,
  Sparkles,
  Download,
  Sun,
  SlidersHorizontal,
  ChevronDown,
  RefreshCw,
  Search,
  Wallet as WalletIcon,
} from "lucide-react";
import { cn } from "../utils/cn";

export type PageId =
  | "dashboard"
  | "journal"
  | "trades"
  | "mt5"
  | "notebook"
  | "attachments"
  | "reports"
  | "playbooks"
  | "progress"
  | "replay"
  | "resources"
  | "calendar"
  | "accounts"
  | "risk"
  | "settings";

const NAV: { id: PageId; name: string; icon: React.ComponentType<{ size?: number; className?: string }>; badge?: string; badgeVariant?: "new" | "pro" }[] = [
  { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
  { id: "journal", name: "Daily Journal", icon: BookOpen },
  { id: "trades", name: "Trades Log", icon: CandlestickChart },
  { id: "notebook", name: "Notebook", icon: NotebookPen },
  { id: "reports", name: "Reports", icon: BarChart3, badge: "NEW", badgeVariant: "new" },
  { id: "playbooks", name: "Playbooks", icon: Layers, badge: "NEW", badgeVariant: "new" },
  { id: "progress", name: "Progress Tracker", icon: Sparkles },
  { id: "replay", name: "Trade Replay", icon: RotateCw, badge: "PRO", badgeVariant: "pro" },
  { id: "resources", name: "Resource Center", icon: GraduationCap },
  { id: "mt5", name: "MT5 Gateway", icon: RadioTower, badge: "LIVE", badgeVariant: "new" },
  { id: "calendar", name: "Calendar", icon: CalendarDays },
  { id: "accounts", name: "Accounts", icon: Wallet },
  { id: "risk", name: "Risk", icon: ShieldAlert },
  { id: "settings", name: "Settings", icon: Settings },
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
          "fixed inset-0 z-40 bg-canvas/80 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-surface-border bg-surface-subtle transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0"
        )}
      >
        {/* Brand Section */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-surface-border">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center shadow-[var(--shadow-neon-pill)]">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-wide text-white">
              Trade<span className="text-neon-violet">Log</span>
            </span>
            <span className="text-[10px] block font-medium uppercase tracking-widest text-faint">Analytics Pro</span>
          </div>
        </div>

        {/* Add Trade CTA */}
        <div className="px-4 mb-6">
          <button
            className="neon-button w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-white font-medium text-sm"
            onClick={() => { onNavigate("trades"); onClose(); }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Trade</span>
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 space-y-1.5 text-sm font-medium text-faint" aria-label="Main Navigation">
          {NAV.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); onClose(); }}
                className={cn(
                  "flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all",
                  isActive
                    ? "text-neon-violet bg-neon-purple/10 border border-neon-purple/50 shadow-[var(--shadow-neon-subtle)]"
                    : "hover:text-white hover:bg-surface-card-hover"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-neon-violet" : "text-faint group-hover:text-neon-violet")} />
                <span>{item.name}</span>
                {item.badge && (
                  <span className="ml-auto px-1.5 py-0.5 rounded text-[10px] font-semibold border"
                    style={{
                      backgroundColor: item.badgeVariant === "new" ? "rgba(168, 85, 247, 0.2)" : "rgba(192, 132, 252, 0.2)",
                      color: item.badgeVariant === "new" ? "#C084FC" : "#E879F9",
                      borderColor: item.badgeVariant === "new" ? "rgba(168, 85, 247, 0.3)" : "rgba(192, 132, 252, 0.3)"
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: User Profile */}
        <div className="pt-4 border-t border-surface-border">
          <div className="flex items-center justify-between p-2 rounded-xl bg-surface-card/60 hover:bg-surface-card cursor-pointer border border-surface-border/50 transition-all">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full ring-2 ring-neon-purple/60 overflow-hidden bg-purple-900/50 flex items-center justify-center text-xs font-bold text-white">
                {initials(name)}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">{name}</p>
                <p className="text-[11px] text-faint">Futures & Equity</p>
              </div>
            </div>
            <Settings className="w-4 h-4 text-faint hover:text-neon-violet transition-colors" />
          </div>
        </div>
      </aside>
    </>
  );
}