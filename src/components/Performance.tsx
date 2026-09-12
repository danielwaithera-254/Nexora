import { useMemo, useState } from "react";
import { Card, CardHead } from "./ui";
import { cn } from "../utils/cn";
import { fmtMoney } from "../lib/format";
import type { Trade } from "../data/trades";
import { computeKpis, balanceSeries, dailyMap } from "../lib/metrics";

interface PerformanceProps { trades: Trade[]; }

export default function Performance({ trades }: PerformanceProps) {
  const [period, setPeriod] = useState<"week" | "month" | "quarter" | "year" | "all">("all");
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const filteredTrades = useMemo(() => {
    if (!trades.length) return [];
    const c = new Date();
    if (period === "week") { c.setDate(c.getDate() - 7); return trades.filter(t => new Date(t.date) >= c); }
    if (period === "month") { c.setMonth(c.getMonth() - 1); return trades.filter(t => new Date(t.date) >= c); }
    if (period === "quarter") { c.setMonth(c.getMonth() - 3); return trades.filter(t => new Date(t.date) >= c); }
    if (period === "year") { c.setFullYear(c.getFullYear() - 1); return trades.filter(t => new Date(t.date) >= c); }
    return trades;
  }, [trades, period]);

  const k = useMemo(() => computeKpis(filteredTrades), [filteredTrades]);
  const daily = useMemo(() => dailyMap(filteredTrades), [filteredTrades]);
  const dailyArr = useMemo(() => [...daily.entries()].map(([date, v]) => ({ date, ...v })).sort((a,b)=>a.date.localeCompare(b.date)), [daily]);

  const bestDay = useMemo(() => {
    if (!dailyArr.length) return { date: "—", pnl: 0 };
    return dailyArr.reduce((b,c) => c.pnl > b.pnl ? c : b, dailyArr[0]);
  }, [dailyArr]);
  const worstDay = useMemo(() => {
    if (!dailyArr.length) return { date: "—", pnl: 0 };
    return dailyArr.reduce((w,c) => c.pnl < w.pnl ? c : w, dailyArr[0]);
  }, [dailyArr]);
  const currentStreak = useMemo(() => {
    if (!dailyArr.length) return 0;
    let s=0; const sorted=[...dailyArr].sort((a,b)=> b.date.localeCompare(a.date));
    for (const d of sorted) { if (d.pnl>0) s++; else break; }
    return s;
  }, [dailyArr]);

  const hoverData = hoverDate ? daily.get(hoverDate) : null;

  // stable weekly buckets from real daily data — no Math.random
  const weeklyBuckets = useMemo(() => {
    if (!dailyArr.length) return Array.from({length:12}, (_,i)=>({label:`W${i+1}`, pnl:0}));
    // group dailyArr into 12 buckets chronologically
    const buckets = Array.from({length:12}, (_,i)=> ({label:`W${i+1}`, pnl:0}));
    dailyArr.forEach((d, idx) => {
      const b = Math.min(11, Math.floor((idx / Math.max(1, dailyArr.length)) * 12));
      buckets[b].pnl += d.pnl;
    });
    return buckets;
  }, [dailyArr]);

  const histBuckets = useMemo(() => {
    const vals = dailyArr.map(d=>d.pnl);
    if (!vals.length) return [];
    const min=Math.min(...vals), max=Math.max(...vals), step=(max-min)/10||1;
    return Array.from({length:10}, (_,i)=>{
      const lo=min+i*step, hi=lo+step;
      const c=vals.filter(v=>v>=lo && (i===9 ? v<=hi : v<hi)).length;
      return {lo, hi, c, neg: hi<0, pos: lo>0};
    });
  }, [dailyArr]);
  const maxHist = Math.max(...histBuckets.map(b=>b.c),1);

  if (!trades.length) {
    return (
      <div className="space-y-4">
        <div><h1 className="font-display text-xl font-bold leading-tight text-ink">Performance</h1><p className="text-xs text-mut">No trades yet — upload in Accounts</p></div>
        <div className="rounded-2xl border-2 border-dashed border-edge bg-panel p-10 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">◈</div>
          <h3 className="mt-3 text-sm font-bold text-ink">No performance data</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-mut">Upload CSVs per account to see return, best/worst day and streak.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold leading-tight text-ink">Performance</h1>
          <p className="text-xs text-mut">Synced from Accounts · {filteredTrades.length} trades in period</p>
        </div>
        <div className="flex bg-panel2 rounded-xl p-1">
          {(["week","month","quarter","year","all"] as const).map(p=>(
            <button key={p} onClick={()=>setPeriod(p)} className={cn("px-3 py-1.5 rounded-lg text-xs font-bold", period===p?"bg-brand text-white":"text-mut hover:text-ink")}>
              {p==="week"?"7D":p==="month"?"30D":p==="quarter"?"90D":p==="year"?"1Y":"All"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        {[
          {label:"Starting Bal", value:fmtMoney(10000), pos:true},
          {label:"Current Bal", value:fmtMoney(10000+k.net), pos:k.net>=0},
          {label:"Net Profit", value:fmtMoney(k.net,{sign:true}), pos:k.net>=0},
          {label:"Return", value:((k.net/10000)*100).toFixed(1)+"%", pos:k.net>=0},
          {label:"Best Day", value:fmtMoney(bestDay.pnl,{sign:true}), pos:bestDay.pnl>=0},
          {label:"Worst Day", value:fmtMoney(worstDay.pnl), pos:false},
          {label:"Streak", value:`${currentStreak}d${currentStreak>0?" 🔥":""}`, pos:true},
        ].map(m=>(
          <div key={m.label} className="group relative overflow-hidden rounded-xl border border-edge bg-panel p-3 hover:border-brand/30 hover:shadow-md">
            <p className="text-[9px] font-bold uppercase tracking-wider text-mut">{m.label}</p>
            <p className="mt-1 truncate font-display text-base font-bold leading-tight tnum" style={{color:m.pos?"var(--gain)":"var(--loss)"}}>{m.value}</p>
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 opacity-40 group-hover:opacity-70">
              <MiniSpark daily={daily} color={m.pos?"gain":"loss"} />
            </div>
          </div>
        ))}
      </div>

      {/* hover detail — now inline, not fixed, so it never whites out on scroll */}
      {hoverDate && hoverData && (
        <div className="rounded-xl border border-brand/20 bg-brand-soft px-3 py-2.5 flex flex-wrap items-center gap-3 text-xs">
          <span className="font-bold text-ink">{hoverDate}</span>
          <span className="font-bold" style={{color: hoverData.pnl>=0?"var(--gain)":"var(--loss)"}}>{hoverData.pnl>=0?"+":""}{fmtMoney(hoverData.pnl)}</span>
          <span className="text-mut">{hoverData.count} trades · {hoverData.wins}W</span>
          <button onClick={()=>setHoverDate(null)} className="ml-auto text-[11px] font-bold text-brand hover:underline">Clear</button>
        </div>
      )}

      <div className="space-y-6">
        <Card className="overflow-hidden">
          <CardHead title="Cumulative Returns" info="Equity curve — synced accounts" />
          <div className="h-[300px] px-2 pb-2">
            <CumReturnsChart dailyArr={dailyArr} />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <CardHead title="Daily P&L Distribution" info="Green wins, red losses" />
          <div className="h-[260px] px-3 pt-2 flex items-end gap-1">
            {histBuckets.map((b,i)=>(
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t transition-all hover:opacity-80" style={{height:`${Math.max(8,(b.c/maxHist)*100)}%`, minHeight:8, background: b.neg?"var(--loss)":b.pos?"var(--gain)":"var(--brand)", opacity:0.6+(b.c/maxHist)*0.4}} />
                <span className="text-[8px] font-bold text-faint">{b.c}</span>
              </div>
            ))}
          </div>
          <p className="pb-3 text-center text-[10px] text-faint">each bar = P&L bucket · hover a KPI above to highlight a day</p>
        </Card>

        <Card>
          <CardHead title="Weekly P&L" info="12 buckets chronologically from your daily PnL" />
          <div className="h-[260px] px-2 flex items-end gap-1.5">
            {weeklyBuckets.map(b=>(
              <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t" style={{height:`${Math.max(12, Math.min(100, 50 + (b.pnl/ Math.max(1, Math.max(...weeklyBuckets.map(x=>Math.abs(x.pnl)))))*50))}%`, background: b.pnl>=0?"var(--gain)":"var(--loss)", minHeight:12}} />
                <span className="text-[9px] font-bold text-mut">{b.label}</span>
                <span className="text-[10px] font-bold tnum" style={{color: b.pnl>=0?"var(--gain)":"var(--loss)"}}>{b.pnl>=0?"+":""}{fmtMoney(b.pnl)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function MiniSpark({ daily, color }: { daily: Map<string,{pnl:number;count:number;wins:number}>; color:string }) {
  const vals=[...daily.values()].map(v=>v.pnl).slice(-12);
  if(!vals.length) return null;
  const min=Math.min(...vals), max=Math.max(...vals), span=(max-min)||1;
  const d=vals.map((v,i)=>{ const x=(i/Math.max(1,vals.length-1))*100; const y=20-((v-min)/span)*16; return `${i===0?"M":"L"} ${x.toFixed(1)} ${y.toFixed(1)}`;}).join(" ");
  return <svg viewBox="0 0 100 24" className="h-7 w-full" preserveAspectRatio="none"><path d={d} fill="none" stroke={`var(--${color})`} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity={0.9} /></svg>;
}

function CumReturnsChart({ dailyArr }: { dailyArr: {date:string;pnl:number}[] }) {
  if(!dailyArr.length) return <div className="grid h-full place-items-center text-xs text-mut">No data</div>;
  let acc=0;
  const pts=dailyArr.map(d=>{ acc+=d.pnl; return acc; });
  const min=Math.min(...pts,0), max=Math.max(...pts,0), span=(max-min)||1;
  const path=pts.map((v,i)=>{ const x=(i/Math.max(1,pts.length-1))*580+10; const y=240-((v-min)/span)*200; return `${i===0?"M":"L"} ${x.toFixed(1)} ${y.toFixed(1)}`;}).join(" ");
  const area=`M 10 240 L ${path.slice(2)} L 590 240 Z`;
  return (
    <svg viewBox="0 0 600 250" className="h-full w-full" preserveAspectRatio="none">
      <defs><linearGradient id="perfFill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--gain)" stopOpacity="0.22" /><stop offset="100%" stopColor="var(--gain)" stopOpacity="0" /></linearGradient></defs>
      <path d={area} fill="url(#perfFill2)" />
      <path d={path} fill="none" stroke="var(--gain)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
