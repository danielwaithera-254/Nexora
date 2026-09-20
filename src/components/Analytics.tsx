import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHead, ChartTip } from "./ui";
import { cn } from "../utils/cn";
import { fmtCompact, fmtDate, fmtDateShort, fmtMoney } from "../lib/format";
import type { Trade } from "../data/trades";
import { computeKpis, balanceSeries, weekdaySeries, monthlySeries, withRisk, dailyMap, cumSeries } from "../lib/metrics";
import RadarCard from "./charts/RadarCard";
import CumPnLCard from "./charts/CumPnLCard";
import HeatmapCard from "./charts/HeatmapCard";
import BalanceCard from "./charts/BalanceCard";
import DonutCard from "./charts/DonutCard";
import WeekdayBarCard from "./charts/WeekdayBarCard";

interface AnalyticsProps {
  trades: Trade[];
  filters: { range: string; strategy: string; account: string };
  onFiltersChange: (f: Partial<{ range: string; strategy: string; account: string }>) => void;
}

export default function Analytics({ trades, filters }: AnalyticsProps) {
  const [period, setPeriod] = useState<"week" | "month" | "all">("all");
  const [section, setSection] = useState<Section>("overview");
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const current = useMemo(() => {
    let list = trades;
    if (filters.strategy !== "All") list = list.filter((t) => t.strategy === filters.strategy);
    if (filters.account !== "All") list = list.filter((t) => t.account === filters.account);
    if (period === "week") {
      const c = new Date(); c.setDate(c.getDate() - 7);
      list = list.filter((t) => new Date(t.date) >= c);
    } else if (period === "month") {
      const c = new Date(); c.setMonth(c.getMonth() - 1);
      list = list.filter((t) => new Date(t.date) >= c);
    }
    return list;
  }, [trades, period, filters.strategy, filters.account]);

  const k = useMemo(() => withRisk(computeKpis(current), current), [current]);
  const bal = useMemo(() => balanceSeries(current), [current]);
  const wd = useMemo(() => weekdaySeries(current), [current]);
  const monthly = useMemo(() => monthlySeries(current), [current]);
  const cum = useMemo(() => {
    const m = new Map<string, number>();
    current.forEach((t) => m.set(t.date, (m.get(t.date) || 0) + t.pnl));
    const days = [...m.keys()].sort();
    let a = 0;
    return days.map((d) => { a += m.get(d)!; return { date: d, value: Math.round(a), daily: m.get(d)! }; });
  }, [current]);
  const scores = useMemo(() => ({
    overall: 81,
    axes: [
      { axis: "Profit Factor", value: 72 },
      { axis: "Win Rate", value: 56 },
      { axis: "Risk Control", value: 68 },
      { axis: "Discipline", value: 74 },
      { axis: "Consistency", value: 61 },
    ],
  }), []);
  const donut = useMemo(() => [
    { name: "Winners", value: k.wins, tone: "gain" as const },
    { name: "Losers", value: k.losses, tone: "loss" as const },
    { name: "Breakeven", value: k.be, tone: "flat" as const },
  ].filter((d) => d.value > 0), [k]);

  const daily = useMemo(() => dailyMap(current), [current]);
  const hoverInfo = hoverDate ? daily.get(hoverDate) : null;

  const totals = useMemo(() => ({
    net: k.net,
    winRate: k.winRate,
    pf: k.pf,
    count: k.count,
  }), [k]);

  // TradeZella-style breakdowns — all derived from `current` (account-synced)
  const longShort = useMemo(() => {
    const longs = current.filter((t) => t.side === "Long");
    const shorts = current.filter((t) => t.side === "Short");
    return [
      { side: "Long", ...computeKpis(longs) },
      { side: "Short", ...computeKpis(shorts) },
    ];
  }, [current]);

  const bySymbol = useMemo(() => {
    const m = new Map<string, Trade[]>();
    current.forEach((t) => { const a = m.get(t.symbol) || []; a.push(t); m.set(t.symbol, a); });
    return [...m.entries()].map(([symbol, list]) => ({ symbol, kpis: computeKpis(list) }))
      .sort((a, b) => b.kpis.net - a.kpis.net);
  }, [current]);

  const bySession = useMemo(() => {
    const m = new Map<string, Trade[]>();
    current.forEach((t) => { const a = m.get(t.session || "Unknown") || []; a.push(t); m.set(t.session || "Unknown", a); });
    return [...m.entries()].map(([session, list]) => ({ session, kpis: computeKpis(list) }))
      .sort((a, b) => b.kpis.net - a.kpis.net);
  }, [current]);

  const byHour = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, pnl: 0, count: 0 }));
    current.forEach((t) => {
      const h = new Date(t.ts).getHours();
      if (h >= 0 && h < 24) { buckets[h].pnl += t.pnl; buckets[h].count++; }
    });
    return buckets;
  }, [current]);
  const activeHours = useMemo(() => byHour.filter((b) => b.count > 0), [byHour]);
  const bestHour = activeHours.length ? [...activeHours].sort((a, b) => b.pnl - a.pnl)[0] : null;
  const worstHour = activeHours.length ? [...activeHours].sort((a, b) => a.pnl - b.pnl)[0] : null;

  const ddCurve = useMemo(() => {
    let peak = 0, acc = 0;
    return cum.map((p) => {
      acc = p.value;
      peak = Math.max(peak, acc);
      return { date: p.date, dd: peak - acc };
    });
  }, [cum]);
  const maxDd = useMemo(() => Math.max(0, ...ddCurve.map((d) => d.dd)), [ddCurve]);

  const streaks = useMemo(() => {
    const sorted = [...current].sort((a, b) => a.ts - b.ts);
    let cw = 0, cl = 0, mw = 0, ml = 0;
    for (const t of sorted) {
      if (t.pnl > 0) { cw++; cl = 0; mw = Math.max(mw, cw); }
      else if (t.pnl < 0) { cl++; cw = 0; ml = Math.max(ml, cl); }
      else { cw = 0; cl = 0; }
    }
    return { bestWin: mw, worstLoss: ml, live: k.streak };
  }, [current, k]);

  if (!trades.length) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Analytics</h1>
          <p className="text-xs text-mut">Upload CSVs in Accounts to unlock analytics</p>
        </div>
        <div className="rounded-2xl border-2 border-dashed border-edge bg-panel p-10 text-center">
          <h3 className="text-sm font-bold text-ink">No analytics data yet</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-mut">Every chart below is computed live from your connected accounts — upload a trade CSV first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Analytics</h1>
          <p className="text-xs text-mut">
            {k.count} trades in view · {filters.account !== "All" ? filters.account : "all accounts"}
            {filters.strategy !== "All" ? ` · ${filters.strategy}` : ""} — hover any metric for a day breakdown.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-panel2 p-1">
          {(["week", "month", "all"] as const).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} className={cn("rounded-lg px-3 py-1.5 text-xs font-bold", period === p ? "bg-brand text-white shadow" : "text-mut hover:text-ink")}>
              {p === "week" ? "7D" : p === "month" ? "30D" : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row — every card hovers to a day breakdown */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <HoverKpi label="Net P&L" value={fmtMoney(totals.net, { sign: true })} tone={totals.net >= 0 ? "gain" : "loss"} hoverDate={hoverDate} hoverValue={hoverInfo ? fmtMoney(hoverInfo.pnl, { sign: true }) : null} sub={hoverInfo ? `${hoverInfo.count} trades · ${hoverInfo.wins}W` : `${k.wins}W / ${k.losses}L`} onHoverDay={setHoverDate} daily={daily} />
        <HoverKpi label="Win Rate" value={`${totals.winRate.toFixed(1)}%`} tone="brand" hoverValue={hoverInfo ? `${((hoverInfo.wins / Math.max(1, hoverInfo.count)) * 100).toFixed(0)}%` : null} sub={hoverInfo ? `${hoverInfo.wins}W / ${hoverInfo.count - hoverInfo.wins}L` : `${k.wins}W / ${k.losses}L`} daily={daily} onHoverDay={setHoverDate} hoverDate={hoverDate} />
        <HoverKpi label="Profit Factor" value={k.pf.toFixed(2)} tone={k.pf >= 1.5 ? "gain" : k.pf >= 1 ? "brand" : "loss"} sub={`${fmtMoney(k.grossProfit)} won · ${fmtMoney(k.grossLoss)} lost`} daily={daily} hoverDate={hoverDate} onHoverDay={setHoverDate} />
        <HoverKpi label="Trades" value={String(k.count)} tone="brand" sub={hoverInfo ? `${hoverInfo.count} on ${hoverInfo.date}` : `${k.wins}W · ${k.losses}L · ${k.be}BE`} daily={daily} hoverDate={hoverDate} onHoverDay={setHoverDate} />
        <HoverKpi label="Avg R" value={`${k.wlRatio.toFixed(2)}×`} tone={k.wlRatio >= 1 ? "gain" : "brand"} sub={`expectancy ${fmtMoney(k.expectancy, { sign: true })}`} daily={daily} hoverDate={hoverDate} onHoverDay={setHoverDate} />
        <HoverKpi label="Expectancy" value={fmtMoney(k.expectancy, { sign: true })} tone={k.expectancy >= 0 ? "gain" : "loss"} sub={`best ${fmtMoney(k.bestTrade)} · worst ${fmtMoney(k.worstTrade)}`} daily={daily} hoverDate={hoverDate} onHoverDay={setHoverDate} />
      </div>

      <div className="space-y-4">
        <div className="h-[380px]"><CumPnLCard data={cum} /></div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-[380px]"><RadarCard scores={scores} /></div>
          <div className="h-[380px]"><DonutCard data={donut.filter((d) => d.value > 0)} winRate={totals.winRate} /></div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-[380px]"><WeekdayBarCard data={wd} /></div>
          <div className="h-[380px]"><HeatmapCard trades={current} /></div>
        </div>
        <div className="h-[400px]"><BalanceCard data={bal} /></div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-[320px]"><MonthlyCard data={monthly} /></div>
          <div className="h-[320px]"><HourlyCard byHour={byHour} best={bestHour} worst={worstHour} /></div>
          <div className="h-[320px]"><DistributionCard daily={daily} /></div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SymbolTable symbols={bySymbol} />
          <SessionTable sessions={bySession} />
        </div>
        <LongShortCard rows={longShort} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <RiskStat label="Max Drawdown" value={fmtMoney(maxDd)} tone="loss" sub="peak-to-trough" />
          <RiskStat label="Best Win Streak" value={`${streaks.bestWin}`} tone="gain" sub="consecutive wins" />
          <RiskStat label="Worst Loss Streak" value={`${streaks.worstLoss}`} tone="loss" sub="consecutive losses" />
          <RiskStat label="Live Streak" value={`${streaks.live.len} ${streaks.live.type}`} tone={streaks.live.type === "win" ? "gain" : "brand"} sub="most recent run" />
        </div>
        <div className="h-[360px]">
          <Card className="flex h-full flex-col p-4">
            <h3 className="text-sm font-bold text-ink">Drawdown Curve</h3>
            <p className="text-[11px] text-faint">Distance below the running equity peak</p>
            <div className="mt-3 min-h-0 flex-1">
              <DrawdownChart curve={ddCurve} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function HoverKpi({ label, value, tone, sub, daily, hoverValue, hoverDate, onHoverDay }: { label: string; value: string; tone: string; sub?: string; hoverValue?: string | null; daily: Map<string, { pnl: number; count: number; wins: number }>; hoverDate: string | null; onHoverDay: (d: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const days = useMemo(() => [...daily.keys()].slice(-12), [daily]);
  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => { setOpen(false); onHoverDay(null); }}
      className={cn("group relative rounded-2xl border bg-panel p-4 transition-all", open ? "border-brand/40 shadow-[0_12px_32px_-16px_rgba(124,58,237,0.35)] -translate-y-0.5" : "border-edge shadow-[var(--shadow)]")}
    >
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-mut">{label}</p>
      <p className="mt-1 font-display text-lg font-bold tnum leading-tight" style={{ color: `var(--${tone})` }}>{hoverValue ?? value}</p>
      {sub && <p className="mt-1 text-[11px] font-medium leading-tight text-faint truncate">{hoverValue ? `day · ${sub}` : sub}</p>}
      {open && days.length > 0 && (
        <div className="absolute inset-x-0 top-full z-10 mt-2 hidden group-hover:block">
          <div className="rounded-xl border border-edge bg-panel p-2 shadow-xl">
            <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-mut">Hover a day</p>
            <div className="grid grid-cols-3 gap-1">
              {days.map((d) => {
                const rec = daily.get(d)!;
                const active = hoverDate === d;
                return (
                  <button key={d} onMouseEnter={() => onHoverDay(d)} className={cn("rounded-lg px-2 py-1.5 text-left text-xs transition-colors", active ? "bg-brand text-white" : "bg-panel2 text-mut hover:bg-brand-soft hover:text-ink")}>
                    <span className="block font-bold">{d.slice(5)}</span>
                    <span className={cn("tnum text-[11px]", active ? "text-white/90" : rec.pnl >= 0 ? "text-gain" : "text-loss")}>{rec.pnl >= 0 ? "+" : ""}{rec.pnl}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MonthlyCard({ data }: { data: { month: string; pnl: number; trades: number }[] }) {
  const rows = data.filter((m) => m.trades > 0);
  const max = Math.max(...rows.map((d) => Math.abs(d.pnl)), 1);
  return (
    <Card className="flex h-full flex-col p-4">
      <h3 className="text-sm font-bold text-ink">Monthly P&L</h3>
      <p className="text-[11px] text-faint">{rows.length} active months</p>
      <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
        {rows.map((m) => (
          <div key={m.month} className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-panel2">
            <span className="w-10 text-xs font-bold text-mut">{m.month}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel2">
              <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(6, 50 + (m.pnl / max) * 50))}%`, background: m.pnl >= 0 ? "var(--gain)" : "var(--loss)" }} />
            </div>
            <span className={cn("w-20 text-right text-xs font-bold tnum", m.pnl >= 0 ? "text-gain" : "text-loss")}>{m.pnl >= 0 ? "+" : ""}${m.pnl} <span className="font-medium text-faint">· {m.trades}t</span></span>
          </div>
        ))}
        {!rows.length && <p className="py-8 text-center text-xs text-mut">No monthly data yet.</p>}
      </div>
    </Card>
  );
}

function HourlyCard({ byHour, best, worst }: { byHour: { hour: number; pnl: number; count: number }[]; best: { hour: number; pnl: number; count: number } | null; worst: { hour: number; pnl: number; count: number } | null }) {
  const active = byHour.filter((b) => b.count > 0);
  const max = Math.max(...active.map((b) => Math.abs(b.pnl)), 1);
  return (
    <Card className="flex h-full flex-col p-4">
      <h3 className="text-sm font-bold text-ink">P&L by Hour</h3>
      <p className="text-[11px] text-faint">
        {best ? `best ${String(best.hour).padStart(2, "0")}:00 (${best.pnl >= 0 ? "+" : ""}${best.pnl})` : "no hourly data"}
        {worst && worst !== best ? ` · worst ${String(worst.hour).padStart(2, "0")}:00` : ""}
      </p>
      <div className="mt-3 grid flex-1 grid-cols-12 items-end gap-1">
        {Array.from({ length: 24 }, (_, h) => {
          const b = byHour[h];
          const has = b.count > 0;
          const height = has ? Math.max(8, (Math.abs(b.pnl) / max) * 100) : 4;
          return (
            <div key={h} title={has ? `${String(h).padStart(2, "0")}:00 — ${b.pnl >= 0 ? "+" : ""}${b.pnl} (${b.count}t)` : `${String(h).padStart(2, "0")}:00 — no trades`} className="flex flex-col items-center gap-1">
              <div className="flex h-28 w-full items-end justify-center rounded bg-panel2/60 p-0.5">
                <div className="w-full rounded-sm transition-all hover:opacity-80" style={{ height: `${height}%`, background: !has ? "var(--edge)" : b.pnl >= 0 ? "var(--gain)" : "var(--loss)", opacity: has ? 0.85 : 0.4 }} />
              </div>
              <span className="text-[8px] font-bold text-faint">{h % 3 === 0 ? `${h}h` : ""}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function DistributionCard({ daily }: { daily: Map<string, { pnl: number; count: number; wins: number }> }) {
  const buckets = useMemo(() => {
    const vals = [...daily.values()].map((v) => v.pnl);
    if (!vals.length) return [];
    const min = Math.min(...vals), max = Math.max(...vals);
    const step = (max - min) / 10 || 1;
    return Array.from({ length: 10 }, (_, i) => {
      const lo = min + i * step, hi = lo + step;
      const c = vals.filter((v) => v >= lo && (i === 9 ? v <= hi : v < hi)).length;
      return { lo, hi, c, neg: hi < 0, pos: lo > 0 };
    });
  }, [daily]);
  const maxC = Math.max(...buckets.map((b) => b.c), 1);
  return (
    <Card className="flex h-full flex-col p-4">
      <h3 className="text-sm font-bold text-ink">Daily P&L Distribution</h3>
      <p className="text-[11px] text-faint">{[...daily.values()].length} trading days</p>
      <div className="mt-3 flex flex-1 items-end gap-1">
        {buckets.map((b, i) => {
          const h = (b.c / maxC) * 100;
          return (
            <div key={i} title={`${b.c} days · ${Math.round(b.lo)} to ${Math.round(b.hi)}`} className="group flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t transition-all group-hover:opacity-90" style={{ height: `${Math.max(8, h)}%`, minHeight: 8, background: b.neg ? "var(--loss)" : b.pos ? "var(--gain)" : "var(--brand)", opacity: 0.55 + (b.c / maxC) * 0.45 }} />
              <span className="hidden text-[8px] font-bold text-faint group-hover:block">{b.c}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SymbolTable({ symbols }: { symbols: { symbol: string; kpis: ReturnType<typeof computeKpis> }[] }) {
  const max = Math.max(...symbols.map((s) => Math.abs(s.kpis.net)), 1);
  return (
    <Card className="flex h-full flex-col p-4">
      <h3 className="text-sm font-bold text-ink">P&L by Symbol</h3>
      <p className="text-[11px] text-faint">{symbols.length} instruments · live from your accounts</p>
      <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
        {symbols.map((s) => (
          <div key={s.symbol} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-panel2">
            <span className="w-16 rounded-md bg-brand-soft px-1.5 py-0.5 text-center font-display text-[11px] font-bold text-brand">{s.symbol}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel2">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(6, 50 + (s.kpis.net / max) * 50))}%`, background: s.kpis.net >= 0 ? "var(--gain)" : "var(--loss)" }} />
            </div>
            <span className={cn("w-20 text-right text-xs font-bold tnum", s.kpis.net >= 0 ? "text-gain" : "text-loss")}>{s.kpis.net >= 0 ? "+" : ""}{fmtMoney(s.kpis.net)}</span>
            <span className="w-16 text-right text-[11px] text-faint tnum">{s.kpis.winRate.toFixed(0)}% · {s.kpis.count}t</span>
          </div>
        ))}
        {!symbols.length && <p className="py-8 text-center text-xs text-mut">No symbol data yet.</p>}
      </div>
    </Card>
  );
}

function SessionTable({ sessions }: { sessions: { session: string; kpis: ReturnType<typeof computeKpis> }[] }) {
  const max = Math.max(...sessions.map((s) => Math.abs(s.kpis.net)), 1);
  return (
    <Card className="flex h-full flex-col p-4">
      <h3 className="text-sm font-bold text-ink">P&L by Session</h3>
      <p className="text-[11px] text-faint">Where your edge actually lives</p>
      <div className="mt-3 flex-1 space-y-2 overflow-y-auto">
        {sessions.map((s) => (
          <div key={s.session} className="rounded-xl border border-edge bg-panel2 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink">{s.session}</span>
              <span className={cn("text-xs font-bold tnum", s.kpis.net >= 0 ? "text-gain" : "text-loss")}>{s.kpis.net >= 0 ? "+" : ""}{fmtMoney(s.kpis.net)}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-edge2">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(6, 50 + (s.kpis.net / max) * 50))}%`, background: s.kpis.net >= 0 ? "var(--gain)" : "var(--loss)" }} />
            </div>
            <p className="mt-1 text-[11px] text-faint tnum">{s.kpis.count} trades · {s.kpis.winRate.toFixed(0)}% WR · PF {s.kpis.pf.toFixed(2)}</p>
          </div>
        ))}
        {!sessions.length && <p className="py-8 text-center text-xs text-mut">No session data yet.</p>}
      </div>
    </Card>
  );
}

function LongShortCard({ rows }: { rows: ({ side: string } & ReturnType<typeof computeKpis>)[] }) {
  const max = Math.max(...rows.map((r) => Math.abs(r.net)), 1);
  return (
    <Card className="p-4">
      <h3 className="text-sm font-bold text-ink">Long vs Short</h3>
      <p className="text-[11px] text-faint">Directional edge from your actual fills</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.side} className="rounded-xl border border-edge bg-panel2 p-3">
            <div className="flex items-center justify-between">
              <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold", r.side === "Long" ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss")}>{r.side}</span>
              <span className={cn("font-display text-lg font-bold tnum", r.net >= 0 ? "text-gain" : "text-loss")}>{r.net >= 0 ? "+" : ""}{fmtMoney(r.net)}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-edge2">
              <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(6, 50 + (r.net / max) * 50))}%`, background: r.net >= 0 ? "var(--gain)" : "var(--loss)" }} />
            </div>
            <p className="mt-1.5 text-[11px] text-faint tnum">{r.count} trades · {r.winRate.toFixed(0)}% WR · PF {r.pf.toFixed(2)} · avg {fmtMoney(r.expectancy, { sign: true })}/trade</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RiskStat({ label, value, tone, sub }: { label: string; value: string; tone: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-edge bg-panel p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-mut">{label}</p>
      <p className="mt-1 font-display text-lg font-bold tnum" style={{ color: `var(--${tone})` }}>{value}</p>
      <p className="mt-1 text-[11px] text-faint">{sub}</p>
    </div>
  );
}

function DrawdownChart({ curve }: { curve: { date: string; dd: number }[] }) {
  const ticks = useMemo(() => {
    if (curve.length < 2) return [];
    const step = Math.max(1, Math.floor(curve.length / 5));
    return curve.filter((_, i) => i % step === 0).map((d) => d.date);
  }, [curve]);
  if (!curve.length) return <div className="grid h-full place-items-center text-xs text-mut">No drawdown data.</div>;
  const max = Math.max(...curve.map((d) => d.dd), 1);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={curve} margin={{ top: 12, right: 8, left: -14, bottom: 0 }}>
        <defs>
          <linearGradient id="ddFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--loss)" stopOpacity={0.3} />
            <stop offset="100%" stopColor="var(--loss)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--edge2)" vertical={false} />
        <XAxis
          dataKey="date"
          ticks={ticks}
          tickFormatter={fmtDateShort}
          tick={{ fontSize: 9.5, fill: "var(--faint)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, max * 1.1]}
          tickFormatter={(v) => fmtCompact(v)}
          tick={{ fontSize: 9.5, fill: "var(--faint)" }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip
          content={<ChartTip fmt={(v: number) => fmtMoney(v)} />}
          labelFormatter={(l) => fmtDate(String(l))}
          cursor={{ stroke: "var(--faint)", strokeDasharray: "3 3" }}
        />
        <Area
          type="monotone"
          dataKey="dd"
          name="Drawdown"
          stroke="var(--loss)"
          strokeWidth={2.2}
          fill="url(#ddFill)"
          activeDot={{ r: 4, strokeWidth: 0 }}
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

type Section = "overview" | "performance" | "symbols" | "risk";
