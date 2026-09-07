import { useMemo, useState } from "react";
import { Card } from "./ui";
import { ChevronLeft, ChevronRight, Lock, Check } from "lucide-react";
import { fmtMoney } from "../lib/format";
import { cn } from "../utils/cn";

interface Trade {
  date: string;
  pnl: number;
  symbol: string;
  side: "Long" | "Short";
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function getPnLCellClass(pnl: number, hasTrades: boolean): string {
  if (!hasTrades) {
    return "bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500";
  }
  if (pnl < 0) {
    return "bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 p-1.5 flex flex-col justify-between shadow-sm";
  }
  const absPnl = Math.abs(pnl);
  if (absPnl >= 5000) {
    return "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 p-1.5 flex flex-col justify-between shadow-sm";
  }
  if (absPnl >= 1000) {
    return "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 p-1.5 flex flex-col justify-between shadow-sm";
  }
  return "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-blue-950 dark:text-blue-100 p-1.5 flex flex-col justify-between";
}

export default function Calendar({ trades = [] }: { trades: Trade[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const prevMonth = () => setCurrentMonth((m) => (m === 0 ? 11 : m - 1));
  const nextMonth = () => setCurrentMonth((m) => (m === 11 ? 0 : m + 1));

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentMonth, currentYear]);

  const firstDayOfMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentMonth, currentYear]);

  const weeks = useMemo(() => {
    const weeksArr: (number | null)[][] = [];
    let week: (number | null)[] = Array(firstDayOfMonth).fill(null);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = (firstDayOfMonth + day - 1) % 7;
      if (dayOfWeek === 0 && week.length > 0) {
        weeksArr.push(week);
        week = [];
      }
      week.push(day);
    }
    while (week.length < 7) week.push(null);
    if (week.some(d => d !== null)) weeksArr.push(week);
    
    return weeksArr;
  }, [daysInMonth, firstDayOfMonth]);

  const getDayData = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayTrades = trades.filter((t) => t.date === dateStr);
    const pnl = dayTrades.reduce((s, t) => s + t.pnl, 0);
    return { pnl, count: dayTrades.length, trades: dayTrades };
  };

  const weeklySummaries = useMemo(() => {
    return weeks.map((week, i) => {
      const weekTrades = week.filter((d): d is number => d !== null).flatMap((day) => {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return trades.filter((t) => t.date === dateStr);
      });
      const pnl = weekTrades.reduce((s, t) => s + t.pnl, 0);
      const daysWithTrades = week.filter((d): d is number => d !== null).filter((day) => {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return trades.some((t) => t.date === dateStr);
      }).length;
      return { weekNum: i + 1, pnl, days: daysWithTrades };
    });
  }, [weeks, trades, currentYear, currentMonth]);

  const monthlyStats = useMemo(() => {
    const monthTrades = trades.filter((t) => 
      t.date.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`)
    );
    const netPnl = monthTrades.reduce((s, t) => s + t.pnl, 0);
    const winDays = new Set(monthTrades.filter(t => t.pnl > 0).map(t => t.date)).size;
    const totalTrades = monthTrades.length;
    return { netPnl, winDays, totalTrades };
  }, [trades, currentYear, currentMonth]);

  return (
    <Card className="p-6 card-shadow w-full flex flex-col justify-between relative" data-purpose="trading-calendar-card">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect height="18" rx="2" width="18" x="3" y="4" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /></svg>
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Trading Calendar</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Monthly performance matrix & trading streak log</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <button className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-slate-900 dark:text-white text-sm px-2">{MONTHS[currentMonth]} {currentYear}</span>
          <button className="p-1.5 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </button>
          <button className="px-3 py-1.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-bold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition">Today</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 py-4 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 font-bold border border-emerald-200 dark:border-emerald-800 shadow-sm flex items-center space-x-1.5">
            <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M7 17L17 7M17 7H7M17 7V17" /></svg>
            <span>MONTH NET</span>
            <span className="text-emerald-700 dark:text-emerald-300 font-black text-sm">{fmtMoney(monthlyStats.netPnl, { sign: true })}</span>
          </span>
          <span className="px-3.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 font-bold border border-purple-200 dark:border-purple-800 shadow-sm flex items-center space-x-1.5">
            <svg className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect height="12" rx="1" width="3" x="4" y="8" /><rect height="16" rx="1" width="3" x="10" y="4" /><rect height="8" rx="1" width="3" x="16" y="12" /></svg>
            <span>TRADES</span>
            <span className="text-purple-700 dark:text-purple-300 font-black text-sm">{monthlyStats.totalTrades}</span>
          </span>
          <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 font-bold border border-emerald-200 dark:border-emerald-800 shadow-sm flex items-center space-x-1.5">
            <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>
            <span>DAY WIN</span>
            <span className="text-emerald-700 dark:text-emerald-300 font-black text-sm">{Math.round((monthlyStats.winDays / Math.max(1, new Date(currentYear, currentMonth + 1, 0).getDate())) * 100)}%</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">{monthlyStats.winDays}/{new Date(currentYear, currentMonth + 1, 0).getDate()} days</span>
          </span>
          <span className="px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 font-bold border border-emerald-200 dark:border-emerald-800 shadow-sm flex items-center space-x-1.5">
            <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M7 17L17 7M17 7H7M17 7V17" /></svg>
            <span>BEST RUN</span>
            <span className="text-emerald-700 dark:text-emerald-300 font-black text-sm">3 green</span>
          </span>
        </div>
        <div className="flex items-center space-x-2 text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
          <span className="text-[11px]">LOSS</span>
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-rose-300" />
          <span className="w-2.5 h-2.5 rounded-full bg-rose-100" />
          <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-200" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-[11px]">GAIN</span>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="min-w-[920px]">
          <div className="grid grid-cols-8 text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase py-2.5 tracking-wider border-t border-slate-100 dark:border-slate-700">
            {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-8 gap-3 pt-2 text-xs">
            {weeks.map((week, w) => (
              week.map((day, d) => {
                if (day === null) {
                  return (
                    <div key={`${w}-${d}`} className="h-28 p-2.5 rounded-2xl bg-slate-50/40 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500">
                      <span className="font-bold text-slate-400 dark:text-slate-500">&#8203;</span>
                    </div>
                  );
                }
                const data = getDayData(day);
                const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

                const cellClass = getPnLCellClass(data.pnl, data.count > 0);

                return (
                  <div
                    key={`${w}-${d}`}
                    className={cn(
                      "h-28 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-700 transition-colors",
                      cellClass,
                      isToday && "bg-purple-50/40 dark:bg-purple-900/40 border-2 border-purple-600 dark:border-purple-500 ring-2 ring-purple-300/40"
                    )}
                  >
                    <div className="flex justify-between items-start">
                      <span className={cn("font-bold", isToday ? "text-purple-950 dark:text-purple-100" : "text-slate-700 dark:text-slate-200")}>
                        {day}
                      </span>
                      {data.pnl > 0 && <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                      {data.pnl < 0 && <Check className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
                    </div>
                    {data.count > 0 && (
                      <div className="mt-4 text-center">
                        <div className={cn("text-sm font-black", data.pnl >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                          {fmtMoney(data.pnl)}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{data.count} trades</div>
                        <div className="w-full flex space-x-1 mt-1.5">
                          {data.trades.slice(0, 6).map((t, i) => (
                            <span key={i} className="h-2 flex-1 rounded-sm" style={{ background: t.pnl >= 0 ? "#059669" : "#e11d48" }} />
                          ))}
                        </div>
                        <div className="text-[10px] text-mut">PR: 50%</div>
                      </div>
                    )}
                    {isToday && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-bold text-purple-950 dark:text-purple-100 bg-white/80 dark:bg-slate-800/80 px-1 rounded">TODAY</div>
                    )}
                  </div>
                );
              })
            ))}
          </div>
        </div>

        {/* Weekly Summary Column */}
        <div className="flex flex-col bg-slate-50/30 dark:bg-slate-800/30">
          {weeklySummaries.map((week, i) => (
            <div
              key={i}
              className={cn(
                "h-28 flex flex-col items-center justify-center border-b border-slate-100 dark:border-slate-700 p-1.5 text-center",
                i % 2 === 0 ? "bg-purple-50/50 dark:bg-purple-900/20 border-purple-100/50" : ""
              )}
            >
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">Week {week.weekNum}</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1">{fmtMoney(week.pnl)}</span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500">{week.days} days</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500 border border-rose-600 inline-block" /> Light P&L</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-300 border border-rose-400 inline-block" /> Medium P&L</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-200 border border-emerald-300 inline-block" /> High P&L</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-slate-200 border border-slate-300 inline-block" /> No Trades</span>
        </div>
        <span className="text-purple-900 dark:text-purple-300 font-semibold cursor-pointer hover:underline">Full Month Breakdown →</span>
      </div>
    </Card>
  );
}