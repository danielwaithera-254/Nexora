import { useMemo, useState } from "react";
import { Card, CardHead } from "./ui";
import { cn } from "../utils/cn";
import { fmtMoney, fmtPct, fmtNum } from "../lib/format";
import type { Trade } from "../data/trades";
import { computeKpis } from "../lib/metrics";
import { ChevronRight, ChevronDown, Target, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

interface StrategiesProps {
  trades: Trade[];
}

interface StrategyStats {
  name: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  profitFactor: number;
  netPnl: number;
  avgR: number;
  bestSetup: string;
  worstSetup: string;
}

const mockStrategies: StrategyStats[] = [
  {
    name: "Asia Range Liquidity",
    trades: 87,
    wins: 53,
    losses: 34,
    winRate: 61.2,
    profitFactor: 1.74,
    netPnl: 642,
    avgR: 2.1,
    bestSetup: "London Open Breakout",
    worstSetup: "Late NY Session",
  },
  {
    name: "US100 Breakout",
    trades: 43,
    wins: 24,
    losses: 19,
    winRate: 55.8,
    profitFactor: 1.42,
    netPnl: 287,
    avgR: 1.8,
    bestSetup: "Pre-market Range Break",
    worstSetup: "Choppy Midday",
  },
  {
    name: "London Open Reversal",
    trades: 31,
    wins: 16,
    losses: 15,
    winRate: 51.6,
    profitFactor: 1.18,
    netPnl: 98,
    avgR: 1.3,
    bestSetup: "False Break 08:00",
    worstSetup: "News Spike",
  },
  {
    name: "NY Session Trend",
    trades: 28,
    wins: 14,
    losses: 14,
    winRate: 50.0,
    profitFactor: 1.05,
    netPnl: 42,
    avgR: 1.1,
    bestSetup: "VWAP Pullback",
    worstSetup: "Fed Days",
  },
  {
    name: "Scalp - 1m/5m",
    trades: 156,
    wins: 89,
    losses: 67,
    winRate: 57.1,
    profitFactor: 1.31,
    netPnl: 189,
    avgR: 1.4,
    bestSetup: "Order Block Entry",
    worstSetup: "High Spread",
  },
];

interface StrategiesProps {
  trades: Trade[];
}

export default function Strategies({ trades }: StrategiesProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof StrategyStats>("netPnl");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortedStrategies = useMemo(() => {
    return [...mockStrategies].sort((a, b) => {
      const av = a[sortKey] as any;
      const bv = b[sortKey] as any;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [sortKey, sortDir]);

  const handleSort = (key: keyof StrategyStats) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const renderStrategyRow = (s: StrategyStats, i: number) => (
    <>
      <tr key={s.name} className="hover:bg-surface transition-colors cursor-pointer" onClick={() => setExpanded(expanded === s.name ? null : s.name)}>
        <td className="p-3 font-medium text-ink">{s.name}</td>
        <td className="p-3 text-center text-mut tnum">{s.trades}</td>
        <td className="p-3 text-center tnum">
          <span className={cn("font-bold", s.winRate >= 55 ? "text-gain" : s.winRate >= 50 ? "text-brand" : "text-loss")}>
            {s.winRate.toFixed(1)}%
          </span>
        </td>
        <td className="p-3 text-center tnum" style={{ color: s.profitFactor >= 1.5 ? "var(--gain)" : s.profitFactor >= 1 ? "var(--brand)" : "var(--loss)" }}>
          {s.profitFactor.toFixed(2)}
        </td>
        <td className="p-3 text-right font-bold tnum" style={{ color: s.netPnl >= 0 ? "var(--gain)" : "var(--loss)" }}>
          {s.netPnl >= 0 ? "+" : ""}${s.netPnl.toLocaleString()}
        </td>
        <td className="p-3 text-center tnum">{s.avgR.toFixed(1)}R</td>
        <td className="p-3 text-mut text-sm truncate max-w-[120px]">{s.bestSetup}</td>
        <td className="p-3 text-loss text-sm truncate max-w-[120px]">{s.worstSetup}</td>
        <td className="p-3 text-center">
          <button onClick={(e) => { e.stopPropagation(); setExpanded(expanded === s.name ? null : s.name); }} className="text-mut hover:text-brand transition-colors">
            <ChevronRight className={cn("w-4 h-4", expanded === s.name && "rotate-90")} />
          </button>
        </td>
      </tr>
      {expanded === s.name ? (
        <tr className="bg-panel2/50">
          <td colSpan={9} className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-surface border border-edge">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mut">Win Rate</p>
                <p className="font-bold text-gain">{s.winRate.toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-edge">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mut">Profit Factor</p>
                <p className="font-bold text-brand">{s.profitFactor.toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-edge">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mut">Avg R:R</p>
                <p className="font-bold text-ink">{s.avgR.toFixed(1)}R</p>
              </div>
              <div className="p-3 rounded-lg bg-surface border border-edge">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mut">Expectancy</p>
                <p className="font-bold text-gain">+${(s.netPnl / s.trades).toFixed(2)}</p>
              </div>
              <div className="md:col-span-2 p-3 rounded-lg bg-surface border border-edge">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mut">Best Setup</p>
                <p className="font-medium text-gain">{s.bestSetup}</p>
              </div>
              <div className="md:col-span-2 p-3 rounded-lg bg-surface border border-edge">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mut">Worst Setup</p>
                <p className="font-medium text-loss">{s.worstSetup}</p>
              </div>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Strategies</h1>
          <p className="text-mut mt-0.5">Track which setups actually work for you</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Strategies", value: mockStrategies.length, icon: Target },
          { label: "Profitable", value: mockStrategies.filter(s => s.netPnl > 0).length, icon: TrendingUp },
          { label: "Total Trades", value: mockStrategies.reduce((s, a) => s + a.trades, 0), icon: Target },
          { label: "Total P&L", value: mockStrategies.reduce((s, a) => s + a.netPnl, 0), pos: true, icon: TrendingUp },
        ].map((m, i) => (
          <Card key={i} className="p-4 flex items-center gap-3">
            <m.icon className="w-6 h-6 text-brand" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-mut">{m.label}</p>
              <p className="mt-0.5 font-display text-xl font-bold tnum" style={{ color: m.pos === false ? "var(--loss)" : "var(--gain)" }}>
                {m.pos === false ? "" : m.pos === true ? "+" : ""}{typeof m.value === "number" ? m.value.toLocaleString() : m.value}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHead title="Strategy Breakdown" info="Click a strategy to see its individual trades" right={
          <div className="flex items-center gap-2">
            <select className="px-2 py-1 text-xs bg-panel border border-edge rounded-lg focus:border-brand focus:outline-none" onChange={(e) => { setSortKey(e.target.value as any); setSortDir("desc"); }}>
              <option value="netPnl">Sort by P&L</option>
              <option value="winRate">Sort by Win Rate</option>
              <option value="profitFactor">Sort by Profit Factor</option>
              <option value="trades">Sort by Trades</option>
              <option value="avgR">Sort by Avg R</option>
            </select>
          </div>
        } />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface border-b border-edge text-[10px] uppercase font-bold text-mut tracking-wider">
              <tr>
                <th className="p-3 text-left">Strategy</th>
                <th className="p-3 text-center" onClick={() => { setSortKey("trades"); }}>Trades <ChevronDown className="w-3 h-3 inline ml-1" /></th>
                <th className="p-3 text-center">Win Rate <ChevronDown className="w-3 h-3 inline ml-1" /></th>
                <th className="p-3 text-center">Profit Factor <ChevronDown className="w-3 h-3 inline ml-1" /></th>
                <th className="p-3 text-right">Net P&L <ChevronDown className="w-3 h-3 inline ml-1" /></th>
                <th className="p-3 text-center">Avg R:R <ChevronDown className="w-3 h-3 inline ml-1" /></th>
                <th className="p-3 text-left">Best Setup</th>
                <th className="p-3 text-left">Worst Setup</th>
                <th className="p-3 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {sortedStrategies.map((s, i) => renderStrategyRow(s, i))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHead title="Strategy Insights" info="AI-generated observations from your trading data" />
        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-gain/10 border border-gain/30 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-gain mt-0.5" />
            <div>
              <p className="font-medium text-gain">Asia Range Liquidity is your most profitable strategy</p>
              <p className="text-sm text-mut mt-1">61.2% win rate with 1.74 profit factor. Consider increasing allocation.</p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-loss/10 border border-loss/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-loss mt-0.5" />
            <div>
              <p className="font-medium text-loss">London Open Reversal barely profitable</p>
              <p className="text-sm text-mut mt-1">51.6% win rate with 1.18 profit factor. Consider reducing size or refining entry criteria.</p>
            </div>
          </div>
          <div className="p-4 rounded-lg bg-brand/10 border border-brand/30 flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-brand mt-0.5" />
            <div>
              <p className="font-medium text-brand">Scalp strategy showing consistency</p>
              <p className="text-sm text-mut mt-1">57.1% win rate across 156 trades. High volume compensates for lower R:R.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}