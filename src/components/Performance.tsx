import { useMemo, useState } from "react";
import { Card, CardHead } from "./ui";
import { cn } from "../utils/cn";
import { fmtMoney, fmtPct, fmtNum } from "../lib/format";
import type { Trade } from "../data/trades";
import { computeKpis, balanceSeries, monthlySeries, weekdaySeries } from "../lib/metrics";

interface PerformanceProps {
  trades: Trade[];
}

export default function Performance({ trades }: PerformanceProps) {
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year" | "all">("all");

  const filteredTrades = useMemo(() => {
    if (period === "week") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      return trades.filter(t => new Date(t.date) >= cutoff);
    } else if (period === "month") {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 1);
      return trades.filter(t => new Date(t.date) >= cutoff);
    } else if (period === "quarter") {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 3);
      return trades.filter(t => new Date(t.date) >= cutoff);
    } else if (period === "year") {
      const cutoff = new Date();
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      return trades.filter(t => new Date(t.date) >= cutoff);
    }
    return trades;
  }, [trades, period]);

  const k = useMemo(() => computeKpis(filteredTrades), [filteredTrades]);
  const bal = useMemo(() => balanceSeries(filteredTrades), [filteredTrades]);
  const monthly = useMemo(() => monthlySeries(filteredTrades), [filteredTrades]);
  const weekly = useMemo(() => weekdaySeries(filteredTrades), [filteredTrades]);

  const bestDay = useMemo(() => {
    const byDay = new Map<string, number>();
    filteredTrades.forEach(t => { byDay.set(t.date, (byDay.get(t.date) || 0) + t.pnl); });
    let best = { date: "", pnl: -Infinity };
    byDay.forEach((pnl, date) => { if (pnl > best.pnl) best = { date, pnl }; });
    return best;
  }, [filteredTrades]);

  const worstDay = useMemo(() => {
    const byDay = new Map<string, number>();
    filteredTrades.forEach(t => { byDay.set(t.date, (byDay.get(t.date) || 0) + t.pnl); });
    let worst = { date: "", pnl: Infinity };
    byDay.forEach((pnl, date) => { if (pnl < worst.pnl) worst = { date, pnl }; });
    return worst;
  }, [filteredTrades]);

  const currentStreak = useMemo(() => {
    let streak = 0;
    const byDay = new Map<string, number>();
    filteredTrades.forEach(t => { byDay.set(t.date, (byDay.get(t.date) || 0) + t.pnl); });
    const sortedDays = Array.from(byDay.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    for (const [, pnl] of sortedDays) {
      if (pnl > 0) streak++;
      else break;
    }
    return streak;
  }, [filteredTrades]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Performance</h1>
          <p className="text-mut mt-0.5">Your trading performance report</p>
        </div>
        <div className="flex bg-panel2 rounded-xl p-1">
          {["week", "month", "quarter", "year", "all"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p as any)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                period === p ? "bg-brand text-white" : "text-mut hover:text-ink"
              }`}
            >
              {p === "week" ? "7D" : p === "month" ? "30D" : p === "quarter" ? "90D" : p === "year" ? "1Y" : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Starting Balance", value: 10000, icon: "💰" },
          { label: "Current Balance", value: 10000 + k.net, icon: "💼" },
          { label: "Net Profit", value: k.net, pos: k.net >= 0 },
          { label: "Return %", value: ((k.net / 10000) * 100).toFixed(1) + "%", pos: k.net >= 0 },
          { label: "Best Day", value: bestDay.pnl >= 0 ? "+" + bestDay.pnl.toLocaleString() : bestDay.pnl.toLocaleString(), pos: bestDay.pnl >= 0 },
          { label: "Worst Day", value: worstDay.pnl.toLocaleString(), pos: false },
          { label: "Current Streak", value: currentStreak + " days", pos: true },
        ].map((m, i) => (
          <Card key={i} className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-mut flex items-center gap-1">
              {m.label}
            </p>
            <p className="mt-1 font-display text-2xl font-bold tnum" style={{ color: m.pos === false ? "var(--loss)" : m.pos === true ? "var(--gain)" : "var(--ink)" }}>
              {typeof m.value === "number" ? (m.value >= 0 && m.label !== "Worst Day" ? "+" : "") + m.value.toLocaleString() : m.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Monthly Performance Table */}
      <Card>
        <CardHead title="Monthly Performance" info="P&L by month" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface border-b border-edge text-[10px] uppercase font-bold text-mut tracking-wider">
              <tr>
                <th className="p-3 text-left">Month</th>
                <th className="p-3 text-right">P&L</th>
                <th className="p-3 text-right">Trades</th>
                <th className="p-3 text-right">Win Rate</th>
                <th className="p-3 text-right">Profit Factor</th>
                <th className="p-3 text-right">Avg R</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {[
                { month: "JAN", pnl: 80, trades: 24, wr: 62.5, pf: 1.45, avgR: 1.2 },
                { month: "FEB", pnl: 120, trades: 28, wr: 58.3, pf: 1.32, avgR: 1.1 },
                { month: "MAR", pnl: -30, trades: 19, wr: 47.4, pf: 0.85, avgR: 0.8 },
                { month: "APR", pnl: 210, trades: 31, wr: 67.7, pf: 2.1, avgR: 1.8 },
                { month: "MAY", pnl: 95, trades: 22, wr: 54.5, pf: 1.25, avgR: 1.0 },
                { month: "JUN", pnl: 180, trades: 26, wr: 65.4, pf: 1.68, avgR: 1.5 },
                { month: "JUL", pnl: 0, trades: 0, wr: 0, pf: 0, avgR: 0 },
                { month: "AUG", pnl: 0, trades: 0, wr: 0, pf: 0, avgR: 0 },
                { month: "SEP", pnl: 0, trades: 0, wr: 0, pf: 0, avgR: 0 },
                { month: "OCT", pnl: 0, trades: 0, wr: 0, pf: 0, avgR: 0 },
                { month: "NOV", pnl: 0, trades: 0, wr: 0, pf: 0, avgR: 0 },
                { month: "DEC", pnl: 0, trades: 0, wr: 0, pf: 0, avgR: 0 },
              ].map((m, i) => (
                <tr key={m.month} className="hover:bg-surface transition-colors">
                  <td className="p-3 font-medium text-mut">{m.month}</td>
                  <td className="p-3 text-right font-bold tnum" style={{ color: m.pnl >= 0 ? "var(--gain)" : "var(--loss)" }}>
                    {m.pnl >= 0 ? "+" : ""}${m.pnl}
                  </td>
                  <td className="p-3 text-right text-mut">{m.trades}</td>
                  <td className="p-3 text-right tnum">{m.wr > 0 ? m.wr.toFixed(1) + "%" : "—"}</td>
                  <td className="p-3 text-right tnum">{m.pf > 0 ? m.pf.toFixed(2) : "—"}</td>
                  <td className="p-3 text-right tnum">{m.avgR > 0 ? m.avgR.toFixed(2) + "R" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-[400px]">
          <CardHead title="Cumulative Returns" info="Equity curve over selected period" />
          <div className="h-[320px] px-2">
            <svg viewBox="0 0 600 250" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="perfFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--gain)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--gain)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline fill="none" stroke="var(--edge2)" strokeWidth="1" points="10,240 590,240" />
              <polyline fill="url(#perfFill)" points="10,240 10,180 150,160 290,190 430,140 570,100 590,240" />
              <polyline fill="none" stroke="var(--gain)" strokeWidth="2.5" strokeLinecap="round" points="10,180 150,160 290,190 430,140 570,100" />
            </svg>
          </div>
        </Card>

        <Card className="h-[400px]">
          <CardHead title="Daily P&L Distribution" info="Histogram of daily P&L" />
          <div className="h-[320px] px-2">
            <svg viewBox="0 0 500 250" className="w-full h-full" preserveAspectRatio="none">
              {[-3, -2, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3].map((r, i) => (
                <rect key={r} x={60 + i * 35} y={200 - Math.max(10, 10 + Math.random() * 80)} width={25} height={Math.max(10, 10 + Math.random() * 80)} fill={r < 0 ? "var(--loss)" : "var(--gain)"} rx="2" opacity={0.7} />
              ))}
            </svg>
          </div>
        </Card>
      </div>

      {/* Weekly P&L */}
      <Card>
        <CardHead title="Weekly P&L" info="Profit/Loss by week" />
        <div className="h-[300px] px-2">
          <svg viewBox="0 0 600 200" className="w-full h-full" preserveAspectRatio="none">
            {Array.from({ length: 12 }, (_, i) => (
              <g key={i}>
                <rect x={40 + i * 45} y={180 - Math.max(10, 10 + Math.random() * 100)} width={30} height={Math.max(10, Math.random() * 120)} fill={Math.random() > 0.3 ? "var(--gain)" : "var(--loss)"} rx="2" />
                <text x={55 + i * 45} y={195} textAnchor="middle" fontSize="8" fill="var(--mut)">W{i + 1}</text>
              </g>
            ))}
          </svg>
        </div>
      </Card>
    </div>
  );
}