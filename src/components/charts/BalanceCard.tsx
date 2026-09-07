import { Card } from "../ui";
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
  return (
    <Card className="p-6 card-shadow">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="font-bold text-slate-800 dark:text-white">Account Balance</h3>
      </div>
      <div className="flex gap-4 text-[10px] mb-4">
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> <span className="text-mut">Account Balance</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400" /> <span className="text-mut">Deposits / Withdrawals</span></div>
      </div>
      <div className="h-40 relative">
        <svg className="w-full h-full" viewBox="0 0 300 150">
          <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="300" y1="20" y2="20" />
          <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="300" y1="50" y2="50" />
          <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="300" y1="80" y2="80" />
          <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="300" y1="110" y2="110" />
          <line stroke="#f1f5f9" strokeWidth="1" x1="0" x2="300" y1="140" y2="140" />
          <path d="M 0,130 Q 75,120 150,110 T 300,80" fill="none" stroke="#3b82f6" strokeWidth="2" />
          <path d="M 0,150 Q 75,150 150,140 T 300,120" fill="none" stroke="#f87171" strokeWidth="2" />
        </svg>
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-[9px] text-mut">
          <span>{fmtMoney(5000)}</span>
          <span>{fmtMoney(4000)}</span>
          <span>{fmtMoney(3000)}</span>
          <span>{fmtMoney(2000)}</span>
          <span>{fmtMoney(1000)}</span>
          <span>{fmtMoney(0)}</span>
        </div>
      </div>
    </Card>
  );
}