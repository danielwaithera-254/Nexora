import { useMemo, useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, Trophy, Medal, Frown } from "lucide-react";
import { Card, CardHead, Seg, SelectBox } from "./ui";
import type { Trade } from "../data/trades";
import { computeKpis } from "../lib/metrics";
import { loadReviews } from "../lib/tradetools";
import { cn } from "../utils/cn";

interface Row {
  key: string;
  count: number;
  wins: number;
  pnl: number;
}

type GroupBy = "symbol" | "session" | "strategy" | "account" | "weekday" | "side" | "r" | "hour";

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function group(list: Trade[], by: GroupBy): Row[] {
  const m = new Map<string, Row>();
  for (const t of list) {
    let k = "";
    if (by === "symbol") k = t.symbol;
    else if (by === "session") k = t.session;
    else if (by === "strategy") k = t.strategy;
    else if (by === "account") k = t.account;
    else if (by === "weekday") k = WD[(new Date(t.ts).getDay() + 6) % 7];
    else if (by === "side") k = t.side;
    else if (by === "r") k = t.r >= 2 ? "2R+" : t.r >= 1 ? "1–2R" : t.r > 0 ? "0–1R" : t.r >= -1 ? "−1–0R" : "−1R";
    else if (by === "hour") k = `${new Date(t.ts).getHours()}:00`;
    const e = m.get(k) ?? { key: k, count: 0, wins: 0, pnl: 0 };
    e.count++;
    e.pnl += t.pnl;
    if (t.pnl > 0) e.wins++;
    m.set(k, e);
  }
  return [...m.values()].sort((a, b) => b.pnl - a.pnl);
}

