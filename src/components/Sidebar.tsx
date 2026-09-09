import {
  LayoutDashboard,
  CalendarDays,
  CandlestickChart,
  Wallet,
  BarChart3,
  LineChart,
  Target,
  ListChecks,
  Calendar,
  Target as TargetIcon,
  Settings,
  Plus,
  Settings as SettingsIcon,
  X,
  TrendingUp,
  BookOpen,
  Flame,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "../utils/cn";

export type PageId =
  | "dashboard"
  | "journal"
  | "accounts"
  | "trades"
  | "analytics"
  | "performance"
  | "strategies"
  | "calendar"
  | "goals"
  | "settings";

interface NavItem {
  id: PageId;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
  section: "workspace" | "analytics" | "habits" | "settings";
}

const NAV: NavItem[] = [
  { id: "dashboard", name: "Dashboard", icon: LayoutDashboard, section: "workspace" },
  { id: "journal", name: "Daily Journal", icon: CalendarDays, section: "workspace" },
  { id: "accounts", name: "Accounts", icon: Wallet, section: "workspace" },
  { id: "trades", name: "Trades", icon: CandlestickChart, section: "analytics" },
  { id: "analytics", name: "Analytics", icon: BarChart3, section: "analytics" },
  { id: "performance", name: "Performance", icon: TrendingUp, section: "analytics" },
  { id: "strategies", name: "Strategies", icon: Target, section: "analytics" },
  { id: "calendar", name: "Calendar", icon: Calendar, section: "habits" },
  { id: "goals", name: "Goals", icon: TargetIcon, section: "habits" },
  { id: "settings", name: "Settings", icon: Settings, section: "settings" },
];

const SECTION_LABELS: Record<string, string> = {
  workspace: "Workspace",
  analytics: "Analytics",
  habits: "Habits",
  settings: "Settings",
};

export default function Sidebar({
  open,
  onClose,
  onNavigate,
  onAddTrade,
  active,
  collapsed,
  onToggleCollapsed,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (id: PageId) => void;
  onAddTrade: () => void;
  active: PageId;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-[#1b0b3a]/60 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col text-white transition-all duration-300",
          "bg-[linear-gradient(168deg,#1e0b45_0%,#4c1d95_55%,#7c3aed_100%)]",
          "shadow-[6px_0_32px_-12px_rgba(30,11,69,0.55)]",
          collapsed ? "w-[64px]" : "w-[240px]",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0"
        )}
      >
        {/* brand */}
        <div className={cn("flex items-center gap-2.5 pb-6 pt-6", collapsed ? "justify-center px-2" : "px-5")}>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.45)]">
            <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
              <path
                d="M6 22l6-8 5 5 9-12"
                stroke="#7c3aed"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="26" cy="7" r="3" fill="#a855f7" />
            </svg>
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-display text-[18px] font-bold leading-none tracking-[-0.02em] text-white">
                Nex<span className="text-[#d8b4fe]">ora</span>
              </p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/55">
                Trading Journal
              </p>
            </div>
          )}
          <button
            className={cn("rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white", collapsed ? "hidden lg:hidden" : "ml-auto lg:hidden")}
            onClick={onClose}
          >
            <X size={16} />
          </button>
          <button
            onClick={onToggleCollapsed}
            className={cn("hidden rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white lg:flex", collapsed ? "ml-0" : "ml-auto")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        {/* add trade */}
        <div className={cn("px-4", collapsed && "px-2")}>
          <button
            onClick={onAddTrade}
            className={cn(
              "group flex items-center justify-center gap-2 rounded-xl bg-white font-bold text-[#5b21b6] shadow-[0_6px_18px_-6px_rgba(0,0,0,0.5)] transition-all hover:-translate-y-px hover:shadow-[0_10px_24px_-8px_rgba(0,0,0,0.55)] active:translate-y-0 active:scale-[0.98]",
              collapsed ? "h-9 w-9 p-0" : "w-full py-2.5 text-[13px]"
            )}
            title={collapsed ? "Add trade" : undefined}
          >
            <Plus size={15} strokeWidth={3} className="transition-transform duration-300 group-hover:rotate-90" />
            {!collapsed && "Add trade"}
          </button>
        </div>

        {/* nav */}
        <nav className={cn("mt-6 flex-1 space-y-1 overflow-y-auto pb-4", collapsed ? "px-2" : "px-3")}>
          {["workspace", "analytics", "habits", "settings"].map((section) => {
            const items = NAV.filter((n) => n.section === section);
            return (
              <div key={section} className="space-y-1">
                {!collapsed && (
                  <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">
                    {SECTION_LABELS[section]}
                  </p>
                )}
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = active === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        onClose();
                      }}
                      title={collapsed ? item.name : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-xl text-[12.5px] font-semibold transition-all duration-200",
                        collapsed ? "justify-center p-2.5" : "w-full px-3 py-2.5",
                        isActive
                          ? "bg-white text-[#5b21b6] shadow-[0_6px_16px_-6px_rgba(0,0,0,0.45)]"
                          : "text-white/70 hover:bg-white/[0.13] hover:text-white"
                      )}
                    >
                      <Icon
                        size={15}
                        className={cn(
                          "shrink-0 transition-transform duration-200",
                          isActive
                            ? "text-[#7c3aed]"
                            : "text-white/50 group-hover:translate-x-0.5 group-hover:text-white"
                        )}
                      />
                      {!collapsed && <span className="truncate">{item.name}</span>}
                      {!collapsed && item.badge && (
                        <span
                          className={cn(
                            "ml-auto rounded px-1.5 py-0.5 text-[8.5px] font-extrabold tracking-wider",
                            isActive ? "bg-[#ede9fe] text-[#6d28d9]" : "bg-white/15 text-white/80"
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* footer */}
        <div className={cn("border-t border-white/12 py-4", collapsed ? "px-2" : "px-4")}>
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[11px] font-extrabold text-[#4c1d95]">
              JT
            </span>
            {!collapsed && (
              <>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-bold text-white">Jordan Tate</p>
                  <p className="text-[10px] text-white/55">Funded · 3 accounts</p>
                </div>
                <button
                  onClick={() => onNavigate("settings")}
                  className="ml-auto rounded-lg p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Settings"
                >
                  <SettingsIcon size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}