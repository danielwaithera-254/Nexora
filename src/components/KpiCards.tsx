import { Flame, Trophy } from "lucide-react";
import type { Kpis } from "../lib/metrics";
import { trendPct } from "../lib/metrics";
import { fmtMoney, fmtNum, fmtPct } from "../lib/format";
import { Card, Delta, InfoTip, Sparkline, useCountUp } from "./ui";
import { cn } from "../utils/cn";

function Label({ text, tip }: { text: string; tip: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-mut">{text}</span>
      <InfoTip text={tip} />
    </div>
  );
}

/** thin colored rail across the top of a KPI card — instant visual grouping */
function Rail({ tone }: { tone: "brand" | "gain" | "loss" | "warn" }) {
  const map = {
    brand: "from-brand/0 via-brand to-brand/0",
    gain: "from-gain/0 via-gain to-gain/0",
    loss: "from-loss/0 via-loss to-loss/0",
    warn: "from-brand/0 via-brand to-brand/0",
  };
  return (
    <span
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r opacity-70",
        map[tone]
      )}
    />
  );
}

export default function KpiCards({
  k,
  prev,
  spark,
}: {
  k: Kpis;
  prev: Kpis | null;
  spark: number[];
}) {
  const net = useCountUp(k.net);
  const pf = useCountUp(k.pf);
  const wr = useCountUp(k.winRate);
  const cnt = useCountUp(k.count);
  const ratio = useCountUp(k.wlRatio);

  const ringC = 2 * Math.PI * 16;
  const pfFill = Math.min(1, k.pf / 3);
  const streakWin = k.streak.type === "win";
  const maxWL = Math.max(k.avgWin, k.avgLoss, 1);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {/* Net P&L */}
      <Card hover className="relative p-4">
        <Rail tone={k.net >= 0 ? "gain" : "loss"} />
        <Label text="Net P&L" tip="Realized profit and loss across all closed trades in the selected view." />
        <div className="mt-2 flex items-end justify-between gap-2">
          <p
            className={cn(
              "font-display text-xl font-bold leading-none tnum sm:text-2xl",
              k.net > 0 ? "text-gain" : k.net < 0 ? "text-loss" : "text-ink"
            )}
          >
            {fmtMoney(net, { sign: true })}
          </p>
          <Sparkline data={spark} color={k.net >= 0 ? "var(--gain)" : "var(--loss)"} />
        </div>
        <div className="mt-2.5 flex items-center gap-1.5">
          <Delta value={prev ? trendPct(k.net, prev.net) : null} />
          <span className="text-[10px] font-medium text-faint">vs prev period</span>
        </div>
      </Card>

      {/* Profit Factor */}
      <Card hover className="relative p-4">
        <Rail tone={k.pf >= 1.5 ? "gain" : k.pf >= 1 ? "brand" : "loss"} />
        <Label text="Profit Factor" tip="Gross profit ÷ gross loss. Above 1.5 is considered healthy." />
        <div className="mt-2 flex items-center gap-3">
          <p className="font-display text-2xl font-bold leading-none text-ink tnum">{fmtNum(pf)}</p>
          <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
            <defs>
              <linearGradient id="pfRing" x1="0" y1="0" x2="1" y2="1">
                <stop
                  offset="0%"
                  stopColor={k.pf >= 1.5 ? "var(--gain)" : k.pf >= 1 ? "var(--brand)" : "var(--loss)"}
                />
                <stop offset="100%" stopColor="var(--brand)" />
              </linearGradient>
            </defs>
            <circle cx="22" cy="22" r="16" fill="none" stroke="var(--edge2)" strokeWidth="5.5" />
            <circle
              cx="22"
              cy="22"
              r="16"
              fill="none"
              stroke="url(#pfRing)"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeDasharray={`${pfFill * ringC} ${ringC}`}
              className="transition-[stroke-dasharray] duration-700 ease-out"
            />
          </svg>
        </div>
        <p className="mt-2.5 text-[10px] font-medium text-faint">
          <span className="font-bold text-gain">{fmtMoney(k.grossProfit)}</span> won ·{" "}
          <span className="font-bold text-loss">{fmtMoney(k.grossLoss)}</span> lost
        </p>
      </Card>

      {/* Current streak */}
      <Card hover className="relative p-4">
        <Rail tone={k.streak.type === "loss" ? "loss" : "gain"} />
        <Label text="Current Streak" tip="Consecutive wins or losses on your most recent trades." />
        <div className="mt-2 flex items-center gap-2">
          <span
            className={cn(
              "grid h-9 w-9 place-items-center rounded-lg",
              k.streak.type === "none"
                ? "bg-panel2 text-faint"
                : streakWin
                  ? "bg-gain-soft text-gain"
                  : "bg-loss-soft text-loss"
            )}
          >
            <Flame size={17} className={streakWin ? "animate-pulse" : ""} />
          </span>
          <div>
            <p className="font-display text-2xl font-bold leading-none text-ink tnum">
              {k.streak.len}
              <span className={cn("ml-1 text-sm", streakWin ? "text-gain" : "text-loss")}>
                {k.streak.type === "none" ? "—" : streakWin ? "W" : "L"}
              </span>
            </p>
          </div>
        </div>
        <p className="mt-2.5 text-[10px] font-medium text-faint">
          {k.streak.type === "none" ? "No closed trades yet" : streakWin ? "Keep the discipline" : "Size down, reset"}
        </p>
      </Card>

      {/* Trades */}
      <Card hover className="relative p-4">
        <Rail tone="brand" />
        <Label text="Trades" tip="Total closed executions in the selected view." />
        <p className="mt-2 font-display text-2xl font-bold leading-none text-ink tnum">{Math.round(cnt)}</p>
        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="rounded-md bg-gain-soft px-1.5 py-0.5 text-[10px] font-bold text-gain tnum">{k.wins}W</span>
          <span className="rounded-md bg-loss-soft px-1.5 py-0.5 text-[10px] font-bold text-loss tnum">{k.losses}L</span>
          {k.be > 0 && (
            <span className="rounded-md bg-panel2 px-1.5 py-0.5 text-[10px] font-bold text-mut tnum">{k.be}BE</span>
          )}
        </div>
      </Card>

      {/* Win rate */}
      <Card hover className="relative p-4">
        <Rail tone="brand" />
        <Label text="Win Rate" tip="Percentage of closed trades that finished in profit." />
        <div className="mt-2 flex items-end justify-between">
          <p className="font-display text-2xl font-bold leading-none text-ink tnum">{fmtPct(wr)}</p>
          <Delta value={prev ? trendPct(k.winRate, prev.winRate) : null} />
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-panel2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand to-gain transition-all duration-700"
            style={{ width: `${Math.min(100, k.winRate)}%` }}
          />
        </div>
      </Card>

      {/* Avg risk:reward */}
      <Card hover className="relative p-4">
        <Rail tone={k.wlRatio >= 1.5 ? "gain" : "brand"} />
        <Label text="Avg Risk:Reward" tip="Average win R compared to average loss R. Higher is better." />
        <div className="mt-2 flex items-center gap-1.5">
          <p className="font-display text-2xl font-bold leading-none text-ink tnum">{fmtNum(ratio, 1)}×</p>
          {k.wlRatio >= 1.5 && <Trophy size={14} className="text-brand" />}
        </div>
        <div className="mt-2.5 space-y-1">
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel2">
              <div className="h-full rounded-full bg-gain" style={{ width: `${(k.avgWin / maxWL) * 100}%` }} />
            </div>
            <span className="w-12 text-right text-[9.5px] font-bold text-gain tnum">{fmtMoney(k.avgWin)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel2">
              <div className="h-full rounded-full bg-loss" style={{ width: `${(k.avgLoss / maxWL) * 100}%` }} />
            </div>
            <span className="w-12 text-right text-[9.5px] font-bold text-loss tnum">-{fmtMoney(k.avgLoss)}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