function StatTable({ rows, title }: { rows: Row[]; title: string }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.pnl)));
  return (
    <Card>
      <CardHead title={title} icon={<BarChart3 size={14} />} />
      <div className="space-y-1 px-4 pb-4 sm:px-5">
        {rows.length === 0 && <p className="py-6 text-center text-[11px] font-bold text-faint">No data</p>}
        {rows.map((r) => {
          const wr = r.count ? (r.wins / r.count) * 100 : 0;
          return (
            <div key={r.key} className="rounded-xl border border-edge bg-panel2 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-[11px] font-extrabold text-ink">{r.key}</span>
                <div className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-edge">
                  <div
                    className={cn("h-full rounded-full", r.pnl >= 0 ? "bg-gain" : "bg-loss")}
                    style={{ width: `${(Math.abs(r.pnl) / max) * 100}%`, marginLeft: r.pnl < 0 ? "auto" : undefined }}
                  />
                </div>
                <span className="tnum w-14 shrink-0 text-right text-[10px] font-bold text-faint">{r.count} tr</span>
                <span className={cn("tnum w-20 shrink-0 text-right font-display text-[12px] font-bold", r.pnl >= 0 ? "text-gain" : "text-loss")}>
                  {r.pnl >= 0 ? "+" : "-"}${Math.abs(r.pnl).toLocaleString()}
                </span>
              </div>
              <div className="mt-1 pl-0 text-[9px] font-bold text-faint">
                Win rate {wr.toFixed(0)}%
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function Reports({ trades }: { trades: Trade[] }) {
  const [dim, setDim] = useState<GroupBy>("symbol");
  const [cross, setCross] = useState<"session" | "symbol">("session");

  const k = useMemo(() => computeKpis(trades), [trades]);
  const rows = useMemo(() => group(trades, dim), [trades, dim]);

  /* cross analysis: strategy × session / symbol × session combos with ≥2 trades */
  const combos = useMemo(() => {
    const m = new Map<string, { key: string; count: number; wins: number; pnl: number }>();
    for (const t of trades) {
      const key = cross === "session" ? `${t.strategy} · ${t.session}` : `${t.strategy} · ${t.symbol}`;
      const e = m.get(key) ?? { key, count: 0, wins: 0, pnl: 0 };
      e.count++;
      e.pnl += t.pnl;
      if (t.pnl > 0) e.wins++;
      m.set(key, e);
    }
    return [...m.values()].filter((r) => r.count >= 2).sort((a, b) => b.pnl / b.count - a.pnl / a.count).slice(0, 6);
  }, [trades, cross]);

  const maxDD = useMemo(() => {
    let bal = 0;
    let peak = 0;
    let dd = 0;
    for (const t of [...trades].sort((a, b) => a.ts - b.ts)) {
      bal += t.pnl;
      peak = Math.max(peak, bal);
      dd = Math.min(dd, bal - peak);
    }
    return dd;
  }, [trades]);

  const summarize = (list: Trade[]) => {
    const dims = ["session", "strategy", "side"] as const;
    const m = new Map<string, { r: number; pnl: number }>();
    for (const dim of dims) {
      const seen = new Map<string, { r: number; pnl: number }>();
      for (const t of list) {
        const e = seen.get(t[dim]) ?? { r: 0, pnl: 0 };
        e.r += t.r;
        e.pnl += t.pnl;
        seen.set(t[dim], e);
      }
      for (const [key, e] of seen) m.set(key, e);
    }
    return [...m.entries()].map(([key, e]) => ({ key, ...e })).sort((a, b) => b.r - a.r);
  };

  const tagSummary = (list: Trade[]) => {
    const reviews = loadReviews();
    const m = new Map<string, { r: number; pnl: number }>();
    for (const t of list) {
      const rev = reviews[t.id];
      if (!rev?.mistakeTags?.length) continue;
      for (const tag of rev.mistakeTags) {
        const e = m.get(tag) ?? { r: 0, pnl: 0 };
        e.r += t.r;
        e.pnl += t.pnl;
        m.set(tag, e);
      }
    }
    return [...m.entries()].map(([key, e]) => ({ key, ...e })).sort((a, b) => a.r - b.r);
  };

  const conds = useMemo(() => summarize(trades), [trades]);
  const bestConds = conds.filter((c) => c.pnl > 0).slice(0, 3);
  const weakConds = useMemo(
    () =>
      [...summarize(trades), ...tagSummary(trades)]
        .filter((c) => c.pnl < 0)
        .sort((a, b) => a.r - b.r)
        .slice(0, 3),
    [trades]
  );

  const [market, setMarket] = useState("All");
  const markets = useMemo(() => [...new Set(trades.map((t) => t.symbol))].sort(), [trades]);
  const mktTrades = useMemo(
    () => (market === "All" ? trades : trades.filter((t) => t.symbol === market)),
    [trades, market]
  );
  const mk = useMemo(() => computeKpis(mktTrades), [mktTrades]);
  const mktRs = useMemo(() => {
    let wr = 0;
    let lr = 0;
    let wins = 0;
    let losses = 0;
    for (const t of mktTrades) {
      if (t.pnl > 0) {
        wr += t.r;
        wins++;
      } else {
        lr += t.r;
        losses++;
      }
    }
    return { avgWinR: wins ? wr / wins : 0, avgLossR: losses ? lr / losses : 0 };
  }, [mktTrades]);
  const mktConds = useMemo(() => summarize(mktTrades), [mktTrades]);
  const mktBest = mktConds.filter((c) => c.pnl > 0).slice(0, 3);
  const mktWeak = useMemo(
    () =>
      [...summarize(mktTrades), ...tagSummary(mktTrades)]
        .filter((c) => c.pnl < 0)
        .sort((a, b) => a.r - b.r)
        .slice(0, 3),
    [mktTrades]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHead
          title="Reports"
          info="Deeper analytics: profitability, risk, drawdown and cross-analysis to find where your edge actually lives."
          icon={<BarChart3 size={14} />}
        />
        <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-4 sm:px-5 lg:grid-cols-7">
          <Kpi label="Net P&L" v={fmt(k.net)} tone={k.net >= 0 ? "gain" : "loss"} />
          <Kpi label="Win Rate" v={`${k.winRate.toFixed(1)}%`} />
          <Kpi label="Profit Factor" v={k.pf.toFixed(2)} tone={k.pf >= 1.5 ? "gain" : "loss"} />
          <Kpi label="Expectancy" v={fmt(k.expectancy)} tone={k.expectancy >= 0 ? "gain" : "loss"} />
          <Kpi label="Avg Win" v={fmt(k.avgWin)} tone="gain" />
          <Kpi label="Avg Loss" v={fmt(-k.avgLoss)} tone="loss" />
          <Kpi label="Max Drawdown" v={fmt(maxDD)} tone={maxDD < 0 ? "loss" : undefined} />
        </div>
      </Card>

      {/* best & worst */}
      <Card>
        <CardHead
          title="Best & Worst"
          info="Where your edge is strongest — and the habits quietly costing you money."
          icon={<Trophy size={14} />}
        />
        <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-2 sm:px-5">
          <div className="rounded-xl border border-edge bg-panel2 p-3">
            <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wider text-faint">
              <Medal size={11} className="text-gain" /> Best conditions
            </p>
            <ul className="mt-2 space-y-1.5">
              {bestConds.length === 0 && (
                <li className="text-[10.5px] font-bold text-faint">Not enough profitable conditions yet — keep journaling.</li>
              )}
              {bestConds.map((c) => (
                <li key={c.key} className="flex items-center justify-between text-[11.5px] font-bold">
                  <span className="truncate text-ink">{c.key}</span>
                  <span className="tnum text-gain">{fmt(c.pnl)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-edge bg-panel2 p-3">
            <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wider text-faint">
              <Frown size={11} className="text-loss" /> Weakest behavior
            </p>
            <ul className="mt-2 space-y-1.5">
              {weakConds.length === 0 && (
                <li className="text-[10.5px] font-bold text-faint">No recurring negative patterns — clean slate.</li>
              )}
              {weakConds.map((c) => (
                <li key={c.key} className="flex items-center justify-between text-[11.5px] font-bold">
                  <span className="truncate text-ink">{c.key}</span>
                  <span className="tnum text-loss">{fmt(c.pnl)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-mut">Performance by</span>
        <Seg
          options={[
            { key: "symbol", label: "Symbol" },
            { key: "session", label: "Session" },
            { key: "strategy", label: "Strategy" },
            { key: "account", label: "Account" },
            { key: "weekday", label: "Day" },
            { key: "side", label: "Side" },
            { key: "r", label: "R-multiple" },
            { key: "hour", label: "Hour" },
          ]}
          value={dim}
          onChange={setDim}
        />
      </div>

      <StatTable rows={rows} title={`By ${dim}`} />

      {/* cross analysis */}
      <Card>
        <CardHead
          title="Cross Analysis"
          info="Best-performing combinations — the cells where your edge concentrates. Combos need at least 2 trades."
          icon={<Trophy size={14} />}
          right={
            <Seg
              options={[
                { key: "session", label: "Strategy × Session" },
                { key: "symbol", label: "Strategy × Symbol" },
              ]}
              value={cross}
              onChange={setCross}
            />
          }
        />
        <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
          {combos.length === 0 && (
            <p className="py-8 text-center text-[11px] font-bold text-faint sm:col-span-2 lg:col-span-3">
              Not enough data — check more trades against strategies or trade more within the same combo.
            </p>
          )}
          {combos.map((c) => {
            const exp = c.pnl / c.count;
            return (
              <div key={c.key} className="rounded-xl border border-edge bg-panel2 p-3">
                <p className="truncate text-[11.5px] font-extrabold text-ink">{c.key}</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] font-bold text-faint">
                  {c.count} trades · {((c.wins / c.count) * 100).toFixed(0)}% win
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className={cn("tnum font-display text-[13px] font-bold", exp >= 0 ? "text-gain" : "text-loss")}>
                    {fmt(exp)} / trade
                  </span>
                  {exp >= 0 ? (
                    <TrendingUp size={12} className="text-gain" />
                  ) : (
                    <TrendingDown size={12} className="text-loss" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* market analyzer */}
      <Card>
        <CardHead
          title={market === "All" ? "Market Analyzer" : `${market} Analysis`}
          info="Pick a market to dissect its conditions — sessions, strategies and sides that print R, and the habits that bleed it."
          icon={<BarChart3 size={14} />}
          right={
            <SelectBox
              value={market}
              onChange={setMarket}
              options={[{ value: "All", label: "All markets" }, ...markets.map((s) => ({ value: s, label: s }))]}
            />
          }
        />
        <div className="grid grid-cols-2 gap-2 px-4 pb-2 sm:grid-cols-5 sm:px-5">
          <Kpi label="Trades" v={`${mktTrades.length}`} />
          <Kpi label="Win Rate" v={`${mk.winRate.toFixed(1)}%`} />
          <Kpi label="Profit Factor" v={mk.pf.toFixed(2)} tone={mk.pf >= 1.5 ? "gain" : "loss"} />
          <Kpi label="Avg Win (R)" v={`+${mktRs.avgWinR.toFixed(2)}R`} tone="gain" />
          <Kpi label="Avg Loss (R)" v={`${mktRs.avgLossR.toFixed(2)}R`} tone="loss" />
        </div>
        <div className="grid grid-cols-1 gap-2 px-4 pb-4 sm:grid-cols-2 sm:px-5">
          <div className="rounded-xl border border-edge bg-panel2 p-3">
            <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wider text-faint">
              <Medal size={11} className="text-gain" /> Best conditions
            </p>
            <ul className="mt-2 space-y-1.5">
              {mktBest.length === 0 && (
                <li className="text-[10.5px] font-bold text-faint">No positive conditions here yet.</li>
              )}
              {mktBest.map((c) => (
                <li key={c.key} className="flex items-center justify-between text-[11.5px] font-bold">
                  <span className="truncate text-ink">{c.key}</span>
                  <span className="tnum text-gain">{fmt(c.pnl)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-edge bg-panel2 p-3">
            <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wider text-faint">
              <Frown size={11} className="text-loss" /> Weak conditions
            </p>
            <ul className="mt-2 space-y-1.5">
              {mktWeak.length === 0 && (
                <li className="text-[10.5px] font-bold text-faint">Nothing dragging this market down.</li>
              )}
              {mktWeak.map((c) => (
                <li key={c.key} className="flex items-center justify-between text-[11.5px] font-bold">
                  <span className="truncate text-ink">{c.key}</span>
                  <span className="tnum text-loss">{fmt(c.pnl)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Kpi({ label, v, tone }: { label: string; v: string; tone?: "gain" | "loss" }) {
  return (
    <div className="rounded-xl border border-edge bg-panel2 px-3 py-2">
      <p className="text-[8.5px] font-extrabold uppercase tracking-wider text-faint">{label}</p>
      <p className={cn("mt-0.5 truncate font-display text-[13px] font-bold tnum", tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : "text-ink")}>
        {v}
      </p>
    </div>
  );
}

const fmt = (v: number) => `${v >= 0 ? "+" : "-"}$${Math.abs(Math.round(v)).toLocaleString()}`;
