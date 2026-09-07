import { Card, CardHead } from "../ui";
import { fmtMoney } from "../../lib/format";

interface Trade {
  date: string;
  pnl: number;
}

export default function CumPnLCard({ trades }: { trades: Trade[] }) {
  const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let cum = 0;
  const series = sorted.map((t) => {
    cum += t.pnl;
    return { date: t.date, cum };
  });

  const maxCum = Math.max(...series.map((s) => s.cum), 0);
  const minCum = Math.min(...series.map((s) => s.cum), 0);
  const span = Math.max(maxCum - minCum, 1);

  const points = series.map((s, i) => {
    const x = (i / Math.max(1, series.length - 1)) * 400;
    const y = 180 - ((s.cum - minCum) / span) * 160;
    return `${x},${y}`;
  }).join(" ");

  const areaPoints = `0,180 ${points} 400,180`;

  return (
    <Card className="p-6 card-shadow flex flex-col justify-between">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-ink">Daily Net Cumulative P&L</h3>
      </div>
      <div className="relative py-2 h-48">
        <svg className="w-full h-full" viewBox="0 0 400 180" preserveAspectRatio="none">
          <defs>
            <linearGradient id="profitGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lossGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <line stroke="var(--surface-border)" strokeWidth="1" x1="0" x2="400" y1="20" y2="20" />
          <line stroke="var(--surface-border)" strokeWidth="1" x1="0" x2="400" y1="70" y2="70" />
          <line stroke="var(--surface-border)" strokeWidth="1.5" x1="0" x2="400" y1="100" y2="100" />
          <line stroke="var(--surface-border)" strokeWidth="1" x1="0" x2="400" y1="140" y2="140" />

          <path d={`M 0,180 L ${points} L 400,180 Z`} fill="url(#profitGrad)" />
          <path d={`M 0,100 Q 50,20 100,50 T 200,100 T 300,100 T 400,80`} fill="none" stroke="#10b981" strokeWidth="2" />

          <circle cx={points.split(" ").pop()?.split(",")[0] ?? 400} cy={points.split(" ").pop()?.split(",")[1] ?? 80} fill="#10b981" r="5" stroke="#fff" strokeWidth="1.5" />
        </svg>
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[10px] text-mut">
          <span>${fmtMoney(maxCum)}</span>
          <span>${fmtMoney(maxCum / 2)}</span>
          <span>$0</span>
          <span>-${fmtMoney(Math.abs(minCum))}</span>
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-mut">
        <span>{series[0]?.date ?? ""}</span>
        <span>{series[Math.floor(series.length / 4)]?.date ?? ""}</span>
        <span>{series[Math.floor(series.length / 2)]?.date ?? ""}</span>
        <span>{series[Math.floor(series.length * 0.75)]?.date ?? ""}</span>
        <span>{series[series.length - 1]?.date ?? ""}</span>
      </div>
    </Card>
  );
}