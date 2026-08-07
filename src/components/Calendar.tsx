import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { Card, CardHead } from "./ui";
import type { Trade } from "../data/trades";
import { fmtDate, fmtMoney, fmtPct } from "../lib/format";
import { cn } from "../utils/cn";

const iso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

interface DayRec {
  pnl: number;
  count: number;
  wins: number;
  trades: number[]; // per-trade pnl, for the mini bars
}

export default function Calendar({
  trades,
  onSelectTrade,
  showDayDetail,
}: {
  trades: Trade[];
  onSelectTrade?: (t: Trade) => void;
  showDayDetail?: boolean;
}) {
  const [view, setView] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [sel, setSel] = useState<string | null>(null);

  /* per-day aggregation with individual trade results */
  const map = useMemo(() => {
    const m = new Map<string, DayRec>();
    for (const t of trades) {
      const e = m.get(t.date) ?? { pnl: 0, count: 0, wins: 0, trades: [] };
      e.pnl += t.pnl;
      e.count++;
      if (t.pnl > 0) e.wins++;
      e.trades.push(t.pnl);
      m.set(t.date, e);
    }
    return m;
  }, [trades]);

  const monthKey = `${view.getFullYear()}-${view.getMonth()}`;

  const { weeks, stats } = useMemo(() => {
    const first = new Date(view);
    const start = new Date(first);
    start.setDate(1 - first.getDay());

    let total = 0;
    let count = 0;
    let greenDays = 0;
    let activeDays = 0;
    let maxAbs = 1;
    let tradeMaxAbs = 1;
    let best: { date: string; pnl: number } | null = null;
    let worst: { date: string; pnl: number } | null = null;
    let streak = 0;
    let maxStreak = 0;

    const inMonth = (d: Date) => d.getMonth() === view.getMonth();

    // stats pass over actual month days
    const cursor = new Date(view.getFullYear(), view.getMonth(), 1);
    const lastDay = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (let i = 0; i < lastDay; i++) {
      const rec = map.get(iso(cursor));
      if (rec) {
        total += rec.pnl;
        count += rec.count;
        activeDays++;
        maxAbs = Math.max(maxAbs, Math.abs(rec.pnl));
        for (const p of rec.trades) tradeMaxAbs = Math.max(tradeMaxAbs, Math.abs(p));
        if (rec.pnl > 0) {
          greenDays++;
          streak++;
          maxStreak = Math.max(maxStreak, streak);
        } else if (rec.pnl < 0) {
          streak = 0;
        }
        if (!best || rec.pnl > best.pnl) best = { date: iso(cursor), pnl: rec.pnl };
        if (!worst || rec.pnl < worst.pnl) worst = { date: iso(cursor), pnl: rec.pnl };
      } else {
        streak = 0;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    // build 6x7 grid
    const wks: { date: Date; inMonth: boolean }[][] = [];
    const cur = new Date(start);
    for (let w = 0; w < 6; w++) {
      const row: { date: Date; inMonth: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        row.push({ date: new Date(cur), inMonth: inMonth(cur) });
        cur.setDate(cur.getDate() + 1);
      }
      wks.push(row);
    }

    return {
      weeks: wks,
      stats: {
        total,
        count,
        greenDays,
        activeDays,
        maxAbs,
        tradeMaxAbs,
        best,
        worst,
        maxStreak,
        dayWinRate: activeDays ? (greenDays / activeDays) * 100 : 0,
      },
    };
  }, [view, map]);

  const label = view.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayIso = iso(new Date());

  return (
    <Card className="relative flex h-full flex-col">
      {/* ambient corner tint */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,var(--brand-soft),transparent_70%)] opacity-70" />

      <CardHead
        title="Trading Calendar"
        info="Daily P&L across the month with weekly totals. Hover any day for the full session breakdown."
        icon={<CalendarDays size={14} />}
        right={
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              className="rounded-lg border border-edge bg-panel2 p-1.5 text-mut transition-all hover:-translate-x-px hover:border-brand/40 hover:text-brand active:scale-90"
              aria-label="Previous month"
            >
              <ChevronLeft size={13} />
            </button>
            <span
              key={monthKey}
              className="cal-label min-w-[116px] text-center font-display text-[12.5px] font-bold text-ink"
            >
              {label}
            </span>
            <button
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              className="rounded-lg border border-edge bg-panel2 p-1.5 text-mut transition-all hover:translate-x-px hover:border-brand/40 hover:text-brand active:scale-90"
              aria-label="Next month"
            >
              <ChevronRight size={13} />
            </button>
            <button
              onClick={() => {
                const d = new Date();
                setView(new Date(d.getFullYear(), d.getMonth(), 1));
              }}
              className="ml-1 rounded-lg bg-brand-soft px-2.5 py-1 text-[10px] font-extrabold text-brand transition-all hover:bg-brand hover:text-white active:scale-95"
            >
              Today
            </button>
          </div>
        }
      />

      {/* month stat chips */}
      <div className="relative flex flex-wrap items-center gap-2 px-4 pb-3 sm:px-5">
        <Chip
          icon={stats.total >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          label="Month net"
          value={fmtMoney(stats.total, { sign: true })}
          tone={stats.total >= 0 ? "gain" : "loss"}
        />
        <Chip icon={<BarChart3 size={11} />} label="Trades" value={String(stats.count)} tone="brand" />
        <Chip
          icon={<Target size={11} />}
          label="Day win"
          value={fmtPct(stats.dayWinRate, 0)}
          tone={stats.dayWinRate >= 50 ? "gain" : "brand"}
          sub={`${stats.greenDays}/${stats.activeDays || 0} days`}
        />
        {stats.maxStreak >= 2 && (
          <Chip icon={<TrendingUp size={11} />} label="Best run" value={`${stats.maxStreak} green`} tone="gain" />
        )}

        {/* heat legend */}
        <span className="ml-auto hidden items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-faint sm:flex">
          Loss
          <span className="flex gap-[3px]">
            {[70, 45, 22, 0, 22, 45, 70].map((a, i) => (
              <span
                key={i}
                className="h-2 w-2 rounded-[3px]"
                style={{
                  background:
                    a === 0
                      ? "var(--edge2)"
                      : i < 3
                        ? `color-mix(in srgb, var(--loss) ${a}%, var(--panel))`
                        : `color-mix(in srgb, var(--gain) ${a}%, var(--panel))`,
                }}
              />
            ))}
          </span>
          Gain
        </span>
      </div>

      {/* grid */}
      <div className="relative px-4 pb-4 sm:px-5">
        <div className="overflow-x-auto pb-1 lg:overflow-visible">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-[repeat(7,1fr)_76px] gap-1.5 pb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Week"].map((d) => (
                <span
                  key={d}
                  className="text-center text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-faint"
                >
                  {d}
                </span>
              ))}
            </div>

            <div key={monthKey} className="space-y-1.5">
              {weeks.map((row, wi) => {
                const weekPnl = row.reduce(
                  (s, c) => s + (c.inMonth ? map.get(iso(c.date))?.pnl ?? 0 : 0),
                  0
                );
                const weekCount = row.reduce(
                  (s, c) => s + (c.inMonth ? map.get(iso(c.date))?.count ?? 0 : 0),
                  0
                );
                return (
                  <div key={wi} className="grid grid-cols-[repeat(7,1fr)_76px] gap-1.5">
                    {row.map((c) => {
                      const key = iso(c.date);
                      const rec = c.inMonth ? map.get(key) : undefined;
                      const isToday = key === todayIso;
                      const heat = rec ? Math.min(1, Math.abs(rec.pnl) / stats.maxAbs) : 0;
                      return (
                        <div
                          key={key}
                          onClick={showDayDetail && rec ? () => setSel(sel === key ? null : key) : undefined}
                          style={c.inMonth ? { animationDelay: `${wi * 40 + c.date.getDay() * 18}ms` } : undefined}
                          className={cn(
                            "group relative h-[76px] rounded-xl border p-1.5 transition-all duration-200 ease-out",
                            c.inMonth &&
                              (showDayDetail && rec
                                ? "cal-cell cursor-pointer hover:z-20 hover:-translate-y-1"
                                : "cal-cell cursor-default hover:z-20 hover:-translate-y-1"),
                            sel === key && "ring-2 ring-brand",
                            !c.inMonth
                              ? "border-transparent"
                              : rec && rec.pnl > 0
                                ? "border-gain/20 hover:border-gain/60"
                                : rec && rec.pnl < 0
                                  ? "border-loss/20 hover:border-loss/60"
                                  : "border-edge2 bg-panel2 hover:border-edge",
                            c.inMonth && "hover:shadow-[var(--shadow-lg)]"
                          )}
                        >
                          {/* heat fill */}
                          {rec && (
                            <span
                              className="pointer-events-none absolute inset-0 rounded-[11px] transition-opacity duration-200 group-hover:opacity-100"
                              style={{
                                opacity: 0.5 + heat * 0.5,
                                background:
                                  rec.pnl > 0
                                    ? `color-mix(in srgb, var(--gain) ${6 + heat * 18}%, var(--panel))`
                                    : rec.pnl < 0
                                      ? `color-mix(in srgb, var(--loss) ${6 + heat * 18}%, var(--panel))`
                                      : "transparent",
                              }}
                            />
                          )}
                          {isToday && (
                            <span className="today-ring pointer-events-none absolute inset-0 rounded-xl" />
                          )}

                          <div className="relative flex h-full flex-col">
                            <span
                              className={cn(
                                "flex items-center gap-1 text-[9.5px] font-bold",
                                c.inMonth ? "text-mut" : "text-faint/40"
                              )}
                            >
                              {c.date.getDate()}
                              {isToday && <span className="h-1.5 w-1.5 rounded-full bg-brand" />}
                            </span>
                            {rec && (
                              <>
                                <p
                                  className={cn(
                                    "mt-0.5 font-display text-[12px] font-bold leading-none tnum",
                                    rec.pnl > 0 ? "text-gain" : rec.pnl < 0 ? "text-loss" : "text-mut"
                                  )}
                                >
                                  {fmtMoney(rec.pnl, { sign: true })}
                                </p>

                                <p className="mt-1 text-[8px] font-semibold text-faint/80 tnum">
                                  {rec.count}t · {Math.round((rec.wins / rec.count) * 100)}%W
                                </p>

                                {/* per-trade mini bars */}
                                <div className="mt-auto flex h-[18px] items-end gap-[2px]">
                                  {rec.trades.slice(0, 8).map((p, i) => (
                                    <span
                                      key={i}
                                      className="flex-1 origin-bottom rounded-t-[2px] transition-transform duration-200 group-hover:scale-y-125"
                                      style={{
                                        height: `${20 + (Math.abs(p) / stats.tradeMaxAbs) * 80}%`,
                                        background: p >= 0 ? "var(--gain)" : "var(--loss)",
                                        opacity: 0.85,
                                      }}
                                    />
                                  ))}
                                  {rec.trades.length > 8 && (
                                    <span className="pb-[1px] text-[7.5px] font-extrabold text-faint">
                                      +{rec.trades.length - 8}
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>

                          {/* hover detail card */}
                          {rec && (
                            <div
                              className={cn(
                                "pointer-events-none absolute left-1/2 z-30 hidden w-44 -translate-x-1/2 rounded-xl border border-edge bg-panel/95 p-3 text-left shadow-[var(--shadow-lg)] backdrop-blur-md lg:group-hover:block",
                                wi === 0 ? "top-full mt-2" : "bottom-full mb-2"
                              )}
                            >
                              <p className="font-display text-[11px] font-bold text-ink">{fmtDate(key)}</p>
                              <div className="mt-2 space-y-1.5 text-[10.5px]">
                                <Row
                                  label="Net"
                                  value={fmtMoney(rec.pnl, { sign: true })}
                                  cls={rec.pnl > 0 ? "text-gain" : rec.pnl < 0 ? "text-loss" : "text-mut"}
                                />
                                <Row label="Trades" value={`${rec.count}`} cls="text-ink" />
                                <Row
                                  label="Win rate"
                                  value={fmtPct((rec.wins / rec.count) * 100, 0)}
                                  cls="text-ink"
                                />
                                <Row
                                  label="Best"
                                  value={fmtMoney(Math.max(...rec.trades), { sign: true })}
                                  cls="text-gain"
                                />
                                <Row
                                  label="Worst"
                                  value={fmtMoney(Math.min(...rec.trades))}
                                  cls="text-loss"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* week total */}
                    <div
                      style={{ animationDelay: `${wi * 40 + 130}ms` }}
                      className={cn(
                        "cal-cell flex h-[76px] flex-col items-center justify-center rounded-xl border border-edge2",
                        "bg-gradient-to-br from-brand-soft/70 to-panel2",
                        weekCount === 0 && "opacity-40"
                      )}
                    >
                      {weekPnl > 0 ? (
                        <ArrowUpRight size={11} className="mb-0.5 text-gain" />
                      ) : weekPnl < 0 ? (
                        <ArrowDownRight size={11} className="mb-0.5 text-loss" />
                      ) : (
                        <Minus size={11} className="mb-0.5 text-faint" />
                      )}
                      <span
                        className={cn(
                          "font-display text-[11.5px] font-bold leading-none tnum",
                          weekPnl > 0 ? "text-gain" : weekPnl < 0 ? "text-loss" : "text-mut"
                        )}
                      >
                        {fmtMoney(weekPnl, { sign: true })}
                      </span>
                      <span className="mt-1 text-[8.5px] font-semibold text-faint tnum">
                        {weekCount} trades
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* selected day detail */}
      {showDayDetail && sel && (
        <div className="relative border-t border-edge2 px-4 py-4 sm:px-5">
          <div className="mb-2.5 flex items-center gap-2">
            <h4 className="font-display text-[13px] font-bold text-ink">{fmtDate(sel)}</h4>
            <button
              onClick={() => setSel(null)}
              className="ml-auto rounded-lg border border-edge bg-panel2 px-2.5 py-1 text-[10px] font-bold text-faint transition-colors hover:text-ink"
            >
              Close
            </button>
          </div>
          {(() => {
            const dayTrades = trades.filter((t) => t.date === sel);
            if (!dayTrades.length) {
              return <p className="text-[11px] font-bold text-faint">No trades on this day.</p>;
            }
            return (
              <div className="space-y-1">
                {dayTrades.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onSelectTrade?.(t)}
                    className="flex w-full items-center gap-3 rounded-xl border border-edge bg-panel2 px-3 py-2 text-left transition-colors hover:border-brand/40"
                  >
                    <span className="w-16 shrink-0 rounded-md bg-brand-soft px-1.5 py-0.5 text-center font-display text-[10.5px] font-bold text-brand">
                      {t.symbol}
                    </span>
                    <span className={cn("w-12 shrink-0 text-[9.5px] font-extrabold uppercase", t.side === "Long" ? "text-gain" : "text-loss")}>
                      {t.side}
                    </span>
                    <span className="truncate text-[10.5px] font-semibold text-faint">{t.strategy}</span>
                    <span className="ml-auto hidden text-[10px] font-semibold text-faint sm:block">{t.session}</span>
                    <span className={cn("tnum w-16 shrink-0 text-right font-display text-[11.5px] font-bold", t.pnl >= 0 ? "text-gain" : "text-loss")}>
                      {fmtMoney(t.pnl, { sign: true })}
                    </span>
                  </button>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </Card>
  );
}

function Row({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-mut">{label}</span>
      <span className={cn("font-bold tnum", cls)}>{value}</span>
    </div>
  );
}

function Chip({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone: "gain" | "loss" | "brand" | "warn";
}) {
  const map = {
    gain: "bg-gain-soft text-gain ring-gain/15",
    loss: "bg-loss-soft text-loss ring-loss/15",
    brand: "bg-brand-soft text-brand ring-brand/15",
    warn: "bg-warn-soft text-warn ring-warn/15",
  };
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 ring-1 transition-transform duration-200 hover:-translate-y-px",
        map[tone]
      )}
    >
      {icon}
      <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-75">{label}</span>
      <span className="font-display text-[12.5px] font-bold tnum">{value}</span>
      {sub && <span className="text-[9.5px] font-semibold opacity-70 tnum">{sub}</span>}
    </span>
  );
}
