import { useMemo } from "react";
import { Card } from "./ui";
import { cn } from "../utils/cn";
import { fmtMoney } from "../lib/format";
import { TrendingUp, Target, ShieldAlert, BarChart3, RotateCw } from "lucide-react";

export default function KpiCards({
  trades,
  period = "today",
}: {
  trades: { pnl: number; date: string; symbol: string; side: "Long" | "Short" }[];
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
      label: "Net P&L",
      value: fmtMoney(stats.pnl, { sign: true }),
      trend: "+14.2% vs prev",
      positive: stats.pnl >= 0,
      icon: <TrendingUp className="w-4 h-4" />,
      badge: "-$3.2K Peak",
      badgeColor: "danger",
    },
    {
      label: "Profit Factor",
      value: stats.profitFactor.toFixed(2),
      trend: stats.profitFactor >= 1.5 ? "Strong edge" : stats.profitFactor >= 1 ? "Acceptable" : "Needs work",
      positive: stats.profitFactor >= 1,
      icon: <Target className="w-4 h-4" />,
      showRing: true,
      ringProgress: Math.min(1, stats.profitFactor / 2),
    },
    {
      label: "Current Streak",
      value: stats.wins > stats.losses ? `${stats.wins} Days Green` : `${stats.losses} Days Red`,
      trend: "Disciplined pace",
      positive: stats.wins >= stats.losses,
      icon: <ShieldAlert className="w-4 h-4" />,
      winStreak: stats.wins,
      lossStreak: stats.losses,
    },
    {
      label: "Trade Win %",
      value: `${stats.winRate.toFixed(1)}%`,
      trend: `${stats.wins}W / ${stats.losses}L (${stats.total} total)`,
      positive: stats.winRate >= 40,
      icon: <BarChart3 className="w-4 h-4" />,
      gaugeProgress: stats.winRate / 100,
    },
    {
      label: "Avg Win / Loss",
      value: `${stats.winLossRatio.toFixed(1)} R`,
      trend: `${fmtMoney(stats.avgWin)} / ${fmtMoney(-stats.avgLoss)}`,
      positive: stats.winLossRatio >= 1,
      icon: <RotateCw className="w-4 h-4" />,
      barProgress: stats.winLossRatio >= 1 ? 0.65 : 0.4,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" data-purpose="kpi-metrics-row">
      {cards.map((card, idx) => (
        <Card key={idx} glow={idx === 0} className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-faint mb-2">
            <span className="font-medium">{card.label}</span>
            {card.badge && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                card.badgeColor === "danger" ? "bg-[rgba(232,59,176,0.15)] text-[var(--neon-danger)] border-[var(--neon-danger)]/40" :
                "bg-neon-purple/20 text-neon-violet border-neon-purple/30"
              }`}>
                {card.badge}
              </span>
            )}
          </div>
          <div className="mb-2">
            <div className="text-2xl font-extrabold text-white tracking-tight drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]">
              {card.value}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-faint">
              <span className={cn("flex items-center font-semibold", card.positive ? "text-neon-success" : "text-neon-danger")}>
                {card.positive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 rotate-180 mr-1" />}
                {card.trend}
              </span>
            </div>
          </div>

          {/* Progress indicators */}
          <div className="space-y-2">
            {card.showRing && (
              <div className="relative w-12 h-12 flex items-center justify-center mx-auto">
                <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                  <circle className="text-surface-border" cx="18" cy="18" fill="none" r="14" stroke="currentColor" strokeWidth="3.5" />
                  <circle
                    className="text-neon-violet"
                    cx="18"
                    cy="18"
                    fill="none"
                    r="14"
                    stroke="currentColor"
                    strokeDasharray="88"
                    strokeDashoffset={88 * (1 - card.ringProgress)}
                    strokeLinecap="round"
                    strokeWidth="3.5"
                  />
                </svg>
                <span className="absolute text-[9px] font-bold text-neon-violet">PF</span>
              </div>
            )}

            {card.gaugeProgress !== undefined && (
              <div className="w-14 h-9 overflow-hidden flex flex-col items-center mx-auto">
                <svg className="w-14" viewBox="0 0 36 20">
                  <path d="M 2 18 A 16 16 0 0 1 34 18" fill="none" stroke="var(--surface-border)" strokeLinecap="round" strokeWidth="4" />
                  <path
                    d="M 2 18 A 16 16 0 0 1 20 2"
                    fill="none"
                    stroke={card.positive ? "var(--neon-success)" : "var(--neon-danger)"}
                    strokeDasharray="50"
                    strokeDashoffset={50 * (1 - card.gaugeProgress)}
                    strokeLinecap="round"
                    strokeWidth="4"
                  />
                </svg>
                <div className="flex justify-between w-full text-[8px] text-faint px-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            )}

            {card.winStreak !== undefined && card.lossStreak !== undefined && (
              <div className="flex gap-2 mt-2">
                <div className="px-2 py-1 rounded-md bg-neon-success/10 border border-neon-success/30 text-[10px] font-medium text-neon-success">
                  {card.winStreak} days win
                </div>
                <div className="px-2 py-1 rounded-md bg-neon-danger/10 border border-neon-danger/30 text-[10px] font-medium text-neon-danger">
                  {card.lossStreak} trades max
                </div>
              </div>
            )}

            {card.barProgress !== undefined && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-neon-success">+{fmtMoney(card.avgWin ?? 34.82)}</span>
                  <span className="text-neon-danger">-{fmtMoney(card.avgLoss ?? 51.32)}</span>
                </div>
                <div className="w-full flex h-2 rounded-full overflow-hidden bg-surface-border">
                  <div className="bg-neon-success h-full shadow-[0_0_6px_rgba(16,185,129,0.5)]" style={{ width: `${card.barProgress * 100}%` }} />
                  <div className="bg-neon-danger h-full" style={{ width: `${(1 - card.barProgress) * 100}%` }} />
                </div>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}