import { useMemo, useState } from "react";
import { Card, CardHead } from "./ui";
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getPnLCellClass(pnl: number, hasTrades: boolean): string {
  if (!hasTrades) {
    return "bg-surface-inner/50 border-b border-r border-surface-border";
  }
  if (pnl < 0) {
    return "bg-red-50 border-b border-r border-red-200 p-1.5";
  }
  const absPnl = Math.abs(pnl);
  if (absPnl >= 5000) {
    return "bg-green-100 border-b border-r border-green-200 p-1.5";
  }
  if (absPnl >= 1000) {
    return "bg-green-50 border-b border-r border-green-100 p-1.5";
  }
  return "bg-blue-50 border-b border-r border-blue-100 p-1.5";
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
    return { pnl, count: dayTrades.length };
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

  return (
    <Card className="p-5 card-shadow flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button className="p-1 hover:bg-surface-inner rounded text-mut" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="font-bold text-ink">{MONTHS[currentMonth]} {currentYear}</h3>
          <button className="p-1 hover:bg-surface-inner rounded text-mut" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button className="text-xs bg-surface-inner px-3 py-1 rounded font-semibold text-mut">This month</button>
      </div>

      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2 text-[10px] text-mut font-semibold">
          <span>Monthly stats: <span className="text-green-500 font-bold">+$25,213</span></span>
          <span>4 days | 48 trades</span>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(7,1fr)_80px]">
        <div className="col-span-7 grid grid-cols-7 border-r border-surface-border">
          <div className="grid grid-cols-7 text-center text-[11px] font-bold text-mut uppercase py-2 bg-surface-inner border-b border-surface-border">
            {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="space-y-1">
            {weeks.map((week, w) => (
              <div key={w} className="grid grid-cols-7 gap-1">
                {week.map((day, d) => {
                  if (day === null) {
                    return (
                      <div key={`${w}-${d}`} className="h-28 bg-surface-inner/50 border-b border-r border-surface-border" />
                    );
                  }
                  const data = getDayData(day);
                  const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

                  return (
                    <div
                      key={`${w}-${d}`}
                      className={cn(
                        "h-28 border-b border-r border-surface-border relative group hover:bg-surface-inner/50 transition-colors",
                        getPnLCellClass(data.pnl, data.count > 0),
                        isToday && "ring-2 ring-purple-500"
                      )}
                    >
                      <div className="flex justify-between items-start p-1.5">
                        <span className={cn("text-xs font-bold", isToday ? "text-ink" : "text-mut")}>
                          {day}
                        </span>
                        {data.pnl > 0 && <Lock className="w-3 h-3 text-green-500" />}
                        {data.pnl < 0 && <Check className="w-3 h-3 text-red-500" />}
                      </div>
                      {data.count > 0 && (
                        <div className="mt-2 text-center p-1">
                          <div className={cn("text-sm font-bold", data.pnl >= 0 ? "text-green-600" : "text-red-500")}>
                            {fmtMoney(Math.abs(data.pnl))}
                          </div>
                          <div className="text-[8px] text-mut">{data.count} trade{data.count > 1 ? "s" : ""}</div>
                          <div className="text-[8px] text-mut">8:00 R · 0.00 T</div>
                          <div className="text-[8px] text-mut">PR: 50%</div>
                        </div>
                      )}
                      {isToday && (
                        <div className="absolute bottom-1 right-1 text-[9px] font-bold text-purple-500 bg-white/80 px-1 rounded">TODAY</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Summary Column */}
        <div className="flex flex-col bg-surface-inner/30">
          {weeklySummaries.map((week, i) => (
            <div
              key={i}
              className={cn(
                "h-28 flex flex-col items-center justify-center border-b border-surface-border p-1.5 text-center",
                i % 2 === 0 ? "bg-purple-50 border-purple-100" : ""
              )}
            >
              <span className="text-[9px] text-mut font-bold">Week {week.weekNum}</span>
              <span className="text-sm font-bold text-ink mt-1">{fmtMoney(week.pnl)}</span>
              <span className="text-[8px] text-mut">{week.days} days</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-surface-border flex flex-wrap items-center justify-between text-xs text-mut">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-green-50" style={{ border: "1px solid #a7f3d0" }} /> Light P&L</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-green-100" style={{ border: "1px solid #86efac" }} /> Medium P&L</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-green-200" style={{ border: "1px solid #4ade80" }} /> High P&L</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-50" style={{ border: "1px solid #fecaca" }} /> Drawdown</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-surface-inner" style={{ border: "1px solid var(--surface-border)" }} /> No Trades</span>
        </div>
        <span className="text-purple-600 font-semibold cursor-pointer hover:underline">Full Month Breakdown →</span>
      </div>
    </Card>
  );
}