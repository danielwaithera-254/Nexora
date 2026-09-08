import { useMemo, useState } from "react";
import { Search, Filter, ChevronDown, Download, Upload, Table2, Columns } from "lucide-react";
import { Card, CardHead, SelectBox } from "./ui";
import TradesTable from "./TradesTable";
import type { Trade } from "../data/trades";
import { fmtDate, fmtMoney, fmtNum } from "../lib/format";
import { cn } from "../utils/cn";

type SortKey = "date" | "symbol" | "qty" | "r" | "pnl";

interface TradesProps {
  trades: Trade[];
  filters: { range: string; strategy: string; account: string };
  onFiltersChange: (f: Partial<{ range: string; strategy: string; account: string }>) => void;
  onImport: () => void;
}

export default function Trades({ trades, filters, onFiltersChange, onImport }: TradesProps) {
  const [q, setQ] = useState("");
  const [side, setSide] = useState("All");
  const [result, setResult] = useState("All");
  const [market, setMarket] = useState("All");
  const [session, setSession] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState(100);
  const [colVis, setColVis] = useState({
    id: true,
    date: true,
    symbol: true,
    side: true,
    strategy: true,
    account: true,
    qty: true,
    entry: true,
    exit: true,
    r: true,
    pnl: true,
  });

  const markets = useMemo(() => ["All", ...new Set(trades.map((t) => t.symbol))].sort(), [trades]);
  const sessions = useMemo(() => ["All", ...new Set(trades.map((t) => t.session))], [trades]);
  const strategies = useMemo(() => ["All", ...new Set(trades.map((t) => t.strategy))].sort(), [trades]);
  const accounts = useMemo(() => ["All", ...new Set(trades.map((t) => t.account))].sort(), [trades]);

  const rows = useMemo(() => {
    let list = trades.filter((t) => {
      if (q && !t.symbol.toLowerCase().includes(q.toLowerCase()) && !t.id.toLowerCase().includes(q.toLowerCase())) return false;
      if (side !== "All" && t.side !== side) return false;
      if (result !== "All" && ((result === "Win" && t.pnl <= 0) || (result === "Loss" && t.pnl >= 0) || (result === "BE" && t.pnl !== 0))) return false;
      if (market !== "All" && t.symbol !== market) return false;
      if (session !== "All" && t.session !== session) return false;
      return true;
    });

    list.sort((a, b) => {
      const av = a[sortKey] as any;
      const bv = b[sortKey] as any;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return list.slice(0, limit);
  }, [trades, q, side, result, market, session, sortKey, sortDir, limit]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const exportVisible = () => {
    const csv = tradesToCSV(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexora-trades-${filters.range.toLowerCase()}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleCol = (key: keyof typeof colVis) => setColVis((c) => ({ ...c, [key]: !c[key] }));

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-mut absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search symbol, ID, strategy…"
                className="pl-9 pr-3 py-1.5 text-sm bg-panel border border-edge rounded-lg focus:border-brand focus:outline-none w-64 sm:w-80"
              />
            </div>

            <SelectBox value={side} onChange={setSide} options={["All", "Long", "Short"].map(v => ({ value: v, label: v }))} className="w-32" />
            <SelectBox value={result} onChange={setResult} options={["All", "Win", "Loss", "BE"].map(v => ({ value: v, label: v }))} className="w-28" />
            <SelectBox value={market} onChange={setMarket} options={markets.map(v => ({ value: v, label: v }))} className="w-36" />
            <SelectBox value={session} onChange={setSession} options={sessions.map(v => ({ value: v, label: v }))} className="w-32" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={exportVisible} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-edge bg-panel hover:bg-panel2 text-sm font-medium transition-colors">
              <Download size={14} />
              <span>Export ({rows.length})</span>
            </button>
            <button onClick={onImport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand text-white font-semibold hover:bg-brand-deep transition-colors text-sm">
              <Upload size={14} />
              <span>Import</span>
            </button>
            <button className="p-1.5 rounded-lg border border-edge bg-panel hover:bg-panel2 transition-colors" title="Column visibility">
              <Columns size={16} />
            </button>
          </div>
        </div>
      </Card>

      {/* Results Table */}
      <Card>
        <TradesTable
          trades={rows}
          colVis={colVis}
          onToggleCol={toggleCol}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
        />
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm text-mut">
        <span>Showing {rows.length} of {trades.length} trades</span>
        <div className="flex items-center gap-2">
          <SelectBox
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            options={[10, 25, 50, 100, 250, 500].map((v) => ({ value: String(v), label: v + (v === 500 ? "+" : "") }))}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
}