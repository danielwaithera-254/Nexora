import { useMemo } from "react";
import { Card } from "./ui";
import { cn } from "../utils/cn";
import { fmtMoney } from "../lib/format";
import { TrendingUp } from "lucide-react";

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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" data-purpose="kpi-metrics-row">
      {/* Net P&L */}
      <Card className="p-4 card-shadow">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-mut uppercase tracking-wider">Net P&L</span>
          <div className="w-6 h-6 bg-red-50 text-red-500 rounded flex items-center justify-center text-[10px] font-bold">-$3.2K</div>
        </div>
        <div className="text-2xl font-bold text-green-500">{fmtMoney(stats.pnl, { sign: true })}</div>
        <div className="mt-2 h-1 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="bg-green-500 h-full" style={{ width: "70%" }} />
        </div>
      </Card>

      {/* Profit Factor */}
      <Card className="p-4 card-shadow flex items-center gap-4">
        <div className="flex-1">
          <span className="text-xs font-medium text-mut uppercase tracking-wider block mb-1">Profit Factor</span>
          <div className="text-2xl font-bold text-ink">{stats.profitFactor.toFixed(2)}</div>
        </div>
        <div className="w-10 h-10 border-4 border-red-400 border-t-green-500 rounded-full" />
      </Card>

      {/* Current Streak */}
      <Card className="p-4 card-shadow flex items-center gap-4">
        <div className="flex-1">
          <span className="text-xs font-medium text-mut uppercase tracking-wider block mb-1">Current streak</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-ink">{stats.wins > stats.losses ? stats.wins : stats.losses}</span>
            <span className="text-xs text-mut">DAYS</span>
          </div>
        </div>
        <div className="flex flex-col gap-1 text-[10px] text-mut">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span>{stats.losses} days</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span>{stats.wins} days</span>
          </div>
        </div>
      </Card>

      {/* Trade Win % */}
      <Card className="p-4 card-shadow">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-mut uppercase tracking-wider">Trades</span>
          <span className="text-xs font-medium text-mut uppercase tracking-wider">Trade Win %</span>
        </div>
        <div className="flex items-end justify-between">
          <div className="text-2xl font-bold text-ink">{stats.winRate.toFixed(1)}%</div>
          <div className="flex flex-col items-center">
            <div className="relative w-16 h-8 overflow-hidden">
              <div className="absolute top-0 w-16 h-16 border-8 border-surface-border rounded-full border-t-red-400 border-r-green-500 rotate-[-45deg]" />
            </div>
            <div className="flex gap-2 text-[8px] text-mut">
              <span>{stats.losses}</span>
              <span>{stats.wins}</span>
              <span>{stats.total}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Avg Win/Loss */}
      <Card className="p-4 card-shadow">
        <span className="text-xs font-medium text-mut uppercase tracking-wider block mb-1">Avg win/loss trade</span>
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl font-bold text-ink">{stats.winLossRatio.toFixed(1)}</div>
          <div className="text-[10px] space-x-2">
            <span className="text-green-500">{fmtMoney(stats.avgWin)}</span>
            <span className="text-red-500">{fmtMoney(-stats.avgLoss)}</span>
          </div>
        </div>
        <div className="h-1 bg-surface-border rounded-full flex overflow-hidden">
          <div className="bg-green-500 h-full" style={{ width: `${Math.min(100, stats.winLossRatio * 40)}%` }} />
          <div className="bg-red-500 h-full" style={{ width: `${Math.max(0, 100 - Math.min(100, stats.winLossRatio * 40))}%` }} />
        </div>
      </Card>
    </div>
  );
}