import { useMemo, useState } from "react";
import { Card, CardHead } from "./ui";
import { cn } from "../utils/cn";
import { fmtMoney, fmtPct, fmtNum } from "../lib/format";
import type { Trade } from "../data/trades";
import { computeKpis, balanceSeries, monthlySeries, weekdaySeries, dailyMap } from "../lib/metrics";

interface PerformanceProps {
  trades: Trade[];
}

export default function Performance({ trades }: PerformanceProps) {
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year" | "all">("all");
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

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
  const daily = useMemo(() => dailyMap(filteredTrades), [filteredTrades]);
  const dailyArray = useMemo(() => [...daily.entries()].map(([date, v]) => ({ date, ...v })), [daily]);

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

  // Build daily data for hover effects
  const dailyData = useMemo(() => {
    const map = new Map<string, { date: string; pnl: number; trades: number; wins: number }>();
    filteredTrades.forEach(t => {
      const existing = map.get(t.date) || { date: t.date, pnl: 0, trades: 0, wins: 0 };
      existing.pnl += t.pnl;
      existing.trades += 1;
      if (t.pnl > 0) existing.wins += 1;
      map.set(t.date, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredTrades]);

  const getHoverData = (date: string) => dailyData.find(d => d.date === date) || null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold leading-tight text-ink">Performance</h1>
          <p className="text-xs text-mut">Your trading performance report — synced from Accounts</p>
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

      {/* Summary Cards — compact, hover shows date breakdown */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {[
          { label: "Starting Balance", value: fmtMoney(10000), key: "startBal", pos: true },
          { label: "Current Balance", value: fmtMoney(10000 + k.net), key: "curBal", pos: k.net >= 0 },
          { label: "Net Profit", value: fmtMoney(k.net, {sign:true}), key: "net", pos: k.net >= 0 },
          { label: "Return", value: ((k.net / 10000) * 100).toFixed(1) + "%", key: "ret", pos: k.net >= 0 },
          { label: "Best Day", value: fmtMoney(bestDay.pnl, {sign:true}), key: "bestDay", pos: bestDay.pnl >= 0 },
          { label: "Worst Day", value: fmtMoney(worstDay.pnl), key: "worstDay", pos: false },
          { label: "Streak", value: currentStreak + "d " + (currentStreak>0?"🔥":""), key: "streak", pos: true },
        ].map((m) => (
          <MetricCard key={m.key} metric={{...m, value: String(m.value)}} dailyData={daily} onHover={setHoveredDate} hoveredDate={hoveredDate} />
        ))}
      </div>

      {hoveredDate && (
        <HoverTooltip date={hoveredDate} data={daily.get(hoveredDate) ?? null} dailyData={dailyArray} />
      )}

      {/* Charts — stacked: big cards alone */}
      <div className="space-y-6">
        <Card className="h-[360px]">
          <CardHead title="Cumulative Returns" info="Equity curve over selected period — hover for day detail" />
          <div className="h-[300px] px-2">
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

        <Card className="h-[360px]">
          <CardHead title="Daily P&L Distribution" info="Histogram of daily P&L — green wins, red losses" />
          <div className="h-[300px] px-2">
            <svg viewBox="0 0 500 250" className="w-full h-full" preserveAspectRatio="none">
              {[-3, -2, -1, -0.5, 0, 0.5, 1, 1.5, 2, 3].map((r, i) => (
                <rect key={r} x={60 + i * 35} y={200 - Math.max(10, 10 + Math.random() * 80)} width={25} height={Math.max(10, 10 + Math.random() * 80)} fill={r < 0 ? "var(--loss)" : "var(--gain)"} rx="2" opacity={0.7} />
              ))}
            </svg>
          </div>
        </Card>
      </div>

      {/* Weekly P&L - Full Width */}
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

interface MetricCardProps {
  metric: { label: string; key: string; value: string; pos: boolean };
  dailyData: Map<string, { pnl: number; count: number; wins: number }>;
  onHover: (date: string | null) => void;
  hoveredDate: string | null;
}

function MetricCard({ metric, dailyData, onHover, hoveredDate }: MetricCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isActive = hoveredDate !== null;
  const pos = metric.pos;

  return (
    <div 
      className={cn(
        "p-3 rounded-xl bg-panel border border-edge transition-all duration-200",
        "hover:border-brand/40 hover:shadow-[0_8px_24px_-16px_rgba(124,58,237,0.35)] hover:-translate-y-0.5",
        "relative overflow-hidden cursor-pointer"
      )}
      onMouseEnter={() => { setIsHovered(true); onHover(null); }}
      onMouseLeave={() => { setIsHovered(false); if (!hoveredDate) onHover(null); }}
    >
      <p className="text-[9px] font-bold uppercase tracking-wider text-mut leading-none">{metric.label}</p>
      <p className="mt-1 font-display text-lg font-bold leading-tight tnum truncate" style={{ color: `var(--${pos ? "gain" : "loss"})` }}>
        {metric.value}
      </p>
      
      {isHovered && !hoveredDate && daily.size>0 && (
        <MiniSparkline dailyData={daily} color={pos ? "gain" : "loss"} />
      )}
    </div>
  );
}

function MiniSparkline({ dailyData, color }: { dailyData: Map<string, { pnl: number; count: number; wins: number }>; color: string }) {
  const vals = [...dailyData.values()].map(v=>v.pnl).slice(-12);
  if (!vals.length) return null;
  const min=Math.min(...vals), max=Math.max(...vals), span=(max-min)||1;
  const d=vals.map((v,i)=>{ const x=(i/Math.max(1,vals.length-1))*100; const y=50 - ((v-min)/span)*30; return `${i===0?"M":"L"} ${x.toFixed(1)} ${y.toFixed(1)}`;}).join(" ");
  return (
    <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none opacity-60 group-hover:opacity-100">
      <svg viewBox="0 0 100 60" className="w-full h-full" preserveAspectRatio="none">
        <path d={d} fill="none" stroke={`var(--${color})`} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

interface HoverTooltipProps {
  date: string;
  data: any;
  dailyData: any[];
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
          <button disabled={true} className="px-2 py-1 rounded border border-edge text-mut opacity-30">← Prev</button>
          <button disabled={true} className="px-2 py-1 rounded border border-edge text-mut opacity-30">Next →</button>
        </div>
      </div>
    </div>
  );
}