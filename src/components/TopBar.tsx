import { cn } from "../utils/cn";
import {
  Sparkles,
  Sun,
  Bell,
  Settings,
  ChevronDown,
} from "lucide-react";

type TopBarProps = {
  onMenu: () => void;
  dark: boolean;
  onToggleDark: () => void;
  syncLabel: string;
  pageLabel: string;
  accounts: { value: string; label: string }[];
  account: string;
  onAccountChange: (v: string) => void;
};

export default function TopBar({
  onMenu,
  dark,
  onToggleDark,
  syncLabel,
  pageLabel,
  accounts,
  account,
  onAccountChange,
}: TopBarProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{pageLabel}</h2>
        <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Last sync: {syncLabel}</span>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Insights Button */}
        <button className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-sm flex items-center space-x-1.5 transition">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Insights</span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDark}
          className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm transition"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          <Sun className="w-4 h-4" />
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm transition" title="Notifications">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-purple-600 rounded-full" />
        </button>

        {/* Settings */}
        <button className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm transition" title="Settings">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}