import { Card, CardHead } from "../ui";
import { fmtMoney } from "../../lib/format";

export default function BalanceCard({ 
  trades = [],
  balance = 18450,
  startBalance = 10000,
}: { 
  trades?: { date: string; pnl: number }[];
  balance: number;
  startBalance: number;
}) {
  // Generate cumulative balance series
  const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let cum = startBalance;
  const series = sorted.map((t) => {
    cum += t.pnl;
    return { date: t.date, balance: cum };
  });
  series.unshift({ date: sorted[0]?.date || new Date().toISOString().slice(0, 10), balance: startBalance });

  const maxBal = Math.max(...series.map((s) => s.balance));
  const minBal = Math.min(...series.map((s) => s.balance));
  const span = Math.max(maxBal - minBal, 1);

  const points = series.map((s, i) => {
    const x = (i / Math.max(1, series.length - 1)) * 300;
    const y = 120 - ((s.balance - minBal) / span) * 100;
    return `${x},${y}`;
  }).join(" ");

  const depositsPoints = series.map((s, i) => {
    const x = (i / Math.max(1, series.length - 1)) * 300;
    const y = 120 - ((s.balance - minBal - 5000) / span) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <Card className="p-5" elevated>
      <CardHead
        title="Account Balance Growth"
        info={`+${fmtMoney(balance - startBalance)} Net Growth`}
        right={
          <span className="text-xs font-bold text-white">{fmtMoney(balance)}</span>
        }
        icon={<Wallet className="w-4 h-4 text-neon-purple" />}
      />

      <div className="flex gap-4 text-[10px] font-mono mb-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-neon-success shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
          <span className="text-faint">Portfolio Equity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-neon-pink shadow-[0_0_5px_rgba(236,72,153,0.5)]" />
          <span className="text-faint">Deposits / Withdrawals</span>
        </div>
      </div>

      <div className="h-36 relative">
        <svg className="w-full h-full" viewBox="0 0 300 120">
          {/* Gridlines */}
          <line stroke="var(--surface-border)" strokeDasharray="2,2" x1="0" x2="300" y1="20" y2="20" />
          <line stroke="var(--surface-border)" strokeDasharray="2,2" x1="0" x2="300" y1="60" y2="60" />
          <line stroke="var(--surface-border)" strokeDasharray="2,2" x1="0" x2="300" y1="100" y2="100" />

          {/* Deposits / Withdrawals Curve */}
          <path d="M 0 95 Q 80 92, 120 90 T 200 85 T 300 75" fill="none" stroke="#F472B6" strokeDasharray="3,3" strokeWidth="1.8" />
          
          {/* Balance Curve */}
          <path d="M 0 90 Q 60 85, 90 70 T 160 55 T 220 30 T 300 15" fill="none" stroke="#C084FC" strokeWidth="2.5" />
          <circle cx="300" cy="15" fill="#A855F7" r="4" stroke="#0D0E12" strokeWidth="1.5" />
        </svg>

        <div className="absolute left-1 top-0 h-full flex flex-col justify-between text-[9px] font-mono text-faint/70 pointer-events-none">
          <span>{fmtMoney(maxBal)}</span>
          <span></span>
          <span></span>
          <span></span>
          <span>{fmtMoney(minBal)}</span>
        </div>
      </div>
    </Card>
  );
}