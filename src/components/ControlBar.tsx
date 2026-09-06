import { cn } from "../utils/cn";
import { Seg } from "./ui";
import { X, CalendarDays, RefreshCw } from "lucide-react";

type ControlBarProps = {
  filters: { range: string; strategy: string; account: string };
  onChange: (patch: Partial<{ range: string; strategy: string; account: string }>) => void;
  dirty: boolean;
  strategies: string[];
  accounts: string[];
};

export default function ControlBar({ filters, onChange, dirty, strategies, accounts }: ControlBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 px-4 py-3 border-b border-surface-border bg-surface-subtle/50">
      <div className="flex items-center gap-2 text-xs text-faint">
        <span className="font-medium">Period:</span>
        <Seg
          options={[
            { key: "today", label: "Today" },
            { key: "week", label: "7d" },
            { key: "month", label: "30d" },
            { key: "all", label: "All" },
          ]}
          value={filters.range}
          onChange={(v) => onChange({ range: v })}
        />
      </div>

      <div className="flex items-center gap-2 text-xs text-faint">
        <span className="font-medium">Strategy:</span>
        <select
          value={filters.strategy}
          onChange={(e) => onChange({ strategy: e.target.value })}
          className="rounded-lg bg-surface-card border border-surface-border py-1 px-2 text-xs font-medium text-white outline-none transition-colors hover:border-gray-500 focus:border-neon-purple"
        >
          <option value="All">All</option>
          {strategies.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2 text-xs text-faint">
        <span className="font-medium">Account:</span>
        <select
          value={filters.account}
          onChange={(e) => onChange({ account: e.target.value })}
          className="rounded-lg bg-surface-card border border-surface-border py-1 px-2 text-xs font-medium text-white outline-none transition-colors hover:border-gray-500 focus:border-neon-purple"
        >
          <option value="All">All</option>
          {accounts.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {dirty && (
        <button
          onClick={() => onChange({ range: "week", strategy: "All", account: "All" })}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neon-purple/20 text-neon-violet border border-neon-purple/40 hover:bg-neon-purple/30 text-xs font-medium shadow-[var(--shadow-neon-subtle)] transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
}