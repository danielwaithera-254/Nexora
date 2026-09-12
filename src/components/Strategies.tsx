import { useMemo, useState } from "react";
import { Card, CardHead } from "./ui";
import { cn } from "../utils/cn";
import { fmtMoney } from "../lib/format";
import type { Trade } from "../data/trades";
import { computeKpis } from "../lib/metrics";
import { ChevronRight, ChevronDown, Target, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

interface StrategiesProps { trades: Trade[]; }
interface StrategyStats { name: string; trades: number; wins: number; losses: number; winRate: number; profitFactor: number; netPnl: number; avgR: number; bestSetup: string; worstSetup: string; }

export default function Strategies({ trades }: StrategiesProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof StrategyStats>("netPnl");
  const [sortDir, setSortDir] = useState<"asc"|"desc">("desc");

  const strategyStats: StrategyStats[] = useMemo(() => {
    if (!trades.length) return [];
    const byStrat = new Map<string, Trade[]>();
    trades.forEach(t=> { const k=t.strategy || "Unknown"; const a=byStrat.get(k) || []; a.push(t); byStrat.set(k,a); });
    const out: StrategyStats[] = [];
    byStrat.forEach((list, name)=>{
      const k=computeKpis(list);
      // best/worst by session
      const bySession = new Map<string, number>();
      list.forEach(t=> bySession.set(t.session, (bySession.get(t.session)||0)+t.pnl));
      let bestSess="—", worstSess="—", bestVal=-Infinity, worstVal=Infinity;
      bySession.forEach((pnl,sess)=>{ if(pnl>bestVal){bestVal=pnl; bestSess=sess;} if(pnl<worstVal){worstVal=pnl; worstSess=sess;} });
      out.push({ name, trades:list.length, wins:k.wins, losses:k.losses, winRate:k.winRate, profitFactor:k.pf, netPnl:k.net, avgR:k.wlRatio, bestSetup:bestSess, worstSetup:worstSess });
    });
    return out;
  }, [trades]);

  const sorted = useMemo(()=> [...strategyStats].sort((a,b)=>{
    const av=(a[sortKey] as any), bv=(b[sortKey] as any);
    return av<bv ? (sortDir==="asc"?-1:1) : av>bv ? (sortDir==="asc"?1:-1) : 0;
  }), [strategyStats, sortKey, sortDir]);

  if (!trades.length) {
    return (
      <div className="space-y-4">
        <div><h1 className="font-display text-xl font-bold text-ink">Strategies</h1><p className="text-xs text-mut">Track which setups actually work — upload CSVs in Accounts</p></div>
        <div className="rounded-2xl border-2 border-dashed border-edge bg-panel p-10 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand">◈</div>
          <h3 className="mt-3 text-sm font-bold text-ink">No strategy data yet</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-mut">Upload trade CSVs per account (with a <code>strategy</code> column) to see P&L, win rate and profit factor broken down by setup.</p>
        </div>
      </div>
    );
  }

  const totalPnl = strategyStats.reduce((s,a)=>s+a.netPnl,0);
  const totalTrades = strategyStats.reduce((s,a)=>s+a.trades,0);

  const renderRow = (s: StrategyStats) => (
    <>
      <tr key={s.name} className="cursor-pointer hover:bg-panel2/50" onClick={()=> setExpanded(expanded===s.name?null:s.name)}>
        <td className="p-2.5 text-xs font-medium text-ink">{s.name}</td>
        <td className="p-2.5 text-center text-xs text-mut tnum">{s.trades}</td>
        <td className="p-2.5 text-center text-xs tnum"><span className={cn("font-bold", s.winRate>=55?"text-gain":s.winRate>=50?"text-brand":"text-loss")}>{s.winRate.toFixed(1)}%</span></td>
        <td className="p-2.5 text-center text-xs tnum" style={{color:s.profitFactor>=1.5?"var(--gain)":s.profitFactor>=1?"var(--brand)":"var(--loss)"}}>{s.profitFactor.toFixed(2)}</td>
        <td className="p-2.5 text-right text-xs font-bold tnum" style={{color:s.netPnl>=0?"var(--gain)":"var(--loss)"}}>{s.netPnl>=0?"+":""}${s.netPnl.toLocaleString()}</td>
        <td className="p-2.5 text-center text-xs tnum">{s.avgR.toFixed(1)}R</td>
        <td className="p-2.5 text-xs text-mut truncate max-w-[110px]">{s.bestSetup}</td>
        <td className="p-2.5 text-xs text-loss truncate max-w-[110px]">{s.worstSetup}</td>
        <td className="p-2.5 text-center"><button onClick={e=>{e.stopPropagation(); setExpanded(expanded===s.name?null:s.name);}} className="text-mut hover:text-brand"><ChevronRight className={cn("h-3.5 w-3.5", expanded===s.name && "rotate-90")} /></button></td>
      </tr>
      {expanded===s.name && (
        <tr className="bg-panel2/40"><td colSpan={9} className="p-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 text-xs">
            <div className="rounded-lg bg-panel p-2.5 border border-edge"><p className="text-[10px] font-bold uppercase text-mut">Win Rate</p><p className="font-bold text-gain">{s.winRate.toFixed(1)}%</p></div>
            <div className="rounded-lg bg-panel p-2.5 border border-edge"><p className="text-[10px] font-bold uppercase text-mut">Profit Factor</p><p className="font-bold text-brand">{s.profitFactor.toFixed(2)}</p></div>
            <div className="rounded-lg bg-panel p-2.5 border border-edge"><p className="text-[10px] font-bold uppercase text-mut">Avg R:R</p><p className="font-bold text-ink">{s.avgR.toFixed(1)}R</p></div>
            <div className="rounded-lg bg-panel p-2.5 border border-edge"><p className="text-[10px] font-bold uppercase text-mut">Expectancy</p><p className="font-bold text-gain">+${(s.netPnl/s.trades).toFixed(2)}</p></div>
            <div className="rounded-lg bg-panel p-2.5 border border-edge md:col-span-2"><p className="text-[10px] font-bold uppercase text-mut">Best Session</p><p className="font-medium text-gain">{s.bestSetup}</p></div>
            <div className="rounded-lg bg-panel p-2.5 border border-edge md:col-span-2"><p className="text-[10px] font-bold uppercase text-mut">Worst Session</p><p className="font-medium text-loss">{s.worstSetup}</p></div>
          </div>
        </td></tr>
      )}
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="font-display text-xl font-bold leading-tight text-ink">Strategies</h1><p className="text-xs text-mut">Live breakdown from your Accounts CSVs — {totalTrades} trades</p></div>
        <div className="text-xs text-mut">Total P&L <span className="font-bold" style={{color: totalPnl>=0?"var(--gain)":"var(--loss)"}}>{totalPnl>=0?"+":""}${totalPnl.toLocaleString()}</span></div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          {label:"Strategies", value:strategyStats.length, icon:Target},
          {label:"Profitable", value:strategyStats.filter(s=>s.netPnl>0).length, icon:TrendingUp},
          {label:"Trades", value:totalTrades, icon:Target},
          {label:"Net P&L", value:totalPnl, pos: totalPnl>=0, icon:TrendingUp},
        ].map((m,i)=>(
          <Card key={i} className="flex items-center gap-2.5 p-3">
            <m.icon className="h-5 w-5 shrink-0 text-brand" />
            <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wider text-mut truncate">{m.label}</p><p className="truncate font-display text-base font-bold tnum" style={{color:(m as any).pos===false?"var(--loss)":(m as any).pos?"var(--gain)":"var(--ink)"}}>{typeof m.value==="number"? ( (m as any).pos ? (m.value>=0?"+":"") : "" ) + m.value.toLocaleString() : m.value}</p></div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHead title={`Strategy Breakdown · ${strategyStats.length} strategies`} info="Click a row to expand" right={
          <select className="rounded-lg border border-edge bg-panel px-2 py-1 text-xs focus:border-brand focus:outline-none" onChange={e=>{setSortKey(e.target.value as any); setSortDir("desc");}}>
            <option value="netPnl">Sort by P&L</option><option value="winRate">Win Rate</option><option value="profitFactor">Profit Factor</option><option value="trades">Trades</option><option value="avgR">Avg R</option>
          </select>
        } />
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-panel2 border-y border-edge text-[10px] uppercase font-bold tracking-wider text-mut"><tr><th className="p-2.5 text-left">Strategy</th><th className="p-2.5 text-center">Trades</th><th className="p-2.5 text-center">Win Rate</th><th className="p-2.5 text-center">PF</th><th className="p-2.5 text-right">Net P&L</th><th className="p-2.5 text-center">Avg R</th><th className="p-2.5 text-left">Best Sess.</th><th className="p-2.5 text-left">Worst Sess.</th><th className="p-2.5"></th></tr></thead>
            <tbody className="divide-y divide-edge">{sorted.map((s,i)=> renderRow(s))}</tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHead title="Insights" info="From your actual trades" />
        <div className="space-y-2 p-3">
          {(() => {
            const best=[...strategyStats].sort((a,b)=>b.netPnl-a.netPnl)[0];
            const worst=[...strategyStats].sort((a,b)=>a.netPnl-b.netPnl)[0];
            if(!best) return <p className="text-xs text-mut">Upload more trades to see insights.</p>;
            return <>
              <div className="flex gap-2 rounded-lg border border-gain/30 bg-gain-soft p-3 text-xs"><CheckCircle2 className="h-4 w-4 shrink-0 text-gain" /><div><p className="font-bold text-gain">{best.name} leads</p><p className="text-mut">{best.winRate.toFixed(1)}% WR · PF {best.profitFactor.toFixed(2)} — {best.trades} trades</p></div></div>
              {worst && worst.netPnl < best.netPnl && <div className="flex gap-2 rounded-lg border border-loss/30 bg-loss-soft p-3 text-xs"><AlertTriangle className="h-4 w-4 shrink-0 text-loss" /><div><p className="font-bold text-loss">{worst.name} lags</p><p className="text-mut">{worst.winRate.toFixed(1)}% WR · PF {worst.profitFactor.toFixed(2)} — review size</p></div></div>}
            </>;
          })()}
        </div>
      </Card>
    </div>
  );
}
