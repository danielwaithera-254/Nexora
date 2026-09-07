import { Card } from "./ui";

export default function PnlWeekday() {
  return (
    <Card className="p-5 card-shadow flex flex-col justify-between w-full" data-purpose="pnl-weekday-card">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" /></svg>
          </div>
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">P&L by Weekday</h3>
        </div>
      </div>
      <div className="relative w-full h-48 my-2">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 500 160">
          <line stroke="#f1f5f9" strokeWidth="1" x1="35" x2="480" y1="15" y2="15" />
          <line stroke="#f1f5f9" strokeWidth="1" x1="35" x2="480" y1="50" y2="50" />
          <line stroke="#cbd5e1" strokeWidth="1" x1="35" x2="480" y1="85" y2="85" />
          <line stroke="#f1f5f9" strokeWidth="1" x1="35" x2="480" y1="125" y2="125" />
          <text fill="#94a3b8" fontSize="9" textAnchor="end" x="30" y="18">$4.5k</text>
          <text fill="#94a3b8" fontSize="9" textAnchor="end" x="30" y="53">$3.0k</text>
          <text fill="#94a3b8" fontSize="9" textAnchor="end" x="30" y="88">$0</text>
          <text fill="#94a3b8" fontSize="9" textAnchor="end" x="30" y="128">-$1.5k</text>
          <rect fill="#059669" height="35" rx="4" width="36" x="75" y="50" />
          <rect fill="#059669" height="15" rx="4" width="36" x="160" y="70" />
          <rect fill="#059669" height="65" rx="4" width="36" x="245" y="20" />
          <rect fill="#e11d48" height="28" rx="4" width="36" x="330" y="85" />
          <rect fill="#059669" height="55" rx="4" width="36" x="415" y="30" />
        </svg>
      </div>
      <div className="grid grid-cols-5 text-center text-xs pt-1 border-t border-slate-100 dark:border-slate-700">
        <div>
          <p className="text-mut font-semibold">MON</p>
          <p className="font-bold text-slate-700 dark:text-slate-300">31t</p>
        </div>
        <div>
          <p className="text-mut font-semibold">TUE</p>
          <p className="font-bold text-slate-700 dark:text-slate-300">26t</p>
        </div>
        <div>
          <p className="text-mut font-semibold">WED</p>
          <p className="font-bold text-slate-700 dark:text-slate-300">29t</p>
        </div>
        <div>
          <p className="text-mut font-semibold">THU</p>
          <p className="font-bold text-slate-700 dark:text-slate-300">23t</p>
        </div>
        <div>
          <p className="text-mut font-semibold">FRI</p>
          <p className="font-bold text-slate-700 dark:text-slate-300">19t</p>
        </div>
      </div>
    </Card>
  );
}