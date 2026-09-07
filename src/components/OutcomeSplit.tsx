import { Card } from "./ui";

export default function OutcomeSplit() {
  return (
    <Card className="p-5 card-shadow flex flex-col justify-between w-full" data-purpose="outcome-split-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          </div>
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">Outcome Split</h3>
        </div>
      </div>
      <div className="relative w-44 h-44 mx-auto my-3 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" fill="none" r="14" stroke="#e11d48" strokeWidth="4.2" />
          <circle cx="18" cy="18" fill="none" r="14" stroke="#059669" strokeDasharray="88" strokeDashoffset="38.7" strokeLinecap="round" strokeWidth="4.2" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-black text-slate-800 dark:text-white leading-none">56%</span>
          <span className="text-[10px] font-bold tracking-wider text-mut uppercase mt-1">Win Rate</span>
        </div>
      </div>
      <div className="grid grid-cols-2 text-center pt-3 border-t border-slate-100 dark:border-slate-700">
        <div>
          <p className="text-xs text-mut font-semibold">Winners</p>
          <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">72</p>
        </div>
        <div>
          <p className="text-xs text-mut font-semibold">Losers</p>
          <p className="text-lg font-black text-rose-600 dark:text-rose-400">56</p>
        </div>
      </div>
    </Card>
  );
}