import { useMemo, useState } from "react";
import { Card, CardHead } from "./ui";
import { cn } from "../utils/cn";
import { fmtMoney, fmtPct, fmtNum, fmtCompact } from "../lib/format";
import type { Trade } from "../data/trades";
import { computeKpis, balanceSeries, weekdaySeries, monthlySeries, splitByFilters, withRisk, dailyMap } from "../lib/metrics";
import RadarCard from "./charts/RadarCard";
import CumPnLCard from "./charts/CumPnLCard";
import HeatmapCard from "./charts/HeatmapCard";
import BalanceCard from "./charts/BalanceCard";
import DonutCard from "./charts/DonutCard";
import WeekdayBarCard from "./charts/WeekdayBarCard";
import { Calendar } from "../Calendar";

interface AnalyticsProps {
  trades: { date: string; pnl: number; symbol: string; side: string; strategy: string; account: string; ts: number }[];
  filters: { range: string; strategy: string; account: string };
  onFiltersChange: (f: Partial<{ range: string; strategy: string; account: string }>) => void;
}

interface HoverData {
  date: string;
  pnl: number;
  trades: number;
  winRate: number;
}

export default function Analytics({ trades, filters, onFiltersChange }: AnalyticsProps) {
  const [period, setPeriod] = useState<"week" | "month" | "all">("all");
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

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

  // Build daily data for hover effects
  const dailyData = useMemo(() => {
    const map = new Map<string, HoverData>();
    current.forEach(t => {
      const existing = map.get(t.date) || { date: t.date, pnl: 0, trades: 0, wins: 0 };
      existing.pnl += t.pnl;
      existing.trades += 1;
      if (t.pnl > 0) existing.wins += 1;
      map.set(t.date, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [current]);

  const getHoverData = (date: string): HoverData | null => {
    return dailyData.find(d => d.date === date) || null;
  };

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

      {/* KPI Row with Hover Effects */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Net P&L", key: "netPnl", value: current.reduce((s, t) => s + t.pnl, 0), pos: true, color: "gain" },
          { label: "Win Rate", key: "winRate", value: current.length ? current.filter(t => t.pnl > 0).length / current.length * 100 : 0, pos: true, color: "brand" },
          { label: "Profit Factor", key: "profitFactor", value: 1.24, pos: true, color: "brand" },
          { label: "Total Trades", key: "totalTrades", value: trades.length, pos: true, color: "ink" },
          { label: "Avg R", key: "avgR", value: 0.45, pos: true, color: "gain" },
          { label: "Expectancy", key: "expectancy", value: 0.45, pos: true, color: "gain" },
        ].map((m, i) => (
          <MetricCard key={m.key} metric={m} dailyData={dailyData} onHover={setHoveredDate} hoveredDate={hoveredDate} />
        ))}
      </div>

      {/* Hover Tooltip */}
      {hoveredDate && (
        <HoverTooltip date={hoveredDate} data={getHoverData(hoveredDate)} dailyData={dailyData} />
      )}

      {/* Charts Grid - Proper sizing: big cards full width, small cards side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Full Width Charts */}
        <div className="lg:col-span-12 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CumPnLCard trades={current} className="h-[400px]" />
            <RadarCard scores={{ overall: 81, axes: [] }} className="h-[400px]" />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <HeatmapCard trades={current} className="h-[400px]" />
            <BalanceCard trades={current} balance={25000} startBalance={25000} className="h-[400px]" />
          </div>
        </div>

        {/* Right Column - Side by Side Smaller Charts */}
        <div className="lg:col-span-12 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DonutCard data={{ wins: 72, losses: 56, be: 0, expectancy: 0.45 }} winRate={current.length ? current.filter(t => t.pnl > 0).length / current.length * 100 : 0} className="h-[350px]" />
            <WeekdayBarCard data={weekdaySeries(current)} className="h-[350px]" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <MonthlyPnLCard monthly={monthlySeries(current)} className="h-[300px]" />
            <WeeklyPnLCard weekly={weekdaySeries(current)} className="h-[300px]" />
            <DistributionCard trades={current} className="h-[300px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  metric: { label: string; key: string; value: number; pos: boolean; color: string };
  dailyData: HoverData[];
  onHover: (date: string | null) => void;
  hoveredDate: string | null;
}

function MetricCard({ metric, dailyData, onHover, hoveredDate }: MetricCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isActive = hoveredDate !== null;

  return (
    <div 
      className={cn(
        "p-4 rounded-xl bg-panel border border-edge transition-all duration-200",
        "hover:border-brand/50 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]",
        "relative overflow-visible"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); if (!isActive) onHover(null); }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-mut">{metric.label}</p>
      <p className="mt-1 font-display text-2xl font-bold tnum" style={{ color: `var(--${metric.color})` }}>
        {metric.label === "Win Rate" ? metric.value.toFixed(1) + "%" :
         metric.label === "Profit Factor" ? metric.value.toFixed(2) :
         metric.label.includes("R") ? metric.value.toFixed(2) :
         metric.label === "Net P&L" ? (metric.value >= 0 ? "+" : "") + metric.value.toLocaleString() :
         metric.value.toLocaleString()}
      </p>
      
      {/* Mini sparkline on hover */}
      {isHovered && !isActive && (
        <MiniSparkline dailyData={dailyData} color={metric.color} />
      )}
    </div>
  );
}

function MiniSparkline({ dailyData, color }: { dailyData: HoverData[]; color: string }) {
  if (!dailyData.length) return null;
  const maxPnl = Math.max(...dailyData.map(d => Math.abs(d.pnl)), 1);
  const points = dailyData.map((d, i) => {
    const x = (i / Math.max(1, dailyData.length - 1)) * 100;
    const y = 100 - ((d.pnl + maxPnl) / (maxPnl * 2)) * 80;
    return `${x}%,${y}%`;
  }).join(" ");
  
  return (
    <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        <path d={`M ${points}`} fill="none" stroke={`var(--${color})`} strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      </svg>
    </div>
  );
}

interface HoverTooltipProps {
  date: string;
  data: HoverData | null;
  dailyData: HoverData[];
}

function HoverTooltip({ date, data, dailyData }: HoverTooltipProps) {
  if (!data) return null;
  
  const dayIndex = dailyData.findIndex(d => d.date === date);
  const isLast = dayIndex === dailyData.length - 1;
  const isFirst = dayIndex === 0;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-80 animate-toastIn pointer-events-none">
      <div className="bg-panel border border-brand/30 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-ink">{new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</span>
          <span className={`font-bold tnum ${data.pnl >= 0 ? "text-gain" : "text-loss"}`}>
            {data.pnl >= 0 ? "+" : ""}{data.pnl.toLocaleString()}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 rounded-lg bg-panel2">
            <p className="text-[10px] text-mut">Trades</p>
            <p className="font-bold text-ink">{data.trades}</p>
          </div>
          <div className="p-2 rounded-lg bg-panel2">
            <p className="text-[10px] text-mut">Win Rate</p>
            <p className="font-bold text-gain">{(data.wins / Math.max(1, data.trades) * 100).toFixed(1)}%</p>
          </div>
          <div className="p-2 rounded-lg bg-panel2">
            <p className="text-[10px] text-mut">Avg P&L</p>
            <p className="font-bold text-ink">{Math.round(data.pnl / Math.max(1, data.trades))}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-mut">
          <button onClick={() => window.dispatchEvent(new CustomEvent("analytics-hover-prev", { detail: date }))} disabled={isFirst} className="px-2 py-1 rounded border border-edge text-mut hover:text-ink disabled:opacity-30">← Prev</button>
          <button onClick={() => window.dispatchEvent(new CustomEvent("analytics-hover-next", { detail: date }))} disabled={isLast} className="px-2 py-1 rounded border border-edge text-mut hover:text-ink disabled:opacity-30">Next →</button>
        </div>
      </div>
    </div>
  );
}

interface MonthlyPnLCardProps {
  monthly: { month: string; pnl: number; trades: number }[];
  className?: string;
}

function MonthlyPnLCard({ monthly, className }: MonthlyPnLCardProps) {
  const maxAbs = Math.max(...monthly.map(m => Math.abs(m.pnl)), 1);
  return (
    <Card className={cn("p-4 h-full", className)}>
      <h3 className="font-bold text-sm text-ink mb-3">Monthly P&L</h3>
      <div className="h-full space-y-2">
        {monthly.map((m) => (
          <div key={m.month} className="flex items-center justify-between text-sm">
            <span className="font-medium text-mut w-12">{m.month}</span>
            <div className="flex-1 h-2 bg-panel2 rounded-full mx-3 overflow-hidden">
              <div className="h-full rounded-full" style={{ 
                width: `${Math.min(100, Math.max(0, 50 + (m.pnl / maxAbs) * 50))}%`,
                background: m.pnl >= 0 ? "var(--gain)" : "var(--loss)"
              }} />
            </div>
            <span className={`font-bold tnum w-16 text-right ${m.pnl >= 0 ? "text-gain" : "text-loss"}`}>
              {m.pnl >= 0 ? "+" : ""}${m.pnl}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

interface WeeklyPnLCardProps {
  weekly: { day: string; pnl: number; count: number }[];
  className?: string;
}

function WeeklyPnLCard({ weekly, className }: WeeklyPnLCardProps) {
  return (
    <Card className={cn("p-4 h-full", className)}>
      <h3 className="font-bold text-sm text-ink mb-3">Weekly P&L</h3>
      <div className="h-full flex items-end justify-center gap-4">
        {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => (
          <div key={d} className="flex-1 flex flex-col items-center justify-end">
            <div className={`w-full rounded-t`} style={{ 
              height: `${Math.max(20, 20 + Math.random() * 80)}%`,
              background: Math.random() > 0.3 ? "var(--gain)" : "var(--loss)",
              minHeight: "20px"
            }} />
            <span className="text-[10px] text-mut mt-2">{d}</span>
            <span className="text-[10px] font-bold text-gain">+$120</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

interface DistributionCardProps {
  trades: Trade[];
  className?: string;
}

function DistributionCard({ trades, className }: DistributionCardProps) {
  return (
    <Card className={cn("p-4 h-full", className)}>
      <h3 className="font-bold text-sm text-ink mb-3">Daily P&L Distribution</h3>
      <div className="h-[200px] relative">
        <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="none">
          {[-3, -2, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3].map((r, i) => (
            <rect key={r} x={60 + i * 35} y={200 - Math.max(10, 10 + Math.random() * 80)} width={25} height={Math.max(10, 10 + Math.random() * 80)} fill={r < 0 ? "var(--loss)" : "var(--gain)"} rx="2" opacity={0.7} />
          ))}
        </svg>
      </div>
    </Card>
  );
}

import { useState } from "react";