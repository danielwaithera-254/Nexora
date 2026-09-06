import { cn } from "../utils/cn";
import { ShieldAlert, SlidersHorizontal, CalendarDays, ChevronDown, Wallet, Sparkles, Sun, Download, Settings, RefreshCw, Search, Sparkle } from "lucide-react";

type TopBarProps = {
  onMenu: () => void;
  dark: boolean;
  onToggleDark: () => void;
  onInsights: () => void;
  onLock: () => void;
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
  onInsights,
  onLock,
  syncLabel,
  pageLabel,
  accounts,
  account,
  onAccountChange,
}: TopBarProps) {
  return (
    <header className="h-16 px-6 bg-surface-subtle/80 backdrop-blur border-b border-surface-border flex items-center justify-between sticky top-0 z-20">
      {/* Left: Menu + Title + Sync status */}
      <div className="flex items-center gap-6">
        <button
          className="lg:hidden p-1 rounded hover:bg-surface-border text-faint hover:text-white transition-colors"
          onClick={onMenu}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
        </button>

        <div className="hidden lg:flex items-center gap-6">
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              {pageLabel}
              <span className="text-xs font-normal text-neon-violet px-2 py-0.5 rounded-full bg-neon-purple/10 border border-neon-purple/30">Live Metrics</span>
            </h1>
            <p className="text-[11px] text-faint flex items-center gap-1.5 mt-0.5">
              <span>Last sync: {syncLabel}</span>
              <button className="hover:text-neon-violet" title="Resync Data" onClick={() => {}}>
                <RefreshCw className="w-3 h-3 inline" />
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Center: Search */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            className="w-full bg-surface-card border border-surface-border rounded-full pl-9 pr-4 py-1.5 text-xs text-white placeholder-faint focus:outline-none focus:border-neon-purple focus:ring-1 focus:ring-neon-purple transition-all"
            placeholder="Search entries, symbols, tags (#risk, #nvda)..."
            type="text"
          />
        </div>
      </div>

      {/* Right: Action Filters & Buttons */}
      <div className="flex items-center gap-2.5">
        {/* Filter Button */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-card border border-surface-border text-xs text-faint hover:border-gray-500 transition-colors">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Filters</span>
        </button>

        {/* Date Range Selector */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-card border border-surface-border text-xs text-faint hover:border-gray-500 transition-colors">
          <CalendarDays className="w-3.5 h-3.5 text-neon-violet" />
          <span>This month</span>
          <ChevronDown className="w-3 h-3 text-faint" />
        </button>

        {/* Account Selector */}
        <SelectBox
          value={account}
          onChange={onAccountChange}
          options={accounts}
        />

        {/* Neon Violet Glowing Action Buttons */}
        <button className="hidden lg:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neon-purple/20 text-neon-violet border border-neon-purple/40 hover:bg-neon-purple/30 text-xs font-medium shadow-[var(--shadow-neon-subtle)] transition-all">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ask AI</span>
        </button>
        <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/40 text-xs font-medium transition-all">
          <Sun className="w-3.5 h-3.5" />
          <span>Start Day</span>
        </button>
        <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-surface-card border border-surface-border text-xs text-faint hover:text-white transition-colors">
          <Download className="w-3.5 h-3.5" />
          <span>Import</span>
        </button>
        <button className="text-faint hover:text-white p-1.5 rounded-lg border border-surface-border hover:bg-surface-card hover:border-gray-500 transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

function SelectBox({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-lg bg-surface-card border border-surface-border py-1.5 pl-3 pr-7 text-xs font-medium text-white outline-none transition-colors hover:border-gray-500 focus:border-neon-purple"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-faint w-3 h-3" />
    </div>
  );
}