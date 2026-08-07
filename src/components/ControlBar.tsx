import { Filter, Download, RotateCcw, FileDown } from "lucide-react";
import { RANGES, type Filters, type RangeKey } from "../lib/metrics";
import { Seg, SelectBox } from "./ui";

export default function ControlBar({
  filters,
  onChange,
  strategies,
  accounts,
  onExport,
  onSample,
  count,
}: {
  filters: Filters;
  onChange: (f: Partial<Filters>) => void;
  strategies: string[];
  accounts: string[];
  onExport: () => void;
  onSample: () => void;
  count: number;
}) {
  const dirty = filters.strategy !== "All" || filters.account !== "All" || filters.range !== "90D";
  return (
    <div className="sheen themed flex flex-wrap items-center gap-2 rounded-2xl border border-edge bg-panel px-3 py-2.5 shadow-[var(--shadow)]">
      <span className="flex items-center gap-1.5 rounded-lg bg-brand-soft px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-wider text-brand">
        <Filter size={11} />
        Filters
      </span>

      <Seg
        options={RANGES.map((r) => ({ key: r.key, label: r.label }))}
        value={filters.range}
        onChange={(v: RangeKey) => onChange({ range: v })}
      />

      <SelectBox
        value={filters.strategy}
        onChange={(v) => onChange({ strategy: v })}
        options={[{ value: "All", label: "All strategies" }, ...strategies.map((s) => ({ value: s, label: s }))]}
      />
      <SelectBox
        value={filters.account}
        onChange={(v) => onChange({ account: v })}
        options={[{ value: "All", label: "All accounts" }, ...accounts.map((s) => ({ value: s, label: s }))]}
      />

      {dirty && (
        <button
          onClick={() => onChange({ strategy: "All", account: "All", range: "90D" })}
          className="group flex items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-bold text-mut transition-colors hover:text-loss"
        >
          <RotateCcw size={11} className="transition-transform duration-300 group-hover:-rotate-180" /> Reset
        </button>
      )}

      <span className="ml-auto hidden items-center gap-1.5 text-[11px] font-semibold text-mut md:flex">
        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-gain" />
        <span className="tnum font-bold text-ink">{count}</span> trades in view
      </span>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onSample}
          title="Download a sample CSV (same schema as a Python pandas export) to test import"
          className="flex items-center gap-1.5 rounded-xl border border-edge bg-panel2 px-2.5 py-[7px] text-[11px] font-bold text-ink transition-all hover:-translate-y-px hover:border-brand/50 hover:text-brand active:translate-y-0 active:scale-95"
        >
          <FileDown size={12} /> Sample
        </button>
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 rounded-xl border border-edge bg-panel2 px-2.5 py-[7px] text-[11px] font-bold text-ink transition-all hover:-translate-y-px hover:border-gain/50 hover:text-gain active:translate-y-0 active:scale-95"
        >
          <Download size={12} /> Export
        </button>
      </div>
    </div>
  );
}
