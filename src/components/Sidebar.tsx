import {
  LayoutDashboard,
  CalendarDays,
  LineChart,
  NotebookPen,
  BarChart3,
  Layers,
  Sparkles,
  RotateCw,
  GraduationCap,
  Bell,
  ChevronRight,
} from "lucide-react";
import { cn } from "../utils/cn";

export type PageId =
  | "dashboard"
  | "journal"
  | "trades"
  | "notebook"
  | "reports"
  | "playbooks"
  | "progress"
  | "replay"
  | "resources";

const NAV: { id: PageId; name: string; icon: React.ComponentType<{ size?: number; className?: string }>; badge?: string }[] = [
  { id: "dashboard", name: "Dashboard", icon: LayoutDashboard },
  { id: "journal", name: "Daily Journal", icon: CalendarDays },
  { id: "trades", name: "Trades", icon: LineChart },
  { id: "notebook", name: "Notebook", icon: NotebookPen },
  { id: "reports", name: "Reports", icon: BarChart3, badge: "NEW" },
  { id: "playbooks", name: "Playbooks", icon: Layers, badge: "NEW" },
  { id: "progress", name: "Progress Tracker", icon: Sparkles },
  { id: "replay", name: "Trade Replay", icon: RotateCw, badge: "NEW" },
  { id: "resources", name: "Resource Center", icon: GraduationCap },
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
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col sidebar-bg text-white transition-transform duration-300 custom-scrollbar",
          open ? "translate-x-0" : "-translate-x-full",
          "lg:sticky lg:top-0 lg:h-full lg:translate-x-0"
        )}
      >
        {/* Brand Section */}
        <div className="p-6 flex items-center gap-2 border-b border-purple-900/50">
          <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center">
            <span className="font-bold italic text-lg">Z</span>
          </div>
          <span className="text-xl font-bold tracking-tight">TRADEZELLA</span>
          <button
            className="ml-auto text-gray-400 hover:text-white lg:hidden"
            onClick={onClose}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Add Trade CTA */}
        <div className="px-4 mb-6">
          <button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            onClick={() => { onNavigate("trades"); onClose(); }}
          >
            <span className="w-4 h-4" style={{ background: "currentColor", mask: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 4v16M8 12h8\"/></svg>') center/contain no-repeat" }} />
            Add trade
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 space-y-1 text-sm text-gray-300" aria-label="Main Navigation">
          {NAV.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); onClose(); }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-all",
                  isActive
                    ? "bg-gray-800 text-white"
                    : "hover:bg-gray-800 hover:text-white"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-white" : "text-gray-300")} />
                <span>{item.name}</span>
                {item.badge && (
                  <span className="ml-auto bg-blue-500 text-[10px] px-1.5 py-0.5 rounded text-white font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: User Profile */}
        <div className="mt-auto p-4 flex flex-col gap-4 border-t border-purple-900/50">
          <button className="flex items-center gap-3 text-gray-400 hover:text-white text-sm">
            <Bell className="w-5 h-5" />
            Notifications
          </button>
          <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-800 cursor-pointer">
            <div className="w-8 h-8 rounded-full border border-gray-600 bg-gray-700 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{initials(name)}</span>
            </div>
            <span className="text-sm font-medium">{name}</span>
          </div>
        </div>
      </aside>
    </>
  );
}