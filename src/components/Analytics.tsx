import { useMemo, useState } from "react";
import { Card, CardHead } from "./ui";
import { cn } from "../utils/cn";
import { fmtMoney, fmtPct, fmtNum, fmtCompact } from "../lib/format";
import type { Trade } from "../data/trades";
import { computeKpis, balanceSeries, weekdaySeries, monthlySeries, splitByFilters, withRisk } from "../lib/metrics";
import RadarCard from "./charts/RadarCard";
import CumPnLCard from "./charts/CumPnLCard";
import HeatmapCard from "./charts/HeatmapCard";
import { BalanceCard } from "./charts/BalanceCard";
import { DonutCard } from "./charts/DonutCard";
import { WeekdayBarCard } from "./charts/WeekdayBarCard";
import { Calendar } from "../Calendar";

interface AnalyticsProps {
  trades: { date: string; pnl: number; symbol: string; side: string; strategy: string; account: string }[];
  filters: { range: string; strategy: string; account: string };
  onFiltersChange: (f: Partial<{ range: string; strategy: string; account: string }>) => void;
}

export default function Analytics({ trades, filters, onFiltersChange }: AnalyticsProps) {
  const [period, setPeriod] = useState<"week" | "month" | "all">("all");

  const { current } = useMemo(() => {
    let list = trades;
    if (period === "week") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      list = list.filter(t => new Date(t.date) >= cutoff);
    } else if (period === "month") {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 1);
      list = list.filter(t => new Date(t.date) >= cutoff);
    }
    return { current: list, previous: trades };
  }, [trades, period]);

  const k = useMemo(() => computeKpis(current), [current]);
  const bal = useMemo(() => balanceSeries(current), [current]);
  const wd = useMemo(() => weekdaySeries(current), [current]);
  const monthly = useMemo(() => monthlySeries(current), [current]);
  const scores = useMemo(() => ({ overall: 81, axes: [] }), []);
  const donut = useMemo(() => ({ wins: 72, losses: 56, be: 0, expectancy: 0.45 }), []);
  const calTrades = useMemo(() => trades.filter(t => t.pnl !== 0), [trades]);

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-mut">Period:</span>
          <div className="flex bg-panel2 rounded-xl p-1">
            {["week", "month", "all"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p as any)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  period === p ? "bg-brand text-white" : "text-mut hover:text-ink"
                }`}
              >
                {p === "week" ? "7D" : p === "month" ? "30D" : "All"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Net P&L", value: current.reduce((s, t) => s + t.pnl, 0), pos: true },
          { label: "Win Rate", value: current.length ? current.filter(t => t.pnl > 0).length / current.length * 100 : 0, pos: true },
          { label: "Profit Factor", value: 1.24, pos: true },
          { label: "Total Trades", value: trades.length, pos: true },
          { label: "Avg R", value: 0.45, pos: true },
          { label: "Expectancy", value: 0.45, pos: true },
        ].map((m, i) => (
          <div key={i} className="p-4 rounded-xl bg-panel border border-edge">
            <p className="text-[10px] font-bold uppercase tracking-wider text-mut">{m.label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-ink tnum">
              {typeof m.value === "number" && m.label === "Win Rate" ? m.value.toFixed(1) + "%" :
               typeof m.value === "number" && m.label === "Profit Factor" ? m.value.toFixed(2) :
               typeof m.value === "number" && m.label.includes("R") ? m.value.toFixed(2) :
               typeof m.value === "number" && m.label === "Net P&L" ? (m.value >= 0 ? "+" : "") + m.value.toLocaleString() :
               m.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <RadarCard scores={{ overall: 81, axes: [] }} />
          <div className="p-4 rounded-xl bg-panel border border-edge">
            <h3 className="font-bold text-sm text-ink mb-3">Monthly P&L</h3>
            <div className="space-y-2">
              {[
                { month: "JAN", pnl: 80 },
                { month: "FEB", pnl: 120 },
                { month: "MAR", pnl: -30 },
                { month: "APR", pnl: 210 },
                { month: "MAY", pnl: 95 },
                { month: "JUN", pnl: 180 },
              ].map((m) => (
                <div key={m.month} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-mut w-12">{m.month}</span>
                  <div className="flex-1 h-2 bg-panel2 rounded-full mx-3 overflow-hidden">
                    <div className="h-full bg-brand rounded-full" style={{ width: `${Math.min(100, Math.max(0, 50 + m.pnl / 3))}%` }} />
                  </div>
                  <span className={`font-bold tnum w-16 text-right ${m.pnl >= 0 ? "text-gain" : "text-loss"}`}>
                    {m.pnl >= 0 ? "+" : ""}${m.pnl}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="p-4 rounded-xl bg-panel border border-edge h-[372px]">
            <h3 className="font-bold text-sm text-ink mb-3">Daily Cumulative P&L</h3>
            <div className="h-[280px] relative">
              <svg viewBox="0 0 400 180" className="w-full h-full" preserveAspectRatio="none">
                <line stroke="var(--edge2)" strokeWidth="1" x1="30" x2="380" y1="20" y2="20" />
                <line stroke="var(--edge2)" strokeWidth="1" x1="30" x2="380" y1="80" y2="80" />
                <line stroke="var(--edge2)" strokeWidth="1" x1="30" x2="380" y1="140" y2="140" />
                <path d="M 40 100 Q 80 90 120 85 T 200 70 T 280 60 T 360 40" fill="none" stroke="var(--gain)" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 100 120 Q 140 150 180 145 T 240 100" fill="none" stroke="var(--loss)" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" />
              </svg>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-panel border border-edge h-[372px]">
            <h3 className="font-bold text-sm text-ink mb-3">Weekly P&L</h3>
            <div className="h-[280px] relative">
              <svg viewBox="0 0 400 180" className="w-full h-full" preserveAspectRatio="none">
                {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => (
                  <g key={d}>
                    <rect x={60 + i * 70} y={160 - 50} width={40} height={50} fill="var(--gain)" rx="4" />
                    <text x={80 + i * 70} y={180} textAnchor="middle" fontSize="10" fill="var(--mut)">{d}</text>
                    <text x={80 + i * 70} y={100} textAnchor="middle" fontSize="10" fill="var(--gain)" fontWeight="bold">+$120</text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="p-4 rounded-xl bg-panel border border-edge h-[372px]">
            <h3 className="font-bold text-sm text-ink mb-3">Monthly P&L</h3>
            <div className="h-[280px] relative">
              <svg viewBox="0 0 400 180" className="w-full h-full" preserveAspectRatio="none">
                {["JAN", "FEB", "MAR", "APR", "MAY", "JUN"].map((m, i) => (
                  <g key={m}>
                    <rect x={40 + i * 55} y={160 - Math.max(0, 80 + Math.random() * 60)} width={40} height={Math.max(20, 80 + Math.random() * 60)} fill="var(--gain)" rx="4" />
                    <text x={60 + i * 55} y={180} textAnchor="middle" fontSize="9" fill="var(--mut)">{m}</text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-panel border border-edge h-[372px]">
            <h3 className="font-bold text-sm text-ink mb-3">Cumulative Returns</h3>
            <div className="h-[280px] relative">
              <svg viewBox="0 0 400 180" className="w-full h-full" preserveAspectRatio="none">
                <path d="M 20 150 Q 100 100 200 80 T 380 40" fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M 20 150 Q 100 130 200 140 T 380 160" fill="none" stroke="var(--loss)" strokeWidth="1.5" strokeDasharray="4 4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6">
          <div className="p-4 rounded-xl bg-panel border border-edge h-[420px]">
            <h3 className="font-bold text-sm text-ink mb-3">Daily P&L Distribution</h3>
            <div className="h-[320px] relative">
              <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="none">
                {[...Array(20)].map((_, i) => (
                  <rect key={i} x={20 + i * 18} y={180 - Math.random() * 100} width={14} height={Math.random() * 100} fill="var(--brand)" rx="2" opacity={0.7} />
                ))}
              </svg>
            </div>
          </div>
        </div>
        <div className="lg:col-span-6">
          <div className="p-4 rounded-xl bg-panel border border-edge h-[420px]">
            <h3 className="font-bold text-sm text-ink mb-3">Weekly P&L</h3>
            <div className="h-[320px] relative">
              <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="none">
                {["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"].map((w, i) => (
                  <>
                    <rect key={w} x={30 + i * 45} y={160 - Math.max(20, 20 + Math.random() * 80)} width={35} height={Math.max(20, 20 + Math.random() * 80)} fill={Math.random() > 0.3 ? "var(--gain)" : "var(--loss)"} rx="4" />
                    <text x={47 + i * 45} y={185} textAnchor="middle" fontSize="9" fill="var(--mut)">{w}</text>
                  </>
                ))}
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}