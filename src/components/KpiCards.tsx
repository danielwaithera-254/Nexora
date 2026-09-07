import { useMemo } from "react";
import { Card } from "./ui";
import { cn } from "../utils/cn";
import { fmtMoney } from "../lib/format";
import { TrendingDown, TrendingUp } from "lucide-react";

export default function KpiCards({
  trades,
  period = "today",
}: {
  trades: { pnl: number; date: string; symbol: string; side: "Long" | "Short"; strategy: string; account: string }[];
  period: "today" | "week" | "month" | "all";
}) {
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const scoped = period === "today"
      ? trades.filter((t) => t.date === today)
      : period === "week"
        ? trades.filter((t) => new Date(t.date) >= new Date(Date.now() - 7 * 86400000))
        : period === "month"
          ? trades.filter((t) => new Date(t.date) >= new Date(Date.now() - 30 * 86400000))
          : trades;

    const pnl = scoped.reduce((s, t) => s + t.pnl, 0);
    const wins = scoped.filter((t) => t.pnl > 0).length;
    const losses = scoped.filter((t) => t.pnl < 0).length;
    const total = scoped.length;
    const winRate = total ? (wins / total) * 100 : 0;
    const grossProfit = scoped.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(scoped.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
    const profitFactor = grossLoss ? grossProfit / grossLoss : 0;
    const avgWin = wins ? grossProfit / wins : 0;
    const avgLoss = losses ? grossLoss / losses : 0;
    const winLossRatio = avgLoss ? avgWin / avgLoss : 0;

    return { pnl, wins, losses, total, winRate, profitFactor, winLossRatio, avgWin, avgLoss };
  }, [trades, period]);

  const cards = [
    {
      label: "NET P&L",
      value: fmtMoney(stats.pnl, { sign: true }),
      trend: "15.5% vs prev",
      positive: stats.pnl >= 0,
      icon: (
        <svg className="w-14 h-6 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 50 20">
          <path d="M 0 15 Q 12 18 20 14 T 35 12 T 50 3" strokeLinecap="round" />
        </svg>
      ),
      badge: "↘ 15.5%",
      badgeColor: "loss",
    },
    {
      label: "PROFIT FACTOR",
      value: stats.profitFactor.toFixed(2),
      subValue: `${fmtMoney(stats.profitFactor * stats.avgLoss * stats.losses)} won · ${fmtMoney(stats.avgLoss * stats.losses)} lost`,
      positive: stats.profitFactor >= 1,
      showRing: true,
      ringProgress: Math.min(1, stats.profitFactor / 2),
    },
    {
      label: "CURRENT STREAK",
      value: `${stats.wins > stats.losses ? stats.wins : stats.losses} ${stats.wins > stats.losses ? "W" : "L"}`,
      trend: "Keep the discipline",
      positive: stats.wins >= stats.losses,
      streakIcon: true,
    },
    {
      label: "TRADES",
      value: stats.total.toString(),
      subValue: (
        <div className="flex items-center space-x-1.5 text-[10px] font-bold">
          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200">{stats.wins}W</span>
          <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-200">{stats.losses}L</span>
        </div>
      ),
      positive: stats.wins >= stats.losses,
    },
    {
      label: "WIN RATE",
      value: `${stats.winRate.toFixed(1)}%`,
      trend: "14.4%",
      positive: stats.winRate >= 50,
      showBar: true,
      barProgress: stats.winRate / 100,
      trendColor: "loss",
    },
    {
      label: "AVG RISK:REWARD",
      value: `${stats.winLossRatio.toFixed(1)}×`,
      positive: stats.winLossRatio >= 1,
      showRiskReward: true,
      avgWin: stats.avgWin,
      avgLoss: stats.avgLoss,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4" data-purpose="kpi-metrics-grid">
      {cards.map((card, idx) => (
        <Card key={idx} className="p-4 card-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-mut font-semibold uppercase tracking-wider">
            <span>{card.label}</span>
            <svg className="w-3.5 h-3.5 text-faint cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="16" y2="12" /><line x1="12" x2="12.01" y1="8" y2="8" /></svg>
          </div>
          <div className="my-2 flex items-baseline justify-between">
            <div className="text-2xl font-black text-ink tracking-tight">{card.value}</div>
            {card.icon}
          </div>

          {card.showRing && (
            <div className="my-2 flex items-center justify-between">
              <div className="text-[11px] text-mut truncate">{card.subValue}</div>
              <div className="relative w-9 h-9">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" fill="none" r="14" stroke="#f3e8ff" strokeWidth="4" />
                  <circle cx="18" cy="18" fill="none" r="14" stroke="#7c3aed" strokeDasharray="88" strokeDashoffset={88 * (1 - card.ringProgress)} strokeLinecap="round" strokeWidth="4" />
                </svg>
              </div>
            </div>
          )}

          {card.streakIcon && (
            <div className="my-2 flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2c1.5 3 4 5 4 9a6 6 0 0 1-12 0c0-4 2.5-6 4-9 0 3 2 4 4 4s0-4 0-4z" /></svg>
              </div>
              <div className="text-2xl font-black text-ink tracking-tight">{card.value}</div>
            </div>
          )}

          {card.subValue && !card.showRing && (
            <div className="my-2">{card.subValue}</div>
          )}

          {card.showBar && (
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div className="h-full bg-gradient-to-r from-purple-600 to-teal-500" style={{ width: `${card.barProgress * 100}%` }} />
            </div>
          )}

          {card.showRiskReward && (
            <div className="space-y-1 text-[10px] font-semibold">
              <div className="flex items-center justify-between">
                <div className="w-16 h-1.5 bg-emerald-600 rounded-full" />
                <span className="text-emerald-600">{fmtMoney(card.avgWin)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="w-14 h-1.5 bg-rose-500 rounded-full" />
                <span className="text-rose-500">{fmtMoney(-card.avgLoss)}</span>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-1.5 text-[11px]">
            {card.badge && (
              <span className={cn("px-1.5 py-0.5 rounded font-bold flex items-center", card.badgeColor === "loss" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}>
                {card.badge}
              </span>
            )}
            {card.trend && !card.badge && (
              <span className={cn("px-1.5 py-0.5 rounded font-bold flex items-center", card.trendColor === "loss" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}>
                {card.trend}
              </span>
            )}
            <span className="text-faint">vs prev period</span>
          </div>
        </Card>
      ))}
    </div>
  );
}