import { useState } from "react";
import { Card } from "./ui";
import { cn } from "../utils/cn";

interface Trade {
  date: string;
  symbol: string;
  pnl: number;
}

export default function TradesTable({
  trades = [],
}: { trades: Trade[] }) {
  const [activeTab, setActiveTab] = useState<"open" | "recent">("open");

  const mockOpenTrades = [
    { date: "11-12-2023", symbol: "MRD", pnl: 211.21 },
    { date: "11-12-2023", symbol: "MRD", pnl: -134.21 },
    { date: "11-12-2023", symbol: "MRD", pnl: 134.21 },
    { date: "11-12-2023", symbol: "MRD", pnl: -523.21 },
    { date: "11-12-2023", symbol: "MRD", pnl: 211.21 },
    { date: "11-12-2023", symbol: "MRD", pnl: 5.21 },
  ];

  const mockRecentTrades = [
    { date: "12-21 09:35", symbol: "NVDA", type: "CALL", pnl: 211.20 },
    { date: "12-21 11:20", symbol: "TSLA", type: "PUT", pnl: -134.50 },
    { date: "12-20 14:02", symbol: "NQ (Futures)", type: "LONG", pnl: 620.00 },
    { date: "12-19 10:15", symbol: "AAPL", type: "CALL", pnl: 340.00 },
  ];

  return (
    <Card className="card-shadow overflow-hidden">
      <div className="flex border-b border-surface-border">
        <button
          onClick={() => setActiveTab("open")}
          className={cn(
            "flex-1 py-3 text-xs font-bold",
            activeTab === "open"
              ? "border-b-2 border-purple-600 text-purple-600"
              : "text-mut hover:text-ink"
          )}
        >
          Open Positions
        </button>
        <button
          onClick={() => setActiveTab("recent")}
          className={cn(
            "flex-1 py-3 text-xs font-bold",
            activeTab === "recent"
              ? "border-b-2 border-purple-600 text-purple-600"
              : "text-mut hover:text-ink"
          )}
        >
          Recent Trades
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-inner text-mut uppercase tracking-wider font-semibold">
            <tr>
              <th className="px-4 py-2">Open Date</th>
              <th className="px-4 py-2">Symbol</th>
              <th className="px-4 py-2 text-right">Net P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {activeTab === "open" ? (
              mockOpenTrades.map((t, i) => (
                <tr key={i} className="hover:bg-surface-inner/50 transition-colors">
                  <td className="px-4 py-3 text-mut">{t.date}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{t.symbol}</td>
                  <td className="px-4 py-3 text-right font-bold" style={{ color: t.pnl >= 0 ? "#10b981" : "#ef4444" }}>
                    {t.pnl >= 0 ? "+" : ""}${Math.abs(t.pnl).toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              mockRecentTrades.map((t, i) => (
                <tr key={i} className="hover:bg-surface-inner/50 transition-colors">
                  <td className="px-4 py-3 text-mut">{t.date}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{t.symbol}</td>
                  <td className="px-4 py-3 text-right font-bold" style={{ color: t.pnl >= 0 ? "#10b981" : "#ef4444" }}>
                    {t.pnl >= 0 ? "+" : ""}${Math.abs(t.pnl).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}