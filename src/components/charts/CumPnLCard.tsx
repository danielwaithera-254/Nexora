import { Card } from "../ui";
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

  return (
    <Card className="p-4 card-shadow flex flex-col justify-between relative lg:col-span-2">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></svg>
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm truncate">Daily Net Cumulative P&L</h3>
          </div>
          <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">+{fmtMoney(maxCum)}</span>
        </div>
        <div className="relative w-full h-44 mt-1">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 450 200">
            <line stroke="#f1f5f9" strokeWidth="1" x1="30" x2="440" y1="20" y2="20" />
            <line stroke="#f1f5f9" strokeWidth="1" x1="30" x2="440" y1="65" y2="65" />
            <line stroke="#94a3b8" strokeDasharray="4 4" strokeWidth="1" x1="30" x2="440" y1="110" y2="110" />
            <line stroke="#f1f5f9" strokeWidth="1" x1="30" x2="440" y1="155" y2="155" />
            <line stroke="#94a3b8" strokeDasharray="3 3" strokeWidth="1" x1="145" x2="145" y1="20" y2="190" />
            <text fill="#94a3b8" fontSize="9" textAnchor="end" x="25" y="24">{fmtMoney(maxCum)}</text>
            <text fill="#94a3b8" fontSize="9" textAnchor="end" x="25" y="69">{fmtMoney(maxCum * 0.66)}</text>
            <text fill="#94a3b8" fontSize="9" textAnchor="end" x="25" y="113">$0</text>
            <text fill="#94a3b8" fontSize="9" textAnchor="end" x="25" y="158">{fmtMoney(minCum)}</text>
            
            {/* Draw the actual data path */}
            <path 
              d={series.map((s, i) => {
                const x = 40 + (i / Math.max(1, series.length - 1)) * 400;
                const y = 110 - ((s.cum - minCum) / Math.max(maxCum - minCum, 1)) * 130;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
              }).join(" ")}
              fill="none" 
              stroke="#ef4444" 
              strokeLinecap="round" 
              strokeWidth="2.5" 
            />
            <path 
              d={series.map((s, i) => {
                const x = 40 + (i / Math.max(1, series.length - 1)) * 400;
                const y = 110 - ((s.cum - minCum) / Math.max(maxCum - minCum, 1)) * 130;
                return `${i === 0 ? "M" : "L"} ${x} ${y}`;
              }).join(" ")}
              fill="none" 
              stroke="#10b981" 
              strokeLinecap="round" 
              strokeWidth="2.5" 
            />
            
            {/* Peak point */}
            <circle 
              cx={40 + ((series.length - 1) / Math.max(1, series.length - 1)) * 400} 
              cy={110 - ((series[series.length - 1].cum - minCum) / Math.max(maxCum - minCum, 1)) * 130} 
              fill="#10b981" r="4.5" stroke="#ffffff" strokeWidth="2" 
            />
          </svg>
          <div className="absolute left-[20%] top-[45%] bg-white dark:bg-slate-800 rounded-xl p-2 shadow-xl border border-slate-100 dark:border-slate-700 chart-tooltip-shadow text-xs z-10 pointer-events-none">
            <p className="font-bold text-slate-800 dark:text-white text-[10px] mb-0.5">Latest</p>
            <div className="flex items-center space-x-2">
              <span className="text-slate-500 dark:text-slate-400 text-[9px]">Cumul P&L</span>
              <span className="font-black text-emerald-600 dark:text-emerald-400 text-[10px]">{fmtMoney(series[series.length - 1]?.cum ?? 0)}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-mut px-2 pt-2 font-medium border-t border-slate-100 dark:border-slate-700">
        <span>{series[0]?.date ?? ""}</span>
        <span>{series[Math.floor(series.length / 4)]?.date ?? ""}</span>
        <span>{series[Math.floor(series.length / 2)]?.date ?? ""}</span>
        <span>{series[Math.floor(series.length * 0.75)]?.date ?? ""}</span>
        <span>{series[series.length - 1]?.date ?? ""}</span>
      </div>
    </Card>
  );
}