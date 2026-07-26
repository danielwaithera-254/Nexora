import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarDays, Activity, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardHead, Seg } from "./ui";
import type { Trade } from "../data/trades";
import { computeKpis, withRisk, type Kpis } from "../lib/metrics";
import { fmtDate, fmtDateShort, fmtMoney, fmtPct } from "../lib/format";
import { cn } from "../utils/cn";

interface DayBlock {
  date: string;
  list: Trade[];
  k: Kpis;
}

const pf = (v: number) => (!isFinite(v) ? "—" : v >= 99 ? "99+" : v.toFixed(2));

export default function DailyJournal({ trades }: { trades: Trade[] }) {
  const days: DayBlock[] = useMemo(() => {
    const m = new Map<string, Trade[]>();
    for (const t of trades) {
      const arr = m.get(t.date) ?? [];
      arr.push(t);
      m.set(t.date, arr);
    }
    return [...m.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, list]) => ({ date, list, k: withRisk(computeKpis(list), list) }));
  }, [trades]);

  const [span, setSpan] = useState<"7" | "30" | "all">("30");
  const visible = useMemo(
    () => (span === "all" ? days : days.slice(0, span === "7" ? 7 : 30)),
    [days, span]
  );

  const [selected, setSelected] = useState(days[0]?.date ?? "");
  // keep selection valid when filters upstream change the available days
  useEffect(() => {
    if (!days.some((d) => d.date === selected)) setSelected(days[0]?.date ?? "");
  }, [days, selected]);

  const idx = visible.findIndex((d) => d.date === selected);
  const day = idx >= 0 ? visible[idx] : (visible[0] ?? null);

  const period = useMemo(() => {
    const net = visible.reduce((s, d) => s + d.k.net, 0);
    const count = visible.reduce((s, d) => s + d.k.count, 0);
    const green = visible.filter((d) => d.k.net > 0).length;
    return {
      net,
      count,
      green,
      red: visible.length - green,
      avg: visible.length ? net / visible.length : 0,
      dayWinRate: visible.length ? (green / visible.length) * 100 : 0,
    };
  }, [visible]);

  /* per-trade running total for the selected day */
  const dayCurve = useMemo(() => {
    if (!day) return [];
    let acc = 0;
    return day.list.map((t, i) => {
      acc += t.pnl;
      return { i: `#${i + 1}`, symbol: t.symbol, side: t.side, pnl: t.pnl, r: t.r, cum: acc };
    });
  }, [day]);

  return (
    <div className="space-y-4">
      {/* period overview */}
      <Card>
        <CardHead
          title="Daily Journal"
          info="Review your book one session at a time. Every day with activity gets its own scorecard."
          icon={<CalendarDays size={14} />}
          right={
            <Seg
              options={[
                { key: "7", label: "7 days" },
                { key: "30", label: "30 days" },
                { key: "all", label: "All" },
              ]}
              value={span}
              onChange={(v) => setSpan(v as typeof span)}
            />
          }
        />
        <div className="grid grid-cols-2 gap-4 border-t border-edge2 px-5 py-4 lg:grid-cols-5">
          <Stat label="Period net" value={fmtMoney(period.net, { sign: true })} tone={period.net >= 0 ? "gain" : "loss"} />
          <Stat label="Avg / day" value={fmtMoney(period.avg, { sign: true })} tone={period.avg >= 0 ? "gain" : "loss"} />
          <Stat label="Green days" value={`${period.green} of ${visible.length}`} tone="gain" />
          <Stat label="Day win rate" value={fmtPct(period.dayWinRate, 0)} tone="brand" />
          <Stat label="Executions" value={String(period.count)} tone="ink" />
        </div>

        {/* day selector rail */}
        <div className="flex items-center gap-2 border-t border-edge2 px-3 py-3">
          <button
            onClick={() => idx < visible.length - 1 && setSelected(visible[idx + 1].date)}
            disabled={idx >= visible.length - 1}
            className="shrink-0 rounded-lg border border-edge bg-panel2 p-1.5 text-mut transition-colors hover:text-ink disabled:opacity-30"
            aria-label="Older day"
          >
            <ChevronLeft size={14} />
          </button>

          <div className="flex flex-1 gap-2 overflow-x-auto px-1 py-1">
            {visible.map((d) => {
              const on = d.date === day?.date;
              return (
                <button
                  key={d.date}
                  onClick={() => setSelected(d.date)}
                  className={cn(
                    "relative w-[112px] shrink-0 rounded-xl border p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5",
                    on
                      ? "border-brand bg-brand-soft shadow-md"
                      : "border-edge2 bg-panel2 hover:border-faint/50"
                  )}
                >
                  <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-faint">
                    {fmtDateShort(d.date)}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block font-display text-[15px] font-bold leading-none tnum",
                      d.k.net > 0 ? "text-gain" : d.k.net < 0 ? "text-loss" : "text-mut"
                    )}
                  >
                    {fmtMoney(d.k.net, { sign: true })}
                  </span>
                  <span className="mt-1.5 block text-[9.5px] font-bold text-mut tnum">
                    {d.k.count}t · {fmtPct(d.k.winRate, 0)} W
                  </span>
                  <span
                    className={cn(
                      "absolute inset-x-2.5 bottom-1.5 h-0.5 rounded-full",
                      d.k.net > 0 ? "bg-gain" : d.k.net < 0 ? "bg-loss" : "bg-edge"
                    )}
                  />
                </button>
              );
            })}
            {visible.length === 0 && (
              <p className="px-2 py-6 text-[12px] text-mut">No trading days in this range.</p>
            )}
          </div>

          <button
            onClick={() => idx > 0 && setSelected(visible[idx - 1].date)}
            disabled={idx <= 0}
            className="shrink-0 rounded-lg border border-edge bg-panel2 p-1.5 text-mut transition-colors hover:text-ink disabled:opacity-30"
            aria-label="Newer day"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </Card>

      {day && (
        <>
          {/* selected-day KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Net P&L" value={fmtMoney(day.k.net, { sign: true })} tone={day.k.net >= 0 ? "gain" : "loss"} />
            <Kpi label="Win rate" value={fmtPct(day.k.winRate, 0)} sub={`${day.k.wins}W / ${day.k.losses}L`} tone="brand" />
            <Kpi label="Profit factor" value={pf(day.k.pf)} tone={day.k.pf >= 1.5 ? "gain" : day.k.pf >= 1 ? "brand" : "loss"} />
            <Kpi label="Best trade" value={fmtMoney(day.k.bestTrade, { sign: true })} tone="gain" />
            <Kpi label="Worst trade" value={fmtMoney(day.k.worstTrade)} tone="loss" />
            <Kpi
              label="Expectancy"
              value={fmtMoney(day.k.expectancy, { sign: true })}
              sub="per trade"
              tone={day.k.expectancy >= 0 ? "gain" : "loss"}
            />
          </div>

          {/* day charts */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="h-[280px] lg:col-span-7">
              <Card className="flex h-full flex-col">
                <CardHead
                  title={`Session curve — ${fmtDate(day.date)}`}
                  info="Running P&L across the day's executions, in the order they were closed."
                  icon={<Activity size={14} />}
                />
                <div className="min-h-0 flex-1 px-2 pb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dayCurve} margin={{ top: 12, right: 10, left: -14, bottom: 0 }}>
                      <defs>
                        <linearGradient id="dayFill" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="0%"
                            stopColor={day.k.net >= 0 ? "var(--gain)" : "var(--loss)"}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="100%"
                            stopColor={day.k.net >= 0 ? "var(--gain)" : "var(--loss)"}
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--edge2)" vertical={false} />
                      <XAxis dataKey="i" tick={{ fontSize: 9.5, fill: "var(--faint)" }} axisLine={false} tickLine={false} />
                      <YAxis
                        tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                        tick={{ fontSize: 9.5, fill: "var(--faint)" }}
                        axisLine={false}
                        tickLine={false}
                        width={50}
                      />
                      <Tooltip
                        cursor={{ stroke: "var(--faint)", strokeDasharray: "3 3" }}
                        content={({ active, payload }) => {
                          const p = payload?.[0]?.payload as (typeof dayCurve)[number] | undefined;
                          if (!active || !p) return null;
                          return (
                            <div className="rounded-lg border border-edge bg-panel/95 px-3 py-2 text-[11px] shadow-xl backdrop-blur">
                              <p className="font-display font-semibold text-ink">
                                {p.i} · {p.symbol} {p.side}
                              </p>
                              <p className="mt-0.5 text-mut">
                                Trade <b className={cn("tnum", p.pnl >= 0 ? "text-gain" : "text-loss")}>{fmtMoney(p.pnl, { sign: true })}</b>
                              </p>
                              <p className="text-mut">
                                Running <b className="tnum text-ink">{fmtMoney(p.cum, { sign: true })}</b>
                              </p>
                            </div>
                          );
                        }}
                      />
                      <ReferenceLine y={0} stroke="var(--faint)" strokeDasharray="4 4" />
                      <Area
                        type="monotone"
                        dataKey="cum"
                        stroke={day.k.net >= 0 ? "var(--gain)" : "var(--loss)"}
                        strokeWidth={2.2}
                        fill="url(#dayFill)"
                        animationDuration={700}
                        activeDot={{ r: 4, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            <div className="h-[280px] lg:col-span-5">
              <Card className="flex h-full flex-col">
                <CardHead
                  title="Trade-by-trade"
                  info="Individual result of each execution for the selected session."
                  icon={<BarChart3 size={14} />}
                />
                <div className="min-h-0 flex-1 px-2 pb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dayCurve} margin={{ top: 12, right: 10, left: -14, bottom: 0 }} barCategoryGap="22%">
                      <CartesianGrid stroke="var(--edge2)" vertical={false} />
                      <XAxis dataKey="i" tick={{ fontSize: 9.5, fill: "var(--faint)" }} axisLine={false} tickLine={false} />
                      <YAxis
                        tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                        tick={{ fontSize: 9.5, fill: "var(--faint)" }}
                        axisLine={false}
                        tickLine={false}
                        width={50}
                      />
                      <Tooltip
                        cursor={{ fill: "var(--edge2)", opacity: 0.5 }}
                        content={({ active, payload }) => {
                          const p = payload?.[0]?.payload as (typeof dayCurve)[number] | undefined;
                          if (!active || !p) return null;
                          return (
                            <div className="rounded-lg border border-edge bg-panel/95 px-3 py-2 text-[11px] shadow-xl backdrop-blur">
                              <p className="font-display font-semibold text-ink">
                                {p.symbol} {p.side}
                              </p>
                              <p className="mt-0.5 text-mut">
                                <b className={cn("tnum", p.pnl >= 0 ? "text-gain" : "text-loss")}>
                                  {fmtMoney(p.pnl, { sign: true })}
                                </b>{" "}
                                <span className="text-faint tnum">({p.r > 0 ? "+" : ""}{p.r.toFixed(1)}R)</span>
                              </p>
                            </div>
                          );
                        }}
                      />
                      <ReferenceLine y={0} stroke="var(--faint)" />
                      <Bar dataKey="pnl" radius={[5, 5, 0, 0]} animationDuration={700}>
                        {dayCurve.map((d, i) => (
                          <Cell key={i} fill={d.pnl >= 0 ? "var(--gain)" : "var(--loss)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>

          {/* day trade log */}
          <Card>
            <CardHead
              title={`Executions — ${fmtDate(day.date)}`}
              info="Every fill recorded for this session."
              right={
                <span className="rounded-md bg-panel2 px-2 py-1 text-[10px] font-bold text-mut tnum">
                  {day.k.count} trades
                </span>
              }
            />
            <div className="overflow-x-auto px-2 pb-2 sm:px-3">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr className="border-b border-edge2 text-left">
                    {["Symbol", "Side", "Strategy", "Session", "Qty"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-faint">
                        {h}
                      </th>
                    ))}
                    {["Entry → Exit", "R", "Net P&L"].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-wider text-faint"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {day.list.map((t) => (
                    <tr key={t.id} className="border-b border-edge2/60 transition-colors last:border-0 hover:bg-panel2">
                      <td className="px-3 py-2.5">
                        <span className="rounded-md bg-brand-soft px-1.5 py-0.5 font-display text-[11px] font-bold text-brand">
                          {t.symbol}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                            t.side === "Long" ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss"
                          )}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[11.5px] font-medium text-mut">{t.strategy}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-faint">{t.session}</td>
                      <td className="px-3 py-2.5 text-[11.5px] font-semibold text-mut tnum">{t.qty}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[10.5px] text-faint tnum">
                        {t.entry} → {t.exit}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2.5 text-right font-mono text-[11px] font-semibold tnum",
                          t.r > 0 ? "text-gain" : t.r < 0 ? "text-loss" : "text-mut"
                        )}
                      >
                        {t.r > 0 ? "+" : ""}
                        {t.r.toFixed(1)}R
                      </td>
                      <td
                        className={cn(
                          "px-3 py-2.5 text-right font-display text-[12px] font-bold tnum",
                          t.pnl > 0 ? "text-gain" : t.pnl < 0 ? "text-loss" : "text-mut"
                        )}
                      >
                        {fmtMoney(t.pnl, { sign: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "gain" | "loss" | "brand" | "ink" }) {
  const map = { gain: "text-gain", loss: "text-loss", brand: "text-brand", ink: "text-ink" };
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-mut">{label}</p>
      <p className={cn("mt-1 font-display text-lg font-bold tnum", map[tone])}>{value}</p>
    </div>
  );
}

function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "gain" | "loss" | "brand" | "warn" | "ink";
}) {
  const map = {
    gain: "text-gain",
    loss: "text-loss",
    brand: "text-brand",
    warn: "text-warn",
    ink: "text-ink",
  };
  return (
    <Card hover className="p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-mut">{label}</p>
      <p className={cn("mt-1.5 font-display text-xl font-bold leading-none tnum", map[tone])}>{value}</p>
      {sub && <p className="mt-1.5 text-[10px] font-medium text-faint tnum">{sub}</p>}
    </Card>
  );
}
