import { useState } from "react";
import { Card } from "./ui";
import { Search, ChevronDown } from "lucide-react";
import { fmtMoney } from "../lib/format";

interface Trade {
  id: string;
  date: string;
  symbol: string;
  side: "Long" | "Short";
  strategy: string;
  account: string;
  qty: number;
  entry: number;
  exit: number;
  r: number;
  pnl: number;
}

const mockTrades: Trade[] = [
  { id: "T-0196", date: "Aug 05, 2026", symbol: "ES", side: "Long", strategy: "Pullback", account: "Main Futures", qty: 105, entry: 4773.3, exit: 5222.2, r: 1.6, pnl: 395 },
  { id: "T-0195", date: "Aug 05, 2026", symbol: "NQ", side: "Long", strategy: "Breakout", account: "Main Futures", qty: 40, entry: 18920.5, exit: 19010.0, r: 2.1, pnl: 418 },
  { id: "T-0194", date: "Aug 04, 2026", symbol: "CL", side: "Short", strategy: "Mean Reversion", account: "Funded Alpha", qty: 20, entry: 78.40, exit: 77.90, r: 1.2, pnl: 310 },
  { id: "T-0193", date: "Aug 03, 2026", symbol: "GC", side: "Long", strategy: "Trend Follow", account: "Main Futures", qty: 10, entry: 2450.0, exit: 2480.0, r: 2.5, pnl: 300 },
  { id: "T-0192", date: "Aug 02, 2026", symbol: "RTY", side: "Long", strategy: "Breakout", account: "Funded Alpha", qty: 15, entry: 2100.0, exit: 2080.0, r: -1.0, pnl: -150 },
];

export default function TradeLogTable() {
  const [search, setSearch] = useState("");
  const [sideFilter, setSideFilter] = useState("All");
  const [resultFilter, setResultFilter] = useState("All");

  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-sm overflow-hidden mb-8" data-purpose="trade-log-section">
      <div className="p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></svg>
          </div>
          <h3 className="font-bold text-slate-800 dark:text-white text-sm">Trade Log</h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbol, strategy..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:ring-purple-500 focus:border-purple-500 w-52"
            />
            <Search className="w-3.5 h-3.5 text-mut absolute left-2.5 top-2" />
          </div>
          <button className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center space-x-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <span>{sideFilter}</span>
            <ChevronDown className="w-3.5 h-3.5 text-mut" />
          </button>
          <button className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center space-x-1 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <span>{resultFilter}</span>
            <ChevronDown className="w-3.5 h-3.5 text-mut" />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-[10px] uppercase font-bold text-mut tracking-wider border-b border-slate-100 dark:border-slate-700">
            <tr>
              <th className="py-3 px-4" scope="col">Date ↓</th>
              <th className="py-3 px-4" scope="col">ID</th>
              <th className="py-3 px-4" scope="col">Symbol ⇅</th>
              <th className="py-3 px-4" scope="col">Side</th>
              <th className="py-3 px-4" scope="col">Strategy</th>
              <th className="py-3 px-4" scope="col">Account</th>
              <th className="py-3 px-4" scope="col">Qty ⇅</th>
              <th className="py-3 px-4" scope="col">Entry → Exit</th>
              <th className="py-3 px-4" scope="col">R ⇅</th>
              <th className="py-3 px-4 text-right" scope="col">Net P&L ⇅</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700 font-medium">
            {mockTrades.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                <td className="py-3.5 px-4 text-slate-800 dark:text-white font-semibold">{t.date}</td>
                <td className="py-3.5 px-4 text-mut">{t.id}</td>
                <td className="py-3.5 px-4">
                  <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                    t.symbol === "ES" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300" :
                    t.symbol === "NQ" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" :
                    t.symbol === "CL" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200" :
                    "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  }`}>
                    {t.symbol}
                  </span>
                </td>
                <td className="py-3.5 px-4">
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${
                    t.side === "Long"
                      ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                  }`}>
                    {t.side === "Long" ? "L · Long" : "S · Short"}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">{t.strategy}</td>
                <td className="py-3.5 px-4 text-mut">{t.account}</td>
                <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-white">{t.qty}</td>
                <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-mono text-[11px]">{t.entry.toLocaleString()} → {t.exit.toLocaleString()}</td>
                <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">{t.r > 0 ? "+" : ""}{t.r}R</td>
                <td className="py-3.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">{fmtMoney(t.pnl, { sign: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}