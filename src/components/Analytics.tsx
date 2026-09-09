import { useMemo, useState } from "react";
import { Card, CardHead } from "./ui";
import { cn } from "../utils/cn";
import { fmtMoney } from "../lib/format";
import type { Trade } from "../data/trades";
import { computeKpis, balanceSeries, weekdaySeries, monthlySeries, withRisk, dailyMap } from "../lib/metrics";
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

export default function Analytics({ trades }: AnalyticsProps) {
  const [period, setPeriod] = useState<"week" | "month" | "all">("all");
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const current = useMemo(() => {
    if (period === "week") {
      const c = new Date(); c.setDate(c.getDate() - 7);
      return trades.filter((t) => new Date(t.date) >= c);
    }
    if (period === "month") {
      const c = new Date(); c.setMonth(c.getMonth() - 1);
      return trades.filter((t) => new Date(t.date) >= c);
    }
    return trades;
  }, [trades, period]);

  const k = useMemo(() => withRisk(computeKpis(current), current), [current]);
  const bal = useMemo(() => balanceSeries(current), [current]);
  const wd = useMemo(() => weekdaySeries(current), [current]);
  const monthly = useMemo(() => monthlySeries(current), [current]);
  const scores = useMemo(() => ({ overall: 81, axes: [
    { axis: "Profit Factor", value: 72 },
    { axis: "Win Rate", value: 56 },
    { axis: "Risk Control", value: 68 },
    { axis: "Discipline", value: 74 },
    { axis: "Consistency", value: 61 },
  ]}), []);
  const donut = useMemo(() => [
    { name: "Winners", value: k.wins, tone: "gain" as const },
    { name: "Losers", value: k.losses, tone: "loss" as const },
    { name: "Breakeven", value: k.be, tone: "flat" as const },
  ].filter(d=>d.value>0), [k]);
  const winRate = k.winRate;

  const daily = useMemo(() => dailyMap(current), [current]);
  const hoverInfo = hoverDate ? daily.get(hoverDate) : null;

  const totals = useMemo(() => ({
    net: current.reduce((s,t)=>s+t.pnl,0),
    winRate: current.length ? (current.filter(t=>t.pnl>0).length/current.length)*100 : 0,
    pf: k.pf,
    count: current.length,
  }), [current, k]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Analytics</h1>
          <p className="text-sm text-mut">Deep dive into your trading edge — hover any metric for a date-specific breakdown.</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-panel2 p-1">
          {(["week","month","all"] as const).map((p) => (
            <button key={p} onClick={()=>setPeriod(p)} className={cn("rounded-lg px-3 py-1.5 text-sm font-bold", period===p ? "bg-brand text-white shadow" : "text-mut hover:text-ink")}>
              {p==="week" ? "7D" : p==="month" ? "30D" : "All"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row — tradezella style hover: card lifts, shows sparkline + hover date value */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <HoverKpi label="Net P&L" value={fmtMoney(totals.net, {sign:true})} tone={totals.net>=0?"gain":"loss"} hoverDate={hoverDate} hoverValue={hoverInfo? fmtMoney(hoverInfo.pnl,{sign:true}) : null} sub={hoverInfo? `${hoverInfo.count} trades` : `${k.count} in view`} onHoverDay={(d)=>setHoverDate(d)} daily={daily} />
        <HoverKpi label="Win Rate" value={`${totals.winRate.toFixed(1)}%`} tone="brand" hoverValue={hoverInfo? `${((hoverInfo.wins/hoverInfo.count)*100).toFixed(0)}%` : null} sub={hoverInfo? `${hoverInfo.wins}W / ${hoverInfo.count-hoverInfo.wins}L` : `${k.wins}W / ${k.losses}L`} daily={daily} onHoverDay={setHoverDate} hoverDate={hoverDate} />
        <HoverKpi label="Profit Factor" value={k.pf.toFixed(2)} tone={k.pf>=1.5?"gain":k.pf>=1?"brand":"loss"} sub={hoverInfo? `day PF ${(hoverInfo.pnl>0? (hoverInfo.pnl/ Math.max(1, Math.abs(hoverInfo.pnl))):0).toFixed(2)}` : `${k.grossProfit.toFixed(0)} won · ${k.grossLoss.toFixed(0)} lost`} daily={daily} hoverDate={hoverDate} onHoverDay={setHoverDate} />
        <HoverKpi label="Trades" value={String(k.count)} tone="brand" sub={hoverInfo? `${hoverInfo.count} on ${hoverInfo.date}` : `${k.wins}W · ${k.losses}L`} daily={daily} hoverDate={hoverDate} onHoverDay={setHoverDate} />
        <HoverKpi label="Avg R" value={`${k.wlRatio.toFixed(2)}×`} tone={k.wlRatio>=1?"gain":"brand"} sub={`expectancy ${k.expectancy.toFixed(2)}`} daily={daily} hoverDate={hoverDate} onHoverDay={setHoverDate} />
        <HoverKpi label="Expectancy" value={fmtMoney(k.expectancy,{sign:true})} tone={k.expectancy>=0?"gain":"loss"} sub={`${k.be} breakeven`} daily={daily} hoverDate={hoverDate} onHoverDay={setHoverDate} />
      </div>

      {/* Cool metrics — tradezella-style animated tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CoolMetric icon="◈" label="Expectancy" value={fmtMoney(k.expectancy,{sign:true})} sub={`${k.wins}W · ${k.losses}L · ${k.be}BE`} tone={k.expectancy>=0?"gain":"loss"} spark={useMemo(()=> [...daily.values()].map(d=>d.pnl), [daily])} onHover={setHoverDate} hoverDate={hoverDate} />
        <CoolMetric icon="🔥" label="Streak" value={`${k.streak.len} ${k.streak.type}`} tone={k.streak.type==="win"?"gain":k.streak.type==="loss"?"loss":"brand"} sub={`${k.streak.type==="none"?"no streak":k.streak.type==="win"?"keep discipline":"size down"}`} spark={useMemo(()=> [...daily.values()].map(d=>d.pnl>0?1:-1), [daily])} onHover={setHoverDate} hoverDate={hoverDate} />
        <CoolMetric icon="◆" label="Best / Worst" value={`${fmtMoney(k.bestTrade)} / ${fmtMoney(k.worstTrade)}`} tone="brand" sub={`avg win ${fmtMoney(k.avgWin)} · avg loss ${fmtMoney(k.avgLoss)}`} spark={current.map(t=>t.pnl)} onHover={setHoverDate} hoverDate={hoverDate} />
        <CoolMetric icon="⬢" label="Profit Factor" value={k.pf.toFixed(2)} tone={k.pf>=1.5?"gain":k.pf>=1?"brand":"loss"} sub={`${fmtMoney(k.grossProfit)} won · ${fmtMoney(k.grossLoss)} lost`} spark={useMemo(()=> monthly.map(m=>m.pnl), [monthly])} onHover={setHoverDate} hoverDate={hoverDate} />
      </div>

      {/* Stacked layout: big cards alone, small side-by-side */}
      <div className="space-y-4">
        {/* BIG: Cumulative P&L alone */}
        <div className="h-[380px]">
          <CumPnLCard data={useMemo(()=> { const m=new Map<string,number>(); current.forEach(t=>m.set(t.date,(m.get(t.date)||0)+t.pnl)); const days=[...m.keys()].sort(); let a=0; return days.map(d=>{a+=m.get(d)!; return {date:d, value:Math.round(a), daily:m.get(d)!}})}, [current])} />
        </div>

        {/* SMALL side-by-side */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-[380px]"><RadarCard scores={scores} /></div>
          <div className="h-[380px]"><DonutCard data={donut} winRate={winRate} /></div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-[380px]"><WeekdayBarCard data={wd} /></div>
          <div className="h-[380px]"><HeatmapCard trades={current} /></div>
        </div>

        {/* BIG: Balance alone */}
        <div className="h-[400px]"><BalanceCard data={bal} /></div>

        {/* SMALL side-by-side: monthly + distribution */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="h-[320px]"><MonthlyCard data={monthly} onHover={setHoverDate} hoverDate={hoverDate} /></div>
          <div className="h-[320px]"><WeeklyCard data={wd} onHover={setHoverDate} hoverDate={hoverDate} /></div>
          <div className="h-[320px]"><DistributionCard daily={daily} onHover={setHoverDate} hoverDate={hoverDate} /></div>
        </div>
      </div>
    </div>
  );
}

function HoverKpi({ label, value, tone, sub, daily, hoverValue, hoverDate, onHoverDay }: { label:string; value:string; tone:string; sub?:string; hoverValue?:string|null; daily: Map<string, {pnl:number; count:number; wins:number}>; hoverDate:string|null; onHoverDay:(d:string|null)=>void }) {
  const [open, setOpen] = useState(false);
  const days = useMemo(()=> [...daily.keys()].slice(-12), [daily]);
  return (
    <div
      onMouseEnter={()=>setOpen(true)}
      onMouseLeave={()=>{ setOpen(false); onHoverDay(null); }}
      className={cn("group relative rounded-2xl border bg-panel p-4 transition-all", open ? "border-brand/40 shadow-[0_12px_32px_-16px_rgba(124,58,237,0.35)] -translate-y-0.5" : "border-edge shadow-[var(--shadow)]")}
    >
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-mut">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold tnum" style={{color:`var(--${tone})`}}>{hoverValue ?? value}</p>
      {sub && <p className="mt-1 text-[11px] font-medium text-faint">{hoverValue ? `now · ${sub}` : sub}</p>}
      {open && days.length>0 && (
        <div className="absolute inset-x-0 top-full z-10 mt-2 hidden group-hover:block">
          <div className="rounded-xl border border-edge bg-panel p-2 shadow-xl">
            <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-mut">Hover a day</p>
            <div className="grid grid-cols-3 gap-1">
              {days.map(d=> {
                const rec=daily.get(d)!;
                const active=hoverDate===d;
                return (
                  <button key={d} onMouseEnter={()=>onHoverDay(d)} className={cn("rounded-lg px-2 py-1.5 text-left text-xs transition-colors", active?"bg-brand text-white":"bg-panel2 text-mut hover:bg-brand-soft hover:text-ink")}>
                    <span className="block font-bold">{d.slice(5)}</span>
                    <span className={cn("tnum text-[11px]", active? "text-white/90" : rec.pnl>=0? "text-gain":"text-loss")}>{rec.pnl>=0?"+":""}{rec.pnl}</span>
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

function MonthlyCard({ data, onHover, hoverDate }: { data: { month: string; pnl: number; trades: number }[]; onHover:(d:string|null)=>void; hoverDate:string|null }) {
  const max = Math.max(...data.map(d=>Math.abs(d.pnl)), 1);
  return (
    <Card className="flex h-full flex-col p-4">
      <h3 className="text-sm font-bold text-ink">Monthly P&L</h3>
      <div className="mt-3 flex-1 space-y-2 overflow-hidden">
        {data.slice(0,6).map(m=> {
          const active = hoverDate && m.month.toLowerCase().includes(new Date(hoverDate).toLocaleString("en-US",{month:"short"}).toLowerCase());
          return (
            <div key={m.month} onMouseEnter={()=>onHover(m.month)} onMouseLeave={()=>onHover(null)} className={cn("flex items-center gap-3 rounded-lg px-2 py-1 transition-colors", active?"bg-brand-soft":"")}>
              <span className="w-10 text-xs font-bold text-mut">{m.month}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-panel2">
                <div className="h-full rounded-full transition-all" style={{width:`${Math.min(100, Math.max(0, 50+(m.pnl/max)*50))}%`, background: m.pnl>=0?"var(--gain)":"var(--loss)"}} />
              </div>
              <span className={cn("w-16 text-right text-xs font-bold tnum", m.pnl>=0?"text-gain":"text-loss")}>{m.pnl>=0?"+":""}${m.pnl}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function WeeklyCard({ data, onHover, hoverDate }: { data:{day:string;pnl:number;count:number}[]; hoverDate:string|null; onHover:(d:string|null)=>void }) {
  return (
    <Card className="flex h-full flex-col p-4">
      <h3 className="text-sm font-bold text-ink">P&L by Weekday</h3>
      <div className="mt-3 grid flex-1 grid-cols-5 gap-2">
        {data.map(d=> {
          const h = Math.min(100, Math.max(18, (Math.abs(d.pnl)/1200)*100));
          const isActive = hoverDate && new Date(hoverDate).toLocaleDateString("en-US",{weekday:"short"}).slice(0,3).toLowerCase()===d.day.toLowerCase().slice(0,3);
          return (
            <div key={d.day} onMouseEnter={()=>onHover(d.day)} onMouseLeave={()=>onHover(null)} className={cn("flex flex-col items-center justify-end rounded-xl border p-2 transition-all", isActive?"border-brand bg-brand-soft -translate-y-1 shadow":"border-edge bg-panel2")}>
              <div className="flex w-full justify-center" style={{height:80}}>
                <div className="w-8 self-end rounded-t-lg transition-all" style={{height:`${h}%`, background: d.pnl>=0?"var(--gain)":"var(--loss)"}} />
              </div>
              <span className="mt-2 text-[10px] font-bold uppercase text-mut">{d.day}</span>
              <span className={cn("text-[11px] font-bold tnum", d.pnl>=0?"text-gain":"text-loss")}>{d.pnl>=0?"+":""}{d.pnl}</span>
              <span className="text-[10px] text-faint">{d.count}t</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function DistributionCard({ daily, onHover, hoverDate }: { daily: Map<string,{pnl:number;count:number;wins:number}>; hoverDate:string|null; onHover:(d:string|null)=>void }) {
  const buckets = useMemo(()=>{
    const vals=[...daily.values()].map(v=>v.pnl);
    if(!vals.length) return [];
    const min=Math.min(...vals), max=Math.max(...vals);
    const step=(max-min)/10 || 1;
    return Array.from({length:10},(_,i)=> {
      const lo=min+i*step, hi=lo+step;
      const c=vals.filter(v=>v>=lo && v<hi).length;
      return {lo, hi, c, neg: hi<0, pos: lo>0};
    });
  },[daily]);
  const maxC=Math.max(...buckets.map(b=>b.c),1);
  return (
    <Card className="flex h-full flex-col p-4">
      <h3 className="text-sm font-bold text-ink">Daily P&L Distribution</h3>
      <div className="mt-3 flex flex-1 items-end gap-1">
        {buckets.map((b,i)=> {
          const h=(b.c/maxC)*100;
          return (
            <div key={i} onMouseEnter={()=>onHover([...daily.keys()][i] ?? null)} onMouseLeave={()=>onHover(null)} className="group flex flex-1 flex-col items-center gap-1">
              <div className="w-full rounded-t transition-all group-hover:opacity-90" style={{height:`${Math.max(8,h)}%`, minHeight:8, background: b.neg? "var(--loss)" : b.pos? "var(--gain)" : "var(--brand)", opacity:0.55 + (b.c/maxC)*0.45}} />
              <span className="hidden text-[8px] font-bold text-faint group-hover:block">{b.c}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[10px] font-medium text-faint">hover a bar to see the day: ${hoverDate ? daily.get(hoverDate)?.pnl : "—"}</p>
    </Card>
  );
}

function CoolMetric({ icon, label, value, sub, tone, spark, hoverDate, onHover }: { icon:string; label:string; value:string; sub:string; tone:string; spark:number[]; hoverDate:string|null; onHover:(d:string|null)=>void }) {
  const max = Math.max(...spark.map(v=>Math.abs(v)), 1);
  const path = spark.map((v,i)=> {
    const x=(i/Math.max(1,spark.length-1))*100;
    const y=24 - ((v+max)/(max*2))*18;
    return `${i===0?"M":"L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-edge bg-panel p-4 transition-all hover:-translate-y-1 hover:border-brand/30 hover:shadow-[0_12px_32px_-16px_rgba(124,58,237,0.35)]">
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[radial-gradient(circle,var(--brand-soft),transparent_70%)] opacity-60" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-mut">{label}</p>
          <p className="mt-1 font-display text-xl font-bold tnum" style={{color:`var(--${tone})`}}>{value}</p>
          <p className="mt-1 text-[11px] font-medium text-faint">{sub}</p>
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-soft text-brand">{icon}</span>
      </div>
      <svg viewBox="0 0 100 24" className="mt-3 h-8 w-full" preserveAspectRatio="none">
        <path d={path} fill="none" stroke={`var(--${tone})`} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
      </svg>
    </div>
  );
}
