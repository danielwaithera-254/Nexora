import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Card, CardHead, ChartTip } from "./ui";
import { cn } from "../utils/cn";
import { fmtCompact, fmtMoney } from "../lib/format";
import type { Trade } from "../data/trades";
import { computeKpis } from "../lib/metrics";

export default function Reports({ trades }: { trades: Trade[] }) {
  const [window, setWindow] = useState<10 | 20 | 50>(20);

  const sorted = useMemo(() => [...trades].sort((a, b) => a.ts - b.ts), [trades]);

  // rolling win rate + rolling avg P&L over last N trades
  const rolling = useMemo(() => {
    if (sorted.length < 2) return [];
    return sorted.map((_, i) => {
      const slice = sorted.slice(Math.max(0, i - window + 1), i + 1);
      const wins = slice.filter((t) => t.pnl > 0).length;
      const avg = slice.reduce((s, t) => s + t.pnl, 0) / slice.length;
      return { i, wr: (wins / slice.length) * 100, avg };
    });
  }, [sorted, window]);

  // comparison groups: first half vs second half
  const groups = useMemo(() => {
    if (sorted.length < 4) return null;
    const mid = Math.floor(sorted.length / 2);
    const a = sorted.slice(0, mid), b = sorted.slice(mid);
    return [
      { label: `First ${a.length}`, kpis: computeKpis(a) },
      { label: `Last ${b.length}`, kpis: computeKpis(b) },
    ];
  }, [sorted]);

  // cross-analysis: strategy x session net P&L
  const cross = useMemo(() => {
    const strats = [...new Set(sorted.map((t) => t.strategy || "Unknown"))].slice(0, 6);
    const sessions = [...new Set(sorted.map((t) => t.session || "Unknown"))].slice(0, 4);
    const cell = (s: string, sess: string) =>
      sorted.filter((t) => (t.strategy || "Unknown") === s && (t.session || "Unknown") === sess)
        .reduce((sum, t) => sum + t.pnl, 0);
    const max = Math.max(1, ...strats.flatMap((s) => sessions.map((sess) => Math.abs(cell(s, sess)))));
    return { strats, sessions, cell, max };
  }, [sorted]);

  const largest = useMemo(() => {
    if (!sorted.length) return null;
    const win = [...sorted].sort((a, b) => b.pnl - a.pnl)[0];
    const loss = [...sorted].sort((a, b) => a.pnl - b.pnl)[0];
    return { win, loss };
  }, [sorted]);

  if (!trades.length) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-xl font-bold leading-tight text-ink">Reports</h1>
          <p className="text-xs text-mut">Rolling trends, trade explorer and cross-analysis</p>
        </div>
        <div className="rounded-2xl border-2 border-dashed border-edge bg-panel p-10 text-center">
          <h3 className="text-sm font-bold text-ink">No report data yet</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-mut">Upload CSVs in Accounts — reports compare your recent rolling form against full history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold leading-tight text-ink">Reports</h1>
          <p className="text-xs text-mut">{sorted.length} trades · rolling window vs full history</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-panel2 p-1">
          {([10, 20, 50] as const).map((w) => (
            <button key={w} onClick={() => setWindow(w)} className={cn("rounded-lg px-3 py-1.5 text-xs font-bold", window === w ? "bg-brand text-white shadow" : "text-mut hover:text-ink")}>
              {w}T
            </button>
          ))}
        </div>
      </div>

      {/* rolling trends */}
      <div className="h-[340px]">
        <Card className="flex h-full flex-col p-4">
          <h3 className="text-sm font-bold text-ink">Rolling performance <span className="font-medium text-faint">({window}-trade window)</span></h3>
          <p className="text-[11px] text-faint">Purple = rolling win rate · green/red = rolling avg P&L per trade</p>
          <div className="mt-2 min-h-0 flex-1"><RollingChart data={rolling} /></div>
          {largest && (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-lg bg-gain-soft px-2 py-1 font-bold text-gain">Largest win {fmtMoney(largest.win.pnl, { sign: true })} · {largest.win.symbol}</span>
              <span className="rounded-lg bg-loss-soft px-2 py-1 font-bold text-loss">Largest loss {fmtMoney(largest.loss.pnl)} · {largest.loss.symbol}</span>
            </div>
          )}
        </Card>
      </div>

      {/* trade explorer */}
      <div className="h-[360px]">
        <Card className="flex h-full flex-col p-4">
          <h3 className="text-sm font-bold text-ink">Trade explorer</h3>
          <p className="text-[11px] text-faint">Each dot is a trade — x: sequence, y: R multiple, size: |P&L| · hover for detail</p>
          <div className="mt-2 min-h-0 flex-1"><ExplorerScatter trades={sorted} /></div>
        </Card>
      </div>

      {/* comparison + cross-analysis */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <CardHead title="First half vs second half" info="Is your trading improving over time?" />
          {!groups ? <p className="py-6 text-center text-xs text-mut">Need at least 4 trades to compare.</p> : (
            <div className="grid grid-cols-2 gap-3">
              {groups.map((g, gi) => {
                const other = groups[1 - gi].kpis;
                const dNet = g.kpis.net - other.net;
                const dWr = g.kpis.winRate - other.winRate;
                return (
                  <div key={g.label} className={cn("rounded-xl border p-3", gi === 1 ? "border-brand/40 bg-brand-soft/40" : "border-edge bg-panel2")}>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-mut">{g.label} trades</p>
                      {gi === 1 && (
                        <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold", dNet >= 0 ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss")}>
                          {dNet >= 0 ? "▲ +" : "▼ "}{fmtMoney(dNet)} vs first
                        </span>
                      )}
                    </div>
                    <p className={cn("mt-1 font-display text-lg font-bold tnum", g.kpis.net >= 0 ? "text-gain" : "text-loss")}>{fmtMoney(g.kpis.net, { sign: true })}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-edge2">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand to-gain" style={{ width: `${Math.min(100, g.kpis.winRate)}%` }} />
                    </div>
                    <div className="mt-2 space-y-1 text-[11px] text-mut">
                      <div className="flex justify-between"><span>Win rate</span><b className="text-ink tnum">{g.kpis.winRate.toFixed(1)}%{gi === 1 && <span className={dWr >= 0 ? "text-gain" : "text-loss"}> ({dWr >= 0 ? "+" : ""}{dWr.toFixed(1)})</span>}</b></div>
                      <div className="flex justify-between"><span>Profit factor</span><b className="text-ink tnum">{g.kpis.pf.toFixed(2)}</b></div>
                      <div className="flex justify-between"><span>Expectancy</span><b className="text-ink tnum">{fmtMoney(g.kpis.expectancy, { sign: true })}</b></div>
                      <div className="flex justify-between"><span>Avg R</span><b className="text-ink tnum">{g.kpis.wlRatio.toFixed(2)}×</b></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-4">
          <CardHead title="Strategy × Session matrix" info="Net P&L at each intersection — find where an edge holds" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-xs">
              <thead>
                <tr>
                  <th className="p-2 text-left text-[10px] uppercase text-faint">Strategy</th>
                  {cross.sessions.map((s) => <th key={s} className="p-2 text-right text-[10px] uppercase text-faint">{s.slice(0, 6)}</th>)}
                </tr>
              </thead>
              <tbody>
                {cross.strats.map((s) => (
                  <tr key={s} className="border-t border-edge">
                    <td className="p-2 font-bold text-ink">{s}</td>
                    {cross.sessions.map((sess) => {
                      const v = cross.cell(s, sess);
                      const has = sorted.some((t) => (t.strategy || "Unknown") === s && (t.session || "Unknown") === sess);
                      if (!has) return <td key={sess} className="p-2 text-center text-faint">—</td>;
                      const alpha = 12 + Math.min(88, (Math.abs(v) / cross.max) * 88);
                      return (
                        <td key={sess} className="p-2 text-right">
                          <span className="inline-block rounded-md px-1.5 py-0.5 font-bold tnum"
                            style={{ background: v >= 0 ? `color-mix(in srgb, var(--gain) ${alpha}%, transparent)` : `color-mix(in srgb, var(--loss) ${alpha}%, transparent)`, color: v >= 0 ? "var(--gain)" : "var(--loss)" }}>
                            {v >= 0 ? "+" : ""}{v}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!cross.strats.length && <p className="py-6 text-center text-xs text-mut">No data.</p>}
        </Card>
      </div>
    </div>
  );
}

function RollingChart({ data }: { data: { i: number; wr: number; avg: number }[] }) {
  if (data.length < 2) return <div className="grid h-full place-items-center text-xs text-mut">Need at least 2 trades.</div>;
  const last = data[data.length - 1];
  return (
    <div className="relative h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 8, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id="rollAvgFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--gain)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--gain)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--edge2)" vertical={false} />
          <XAxis
            dataKey="i"
            tickFormatter={(v) => `#${Number(v) + 1}`}
            tick={{ fontSize: 9.5, fill: "var(--faint)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            yAxisId="avg"
            tickFormatter={(v) => fmtCompact(v)}
            tick={{ fontSize: 9.5, fill: "var(--faint)" }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <YAxis
            yAxisId="wr"
            orientation="right"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 9.5, fill: "var(--faint)" }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            content={<ChartTip fmt={(v: number) => (typeof v === "number" && v <= 100 ? `${v.toFixed(0)}%` : fmtMoney(v, { sign: true }))} />}
            labelFormatter={(l) => `Trade #${Number(l) + 1}`}
            cursor={{ stroke: "var(--faint)", strokeDasharray: "3 3" }}
          />
          <Line
            yAxisId="avg"
            type="monotone"
            dataKey="avg"
            name="Avg P&L"
            stroke="var(--gain)"
            strokeWidth={2.2}
            fill="url(#rollAvgFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            animationDuration={800}
          />
          <Line
            yAxisId="wr"
            type="monotone"
            dataKey="wr"
            name="Win rate"
            stroke="var(--brand)"
            strokeWidth={2.2}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            animationDuration={800}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute right-1 top-1 flex gap-1.5 text-[10px] font-bold">
        <span className="rounded-md bg-gain-soft px-1.5 py-0.5 text-gain">avg {last.avg >= 0 ? "+" : ""}{Math.round(last.avg)}</span>
        <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-brand">{last.wr.toFixed(0)}% WR</span>
      </div>
    </div>
  );
}

function ExplorerScatter({ trades }: { trades: Trade[] }) {
  const points = trades.map((t, i) => ({
    x: i + 1,
    r: Math.round(t.r * 100) / 100,
    size: Math.abs(t.pnl),
    date: t.date,
    symbol: t.symbol,
    side: t.side,
    pnl: t.pnl,
  }));
  const wins = trades.filter((t) => t.pnl > 0).length;
  return (
    <div className="relative h-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 12, right: 8, left: -14, bottom: 0 }}>
          <CartesianGrid stroke="var(--edge2)" />
          <XAxis
            type="number"
            dataKey="x"
            name="Trade"
            tick={{ fontSize: 9.5, fill: "var(--faint)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `#${v}`}
          />
          <YAxis
            type="number"
            dataKey="r"
            name="R"
            tickFormatter={(v) => `${v}R`}
            tick={{ fontSize: 9.5, fill: "var(--faint)" }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <ZAxis type="number" dataKey="size" range={[24, 160]} />
          <Tooltip
            cursor={{ stroke: "var(--faint)", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const p = payload?.[0]?.payload;
              if (!active || !p) return null;
              return (
                <div className="rounded-xl border border-edge bg-panel/95 px-3 py-2 text-xs shadow-[var(--shadow-lg)] backdrop-blur-md">
                  <div className="font-display text-[11.5px] font-bold text-ink">{p.date} · {p.symbol} {p.side}</div>
                  <div className="mt-1 flex items-center gap-2 tnum">
                    <span className="text-[11px] text-mut">{Number(p.r).toFixed(1)}R</span>
                    <span className="text-[11.5px] font-bold" style={{ color: p.pnl >= 0 ? "var(--gain)" : "var(--loss)" }}>
                      {fmtMoney(p.pnl, { sign: true })}
                    </span>
                  </div>
                </div>
              );
            }}
          />
          <Scatter data={points} name="Trades" animationDuration={800}>
            {points.map((p, i) => (
              <Cell key={i} fill={p.pnl > 0 ? "var(--gain)" : p.pnl < 0 ? "var(--loss)" : "var(--faint)"} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute left-1 top-1 flex gap-1.5 text-[10px] font-bold">
        <span className="rounded-md bg-gain-soft px-1.5 py-0.5 text-gain">{wins}W</span>
        <span className="rounded-md bg-loss-soft px-1.5 py-0.5 text-loss">{trades.length - wins}L</span>
      </div>
    </div>
  );
}
