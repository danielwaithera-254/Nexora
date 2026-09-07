import { cn } from "../utils/cn";
import {
  Search,
  CalendarDays,
  ChevronDown,
  Settings,
  Sparkles,
  Download,
  Sun,
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
    <header className="h-16 bg-surface-card border-b border-surface-border px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Title & Sync status */}
      <div className="flex items-center gap-4">
        <button
          className="lg:hidden p-1 rounded hover:bg-surface-inner text-faint hover:text-ink transition-colors"
          onClick={onMenu}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
        </button>

        <div className="hidden lg:flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-ink">{pageLabel}</h1>
            <p className="text-xs text-mut flex items-center gap-1 mt-0.5">
              Last sync: {syncLabel} <button className="text-purple-500 hover:underline">Async</button>
            </p>
          </div>
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <button className="lg:flex hidden items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-inner border border-surface-border text-xs text-faint hover:border-surface-border-highlight hover:text-ink transition-colors">
          <Search className="w-3.5 h-3.5" />
          <span>Search</span>
        </button>

        {/* Filters Button */}
        <button className="bg-surface-card border border-surface-border px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-surface-hover transition-colors">
          <span className="w-4 h-4" style={{ background: "currentColor", mask: "url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M10 5H3M12 19H3M14 3v4M16 17v4M21 12h-9M21 19h-5M21 5h-7M8 10v4M8 12H3\"/></svg>') center/contain no-repeat" }} />
          Filters
        </button>

        {/* Date Range Selector */}
        <button className="bg-surface-card border border-surface-border px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 hover:bg-surface-hover transition-colors">
          <CalendarDays className="w-4 h-4 text-purple-500" />
          <span>Dates</span>
          <ChevronDown className="w-3 h-3 text-mut" />
        </button>

        {/* Account Selector */}
        <select
          value={account}
          onChange={(e) => onAccountChange(e.target.value)}
          className="bg-surface-card border border-surface-border px-4 py-1.5 rounded-md text-sm font-medium cursor-pointer appearance-none hover:bg-surface-hover transition-colors"
        >
          {accounts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Ask Zella AI */}
        <button className="hidden lg:flex items-center gap-2 px-4 py-1.5 rounded-md bg-purple-50 text-purple-600 border border-purple-200 text-sm font-medium hover:bg-purple-100 transition-colors">
          <Sparkles className="w-3.5 h-3.5" />
          Ask Zella AI
        </button>

        <div className="h-6 w-px bg-surface-border mx-1 hidden lg:block" />

        {/* Start my day */}
        <button className="bg-indigo-600 text-white px-4 py-1.5 rounded-md text-sm font-semibold hover:bg-indigo-700 transition-colors">
          Start my day
        </button>

        {/* Import trades */}
        <button className="bg-purple-600 text-white px-4 py-1.5 rounded-md text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2">
          <Download className="w-3.5 h-3.5" />
          Import trades
        </button>

        {/* Theme toggle */}
        <button
          onClick={onToggleDark}
          className="text-faint p-1.5 rounded-full hover:bg-surface-inner border border-surface-border transition-colors"
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        {/* Settings */}
        <button className="text-faint p-1.5 rounded-full hover:bg-surface-inner border border-surface-border hover:text-ink transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}