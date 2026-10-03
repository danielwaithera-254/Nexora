import { useMemo } from "react";
import { Card, CardHead } from "../ui";
import { Grid3x3 } from "lucide-react";
import type { Trade } from "../../data/trades";
import { dailyMap } from "../../lib/metrics";
import { fmtDateShort, fmtMoney } from "../../lib/format";

const iso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

export default function HeatmapCard({ trades }: { trades: Trade[] }) {
  const { weeks, maxAbs, net } = useMemo(() => {
    const map = dailyMap(trades);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // anchor the window so the LAST column always contains today,
    // then align the start back to Monday for clean Mon..Sun columns
    const start = new Date(today);
    start.setDate(start.getDate() - (12 * 7 - 1));
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

    const all: { key: string; inFuture: boolean }[][] = [];
    const cur = new Date(start);
    while (cur.getTime() <= today.getTime()) {
      const col: { key: string; inFuture: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const key = iso(cur);
        col.push({ key, inFuture: cur.getTime() > today.getTime() });
        cur.setDate(cur.getDate() + 1);
      }
      all.push(col);
    }
    // keep the trailing 12 weeks so today is always visible
    const weeks = all.slice(-12);

    let mx = 1;
    let sum = 0;
    for (const col of weeks) {
      for (const cell of col) {
        if (cell.inFuture) continue;
        const rec = map.get(cell.key);
        if (rec) {
          mx = Math.max(mx, Math.abs(rec.pnl));
          sum += rec.pnl;
        }
      }
    }
    return { weeks, maxAbs: mx, net: sum };
  }, [trades]);

  const map = useMemo(() => dailyMap(trades), [trades]);
  const days = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

  return (
    <Card className="flex h-full flex-col" elevated>
      <CardHead
        title="Progress Tracker"
        info="Daily P&L intensity over the trailing 12 weeks. Green days are profitable, red days are losses."
        icon={<Grid3x3 size={14} />}
        right={
          <span className={`rounded-md px-2 py-1 text-[10px] font-bold tnum ${net >= 0 ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss"}`}>
            {fmtMoney(net, { sign: true })}
          </span>
        }
      />
      <div className="flex flex-1 flex-col justify-center px-5 pb-4">
        <div className="flex gap-[5px]">
          <div className="mr-1 flex flex-col justify-between py-[1px] text-[8.5px] font-bold text-faint">
            {days.map((d, i) => (
              <span key={i} className="h-[18px] leading-[18px]">{d}</span>
            ))}
          </div>
          {weeks.map((col, wi) => (
            <div key={wi} className="flex flex-1 flex-col gap-[5px]">
              {col.map((cell) => {
                const rec = map.get(cell.key);
                const alpha = rec ? 20 + 75 * (Math.abs(rec.pnl) / maxAbs) : 0;
                const bg = cell.inFuture
                  ? "transparent"
                  : rec
                    ? rec.pnl > 0
                      ? `color-mix(in srgb, var(--gain) ${Math.min(100, alpha + 20)}%, transparent)`
                      : rec.pnl < 0
                        ? `color-mix(in srgb, var(--loss) ${alpha}%, transparent)`
                        : "var(--edge2)"
                    : "var(--edge2)";
                return (
                  <div key={cell.key} className="group relative h-[18px] flex-1">
                    <div
                      className="h-full w-full rounded-[4px] transition-transform duration-150 group-hover:scale-110 group-hover:ring-1 group-hover:ring-brand"
                      style={{ background: bg }}
                    />
                    {!cell.inFuture && (
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-edge bg-panel px-2 py-1 text-[10px] font-semibold text-ink shadow-xl group-hover:block tnum">
                        {fmtDateShort(cell.key)} ·{" "}
                        <span className={rec && rec.pnl > 0 ? "text-gain" : rec && rec.pnl < 0 ? "text-loss" : "text-mut"}>
                          {rec ? fmtMoney(rec.pnl, { sign: true }) : "flat"}
                        </span>
                        {rec ? ` · ${rec.count}t` : ""}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between text-[9.5px] font-bold text-faint">
          <span>12 weeks ago</span>
          <span className="flex items-center gap-1">
            Less
            {[0, 25, 50, 75, 100].map((a) => (
              <span
                key={a}
                className="h-2.5 w-2.5 rounded-[3px]"
                style={{ background: `color-mix(in srgb, var(--gain) ${a}%, var(--edge2))` }}
              />
            ))}
            More
          </span>
          <span>Today</span>
        </div>
      </div>
    </Card>
  );
}
