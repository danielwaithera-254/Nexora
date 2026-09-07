import { cn } from "../utils/cn";
import { ChevronDown, Search, Download, Upload } from "lucide-react";

type FilterBarProps = {
  tradesCount: number;
  onSearch: (value: string) => void;
  onSample: () => void;
  onImport: () => void;
  onExport: () => void;
};

export default function FilterBar({
  tradesCount,
  onSearch,
  onSample,
  onImport,
  onExport,
}: FilterBarProps) {
  const timeRanges = [
    { key: "7D", label: "7D" },
    { key: "30D", label: "30D" },
    { key: "90D", label: "90D", active: true },
    { key: "YTD", label: "YTD" },
    { key: "All", label: "All" },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-2.5 border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs font-medium" data-purpose="filter-bar">
      <div className="flex flex-wrap items-center gap-2">
        {/* Filters Button */}
        <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition">
          <Search className="w-3.5 h-3.5" />
          <span>FILTERS</span>
        </button>

        {/* Time Range Selector */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-700 p-0.5 rounded-full text-slate-600 dark:text-slate-300">
          {timeRanges.map((range) => (
            <button
              key={range.key}
              className={cn(
                "px-2.5 py-1 rounded-full hover:text-slate-900 dark:hover:text-white transition",
                range.active && "px-3 py-1 rounded-full bg-brand-600 text-white font-bold shadow-sm"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* Strategy Dropdown */}
        <div className="relative">
          <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-700 dark:text-slate-300">
            <span>All strategies</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Accounts Dropdown */}
        <div className="relative">
          <button className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition text-slate-700 dark:text-slate-300">
            <span>All accounts</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Right Side Actions & Stats */}
      <div className="flex items-center space-x-3 text-slate-600 dark:text-slate-400">
        <div className="flex items-center space-x-1.5 text-slate-600 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-bold text-slate-800 dark:text-white">{tradesCount} trades in view</span>
        </div>
        <button onClick={onSample} className="flex items-center space-x-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition">
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Sample</span>
        </button>
        <button onClick={onImport} className="flex items-center space-x-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition">
          <Upload className="w-3.5 h-3.5 text-slate-500" />
          <span>Import</span>
        </button>
        <button onClick={onExport} className="flex items-center space-x-1 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition">
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
}