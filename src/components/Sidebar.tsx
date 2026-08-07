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
  Plus,
  Settings,
  X,
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

interface NavItem {
  id: PageId;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: string;
}

const NAV: NavItem[] = [
  { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
  { id: "trades", name: "Trades", icon: CandlestickChart },
  { id: "calendar", name: "Calendar", icon: CalendarDays },
  { id: "reports", name: "Analytics", icon: BarChart3 },
  { id: "playbooks", name: "Playbooks", icon: Layers },
  { id: "journal", name: "Journal", icon: BookOpen },
  { id: "notebook", name: "Notebook", icon: NotebookPen },
  { id: "attachments", name: "Attachments", icon: Images },
  { id: "accounts", name: "Accounts", icon: Wallet },
  { id: "risk", name: "Risk", icon: ShieldAlert },
  { id: "replay", name: "Trade Replay", icon: RotateCw, badge: "BETA" },
  { id: "progress", name: "Progress", icon: TrendingUp },
  { id: "mt5", name: "MT5 Gateway", icon: RadioTower, badge: "LIVE" },
  { id: "resources", name: "Resources", icon: GraduationCap },
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
  onAddTrade,
  active,
  name,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (id: PageId) => void;
  onAddTrade: () => void;
  active: PageId;
  name: string;
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
          "fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col text-white transition-transform duration-300",
          "bg-[linear-gradient(168deg,#1e0b45_0%,#4c1d95_55%,#7c3aed_100%)]",
          "shadow-[6px_0_32px_-12px_rgba(30,11,69,0.55)]",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:sticky lg:top-0 lg:h-screen lg:translate-x-0"
        )}
      >
        {/* brand */}
        <div className="flex items-center gap-2.5 px-5 pb-6 pt-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white shadow-[0_4px_14px_-4px_rgba(0,0,0,0.45)]">
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
          <div className="min-w-0">
            <p className="font-display text-[18px] font-bold leading-none tracking-[-0.02em] text-white">
              Nex<span className="text-[#d8b4fe]">ora</span>
            </p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.18em] text-white/55">
              Private Trading Journal
            </p>
          </div>
          <button
            className="ml-auto rounded-md p-1 text-white/60 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* add trade */}
        <div className="px-4">
          <button
            onClick={onAddTrade}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-[13px] font-bold text-[#5b21b6] shadow-[0_6px_18px_-6px_rgba(0,0,0,0.5)] transition-all hover:-translate-y-px hover:shadow-[0_10px_24px_-8px_rgba(0,0,0,0.55)] active:translate-y-0 active:scale-[0.98]"
          >
            <Plus size={15} strokeWidth={3} className="transition-transform duration-300 group-hover:rotate-90" />
            Add trade
          </button>
        </div>

        {/* nav */}
        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          <p className="px-3 pb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">
            Workspace
          </p>
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12.5px] font-semibold transition-all duration-200",
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
                <span className="truncate">{item.name}</span>
                {item.badge && (
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
        </nav>

        {/* settings */}
        <div className="border-t border-white/12 px-3 py-3">
          <button
            onClick={() => {
              onNavigate("settings");
              onClose();
            }}
            className={cn(
              "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[12.5px] font-semibold transition-all duration-200",
              active === "settings"
                ? "bg-white text-[#5b21b6] shadow-[0_6px_16px_-6px_rgba(0,0,0,0.45)]"
                : "text-white/70 hover:bg-white/[0.13] hover:text-white"
            )}
          >
            <Settings
              size={15}
              className={cn(
                "shrink-0 transition-transform duration-300",
                active === "settings" ? "text-[#7c3aed]" : "text-white/50 group-hover:rotate-45 group-hover:text-white"
              )}
            />
            <span className="truncate">Settings</span>
          </button>

          {/* footer user */}
          <div className="mt-3 flex items-center gap-3 border-t border-white/12 px-1 pt-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-[11px] font-extrabold text-[#4c1d95]">
              {initials(name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-bold text-white">{name}</p>
              <p className="text-[10px] text-white/55">Private vault · encrypted</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
