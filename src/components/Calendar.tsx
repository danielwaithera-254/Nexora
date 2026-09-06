import { useMemo, useState } from "react";
import { Card, CardHead } from "./ui";
import { cn } from "../utils/cn";
import { fmtMoney } from "../lib/format";

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
    return "bg-surface-inner border border-surface-border";
  }
  if (pnl < 0) {
    return "bg-[#E024C3]/15 border border-[#E024C3]/40";
  }
  const absPnl = Math.abs(pnl);
  if (absPnl >= 5000) {
    return "bg-purple-700/60 border border-purple-400";
  }
  if (absPnl >= 1000) {
    return "bg-purple-900/55 border border-purple-500/50";
  }
  return "bg-purple-900/40 border border-purple-500/35";
}

export default function Calendar({ trades = [] }: { trades: Trade[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentMonth, currentYear]);

  const firstDayOfMonth = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentMonth, currentYear]);

  const tradesByDate = useMemo(() => {
    const map = new Map<string, Trade[]>();
    trades.forEach((t) => {
      const key = t.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [trades]);

  const getDayData = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayTrades = tradesByDate.get(dateStr) || [];
    const pnl = dayTrades.reduce((s, t) => s + t.pnl, 0);
    return { pnl, count: dayTrades.length, trades: dayTrades };
  };

  const weeks = useMemo(() => {
    const result = [];
    let day = 1;
    const leadingBlanks = firstDayOfMonth;
    
    const week1 = Array.from({ length: 7 }, (_, i) => {
      if (i < leadingBlanks) return null;
      return day <= daysInMonth ? day++ : null;
    });
    result.push(week1);
    
    while (day <= daysInMonth) {
      const week = Array.from({ length: 7 }, (_, i) => {
        return day <= daysInMonth ? day++ : null;
      });
      result.push(week);
    }
    
    return result;
  }, [currentMonth, currentYear, daysInMonth, firstDayOfMonth]);

  const weeklySummaries = useMemo(() => {
    return weeks.map((week, i) => {
      const weekTrades = week.filter((d) => d !== null).flatMap((d) => {
        const data = getDayData(d!);
        return data.trades;
      });
      const pnl = weekTrades.reduce((s, t) => s + t.pnl, 0);
      const days = week.filter((d) => d !== null && getDayData(d!).count > 0).length;
      return { pnl, days, weekNum: i + 1 };
    });
  }, [weeks, tradesByDate]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  return (
    <Card className="p-5 flex flex-col" glow>
      <CardHead
        title={`${MONTHS[currentMonth]} ${currentYear}`}
        right={
          <div className="flex items-center gap-2">
            <button className="p-1 rounded hover:bg-surface-border text-faint hover:text-white transition-colors" onClick={prevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button className="p-1 rounded hover:bg-surface-border text-faint hover:text-white transition-colors" onClick={nextMonth}>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button className="px-2.5 py-1 text-xs rounded-md bg-surface-card border border-surface-border text-faint hover:border-gray-500 transition-colors">
              This month
            </button>
          </div>
        }
        icon={<CalendarDays className="w-4 h-4 text-neon-purple" />}
      />

      {/* Monthly Stats */}
      <div className="flex items-center justify-between gap-5 mb-4">
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-faint">Monthly Stats:</span>
          <span className="text-neon-success font-bold">{fmtMoney(trades.reduce((s, t) => s + t.pnl, 0))}</span>
          <span className="text-faint/60">|</span>
          <span className="text-neon-violet">{trades.filter((t) => t.pnl > 0).length} Win Days · {trades.length} Trades</span>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-[repeat(7,1fr)_85px] bg-canvas/50 text-[10px] font-mono font-bold text-faint uppercase py-2 text-center border-b border-surface-border">
        {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
        <div className="border-l border-surface-border text-neon-violet">Weekly</div>
      </div>

      {/* Calendar Grid + Weekly Column */}
      <div className="grid grid-cols-[repeat(7,1fr)_85px]">
        {/* Day Cells */}
        <div className="col-span-7 grid grid-cols-7 border-r border-surface-border">
          {weeks.map((week, w) => 
            week.map((day, d) => {
              if (day === null) {
                return (
                  <div key={`${w}-${d}`} className="h-28 bg-canvas/40 border-b border-r border-surface-border/50" />
                );
              }

              const data = getDayData(day);
              const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

              const baseClasses = "h-28 p-1.5 border-b border-r border-surface-border relative group transition-all hover:bg-surface-border/30";
              const cellClasses = getPnLCellClass(data.pnl, data.count > 0);

              const specialClasses = isToday 
                ? "ring-2 ring-neon-violet shadow-[var(--shadow-neon-pill)] bg-purple-950/30" 
                : "";

              return (
                <div 
                  key={`${w}-${d}`}
                  className={cn(baseClasses, cellClasses, specialClasses, isToday && "z-10")}
                >
                  <div className="flex justify-between items-start">
                    <span className={cn("text-[10px] font-bold", isToday ? "text-neon-violet" : "text-faint/50")}>
                      {day}
                    </span>
                    {data.pnl > 0 && <Lock className="w-3 h-3 text-neon-success/70" />}
                    {data.pnl < 0 && <Check className="w-3 h-3 text-neon-danger/60" />}
                  </div>
                  
                  {data.count > 0 && (
                    <div className="mt-2 text-center font-mono">
                      <div className={cn("text-xs font-extrabold", data.pnl >= 0 ? "text-neon-success" : "text-neon-danger")}>
                        {fmtMoney(Math.abs(data.pnl))}
                      </div>
                      <div className="text-[9px] text-faint">{data.count} trade{data.count > 1 ? "s" : ""}</div>
                      <div className="text-[8px] text-faint/70">8:00 R · 0.00 T</div>
                      <div className="text-[8px] text-neon-violet font-medium">PR: 50%</div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Weekly Summary Column */}
        <div className="flex flex-col bg-canvas/50">
          {weeklySummaries.map((week, i) => (
            <div 
              key={i}
              className={cn(
                "h-28 flex flex-col items-center justify-center border-b border-surface-border p-2 text-center",
                i % 2 === 0 ? "bg-purple-950/20 border-purple-500/20" : ""
              )}
            >
              <span className="text-[9px] text-faint uppercase tracking-wider">Week {week.weekNum}</span>
              <div className={cn("text-sm font-bold mt-1", week.pnl >= 0 ? "text-neon-success" : "text-neon-danger")}>
                {fmtMoney(week.pnl)}
              </div>
              <span className="text-[8px] text-faint/70">{week.days} days active</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Legend */}
      <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between text-xs text-faint">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-purple-900/40 border border-purple-500/35 inline-block" />
            Light P&L
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-purple-900/55 border border-purple-500/50 inline-block" />
            Medium P&L
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-purple-700/60 border border-purple-400 inline-block" />
            High P&L
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-[#E024C3]/20 border border-[#E024C3]/40 inline-block" />
            Drawdown
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-surface-inner border border-surface-border inline-block" />
            No Trades
          </span>
        </div>
        <span className="text-neon-violet font-medium cursor-pointer hover:underline">Full Month Breakdown →</span>
      </div>
    </Card>
  );
}