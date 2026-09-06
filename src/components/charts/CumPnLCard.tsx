import { Card, CardHead } from "../ui";
import { fmtMoney } from "../../lib/format";

interface Trade {
  date: string;
  pnl: number;
}

export default function CumPnLCard({ trades }: { trades: Trade[] }) {
  // Generate cumulative P&L series
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

  const areaPoints = `${points} 400,180 0,180`;

  return (
    <Card className="p-5 flex flex-col justify-between" elevated>
      <CardHead
        title="Daily Cumulative P&L"
        info="Equity curve trajectory"
        right={
          <>
            <span className="text-[10px] text-neon-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-success" /> Active Session
            </span>
          </>
        }
        icon={<Sparkles className="w-4 h-4 text-neon-purple" />}
      />

      <div className="h-48 relative">
        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 400 180">
          <defs>
            <linearGradient id="pnlGreenGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="pnlRedGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#E11D48" stopOpacity="0.0" />
              <stop offset="100%" stopColor="#E11D48" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          <line stroke="var(--surface-border)" strokeDasharray="2,2" x1="0" x2="400" y1="20" y2="20" />
          <line stroke="var(--surface-border)" strokeDasharray="2,2" x1="0" x2="400" y1="70" y2="70" />
          <line stroke="var(--neon-success)" strokeWidth="1.2" x1="0" x2="400" y1="100" y2="100" />
          <line stroke="var(--surface-border)" strokeDasharray="2,2" x1="0" x2="400" y1="140" y2="140" />

          {/* Positive Area */}
          <path d={`M0,180 L${points} L400,180 Z`} fill="url(#pnlGreenGradient)" />
          {/* Negative Area (if any) */}
          <path d={`M0,100 L${points} L400,100 Z`} fill="url(#pnlRedGradient)" stroke="var(--neon-danger)" strokeWidth="1.5" />
          {/* Main Line */}
          <path d={`M${points}`} fill="none" stroke="#C084FC" strokeLinecap="round" strokeWidth="2.5" />

          {/* Current position indicator */}
          {series.length > 0 && (
            <>
              <circle className="animate-ping" cx={series.length > 1 ? (series.length - 1) / Math.max(1, series.length - 1) * 400 : 200} cy={180 - ((series[series.length - 1]?.cum || 0) - minCum) / span * 160} fill="#EC4899" opacity="0.4" r="5" stroke="#ffffff" strokeWidth="2" />
              <circle cx={series.length > 1 ? (series.length - 1) / Math.max(1, series.length - 1) * 400 : 200} cy={180 - ((series[series.length - 1]?.cum || 0) - minCum) / span * 160} fill="#A855F7" r="4.5" stroke="#ffffff" strokeWidth="1.5" />
            </>
          )}
        </svg>

        {/* Y-Axis Labels */}
        <div className="absolute left-2 top-0 h-full flex flex-col justify-between text-[9px] font-mono text-faint/80 pointer-events-none">
          <span>+{fmtMoney(maxCum)}</span>
          <span>+{fmtMoney(maxCum / 2)}</span>
          <span className="text-neon-violet font-bold">$0</span>
          <span>-{fmtMoney(Math.abs(minCum) / 2)}</span>
          <span>-{fmtMoney(Math.abs(minCum))}</span>
        </div>
      </div>

      <div className="flex justify-between text-[9px] font-mono text-faint border-t border-surface-border pt-2">
        <span>Start</span>
        <span>Mid</span>
        <span>End</span>
      </div>
    </Card>
  );
}