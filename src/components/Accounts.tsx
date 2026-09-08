import { useState } from "react";
import { Upload, Download, Trash2, FileText, Plus, BarChart3 } from "lucide-react";
import { Card, CardHead } from "./ui";
import { parseTradesCSV, sampleCSV, tradesToCSV, type Trade } from "../data/trades";
import { computeKpis, balanceSeries, dailyMap, type Kpis } from "../lib/metrics";
import { fmtMoney, fmtPct, fmtNum } from "../lib/format";
import { cn } from "../utils/cn";

interface AccountSummary {
  name: string;
  trades: number;
  netPnl: number;
  winRate: number;
  profitFactor: number;
  avgR: number;
}

function parseFile(file: File): Promise<Trade[]> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseTradesCSV(String(reader.result ?? ""));
      resolve(parsed);
    };
    reader.readAsText(file);
  });
}

function computeAccountMetrics(trades: Trade[]): { kpis: Kpis; accounts: AccountSummary[] } {
  const kpis = computeKpis(trades);
  
  const accountMap = new Map<string, Trade[]>();
  for (const t of trades) {
    const arr = accountMap.get(t.account) || [];
    arr.push(t);
    accountMap.set(t.account, arr);
  }

  const accounts: AccountSummary[] = [];
  for (const [name, trades] of accountMap) {
    const k = computeKpis(trades);
    accounts.push({
      name,
      trades: trades.length,
      netPnl: k.net,
      winRate: k.winRate,
      profitFactor: k.pf,
      avgR: k.wlRatio,
    });
  }
  accounts.sort((a, b) => b.netPnl - a.netPnl);
  
  return { kpis: computeKpis(trades), accounts };
}

export default function Accounts() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [activeAccount, setActiveAccount] = useState<string>("All");
  const [showSample, setShowSample] = useState(false);

  const { kpis, accounts } = computeAccountMetrics(trades);
  const filteredTrades = activeAccount === "All" ? trades : trades.filter(t => t.account === activeAccount);
  const filteredKpis = computeAccountMetrics(filteredTrades).kpis;
  const balance = balanceSeries(filteredTrades);
  const daily = dailyMap(filteredTrades);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const parsed = await parseFile(f);
    if (parsed.length) {
      setTrades(parsed);
      setFile(f);
    }
  };

  const handleSample = () => {
    const sample = sampleCSV();
    const blob = new Blob([sample], { type: "text/csv" });
    const parsed = parseTradesCSV(sample);
    if (parsed.length) {
      setTrades(parsed);
      setFile(new File([sample], "sample.csv", { type: "text/csv" }));
    }
  };

  const handleExport = () => {
    if (!trades.length) return;
    const csv = tradesToCSV(filteredTrades);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexora-${activeAccount.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setTrades([]);
    setFile(null);
  };

  const accountOptions = ["All", ...accounts.map(a => a.name)];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Accounts</h1>
          <p className="text-mut mt-0.5">Upload trade history CSV to analyze performance by account</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={!trades.length} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-edge bg-panel hover:bg-panel2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <Download size={14} />
            <span className="text-sm font-semibold">Export CSV</span>
          </button>
          <button onClick={handleClear} disabled={!trades.length} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-loss/30 bg-loss-soft text-loss hover:bg-loss-soft/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <Trash2 size={14} />
            <span className="text-sm font-semibold">Clear</span>
          </button>
        </div>
      </div>

      {/* Upload Zone */}
      <Card className="p-6 border-2 border-dashed border-edge2" elevated>
        <input type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" id="csv-upload" ref={null as any} />
        <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center justify-center py-8 px-4 text-center">
          <Upload className="w-12 h-12 text-mut mb-3" />
          <p className="text-lg font-semibold text-ink mb-1">Drag & drop CSV file or click to browse</p>
          <p className="text-mut text-sm">Supports: date,symbol,side,strategy,account,session,qty,entry,exit,risk,r,pnl,planned</p>
          <div className="mt-4 flex items-center gap-2">
            <button onClick={handleSample} className="px-3 py-1.5 rounded-lg border border-edge bg-panel2 text-sm font-medium text-mut hover:bg-brand-soft hover:text-brand transition-colors">
              <FileText size={14} className="inline mr-1" /> Load Sample
            </button>
          </div>
        </label>
        {file && (
          <div className="mt-4 p-3 rounded-lg bg-brand-soft border border-brand/20 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="text-brand" size={16} />
              <span className="font-medium text-brand">{file.name}</span>
              <span className="text-mut">({(file.size / 1024).toFixed(1)} KB)</span>
            </div>
          </div>
        )}
      </Card>

      {/* Account Selector + Global KPIs */}
      {trades.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-mut">Account:</span>
            <select value={activeAccount} onChange={e => setActiveAccount(e.target.value)} className="flex-1 sm:w-48 rounded-xl border border-edge bg-panel px-3 py-2 text-sm font-medium text-ink focus:border-brand focus:outline-none">
              {accountOptions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            {file && (
              <span className="text-xs text-mut px-2 py-0.5 rounded-full bg-brand-soft text-brand">
                {file.name}
              </span>
            )}
          </div>

          {/* Global KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <CardComp className="p-4 kpi-card">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-mut">Net P&L</div>
              <div className="mt-1 font-display text-2xl font-bold tnum" style={{ color: filteredKpis.net >= 0 ? "var(--gain)" : "var(--loss)" }}>
                {filteredKpis.net >= 0 ? "+" : ""}{filteredKpis.net.toLocaleString()}
              </div>
            </CardComp>
            <CardComp className="p-4 kpi-card">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-mut">Win Rate</div>
              <div className="mt-1 font-display text-2xl font-bold text-ink tnum">{filteredKpis.winRate.toFixed(1)}%</div>
            </CardComp>
            <CardComp className="p-4 kpi-card">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-mut">Profit Factor</div>
              <div className="mt-1 font-display text-2xl font-bold text-ink tnum">{filteredKpis.pf.toFixed(2)}</div>
            </CardComp>
            <CardComp className="p-4 kpi-card">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-mut">Total Trades</div>
              <div className="mt-1 font-display text-2xl font-bold text-ink tnum">{filteredTrades.length}</div>
            </CardComp>
            <CardComp className="p-4 kpi-card">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-mut">Avg R</div>
              <div className="mt-1 font-display text-2xl font-bold text-ink tnum">{filteredKpis.wlRatio.toFixed(2)}×</div>
            </CardComp>
            <CardComp className="p-4 kpi-card">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-mut">Avg Win / Loss</div>
              <div className="mt-1 font-display text-xl font-bold text-ink tnum">{filteredKpis.avgWin > 0 || filteredKpis.avgLoss > 0 ? `+${filteredKpis.avgWin.toFixed(0)} / -${filteredKpis.avgLoss.toFixed(0)}` : "—"}</div>
            </CardComp>
          </div>

          {/* Account Breakdown Table */}
          <Card className="overflow-hidden">
            <CardHead title="Account Breakdown" info="Performance metrics grouped by account" />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface border-b border-edge text-[10px] uppercase font-bold text-mut tracking-wider">
                  <tr>
                    <th className="p-3">Account</th>
                    <th className="p-3 text-right">Trades</th>
                    <th className="p-3 text-right">Net P&L</th>
                    <th className="p-3 text-right">Win Rate</th>
                    <th className="p-3 text-right">Profit Factor</th>
                    <th className="p-3 text-right">Avg R</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge">
                  {accounts.map((acc) => (
                    <tr key={acc.name} className="hover:bg-panel2 transition-colors">
                      <td className="p-3 font-medium text-ink">{acc.name}</td>
                      <td className="p-3 text-right text-mut tnum">{acc.trades}</td>
                      <td className="p-3 text-right font-bold tnum" style={{ color: acc.netPnl >= 0 ? "var(--gain)" : "var(--loss)" }}>
                        {acc.netPnl >= 0 ? "+" : ""}{acc.netPnl.toLocaleString()}
                      </td>
                      <td className="p-3 text-right tnum">{acc.winRate.toFixed(1)}%</td>
                      <td className="p-3 text-right tnum">{acc.profitFactor.toFixed(2)}</td>
                      <td className="p-3 text-right tnum">{acc.avgR.toFixed(2)}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Equity Curve */}
          <Card>
            <CardHead title="Equity Curve" info="Running account balance over time for selected account" />
            <div className="h-64 px-2 pb-3">
              <svg viewBox="0 0 600 200" className="w-full h-full" preserveAspectRatio="none">
                {(() => {
                  const series = balance.slice(-100);
                  if (!series.length) return null;
                  const max = Math.max(...series.map(s => s.balance));
                  const min = Math.min(...series.map(s => s.balance));
                  const span = max - min || 1;
                  const points = series.map((s, i) => {
                    const x = (i / Math.max(1, series.length - 1)) * 580 + 10;
                    const y = 180 - ((s.balance - min) / span) * 160;
                    return `${x},${y}`;
                  }).join(" ");
                  return (
                    <>
                      <defs>
                        <linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--gain)" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="var(--gain)" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <polyline fill="none" stroke="var(--edge2)" strokeWidth="1" points={`10,190 590,190`} />
                      <polyline fill="url(#eqFill)" points={`10,190 ${points} 590,190`} />
                      <polyline fill="none" stroke="var(--gain)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
                    </>
                  );
                })()}
              </svg>
            </div>
          </Card>

          {/* Heatmap */}
          <Card>
            <CardHead title="Daily P&L Heatmap" info="Green = profitable days, Red = losing days" />
            <div className="px-5 pb-4">
              <div className="flex gap-[4px]">
                <div className="mr-1 flex flex-col justify-between py-[1px] text-[8px] font-bold text-faint">
                  {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((d, i) => (
                    <span key={i} className="h-[16px] leading-[16px]">{d}</span>
                  ))}
                </div>
                {(() => {
                  const map = dailyMap(filteredTrades);
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const start = new Date(today);
                  start.setDate(start.getDate() - 83);
                  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
                  const wks: { key: string; inFuture: boolean }[][] = [];
                  const cur = new Date(start);
                  let mx = 1;
                  for (let w = 0; w < 12; w++) {
                    const col: { key: string; inFuture: boolean }[] = [];
                    for (let d = 0; d < 7; d++) {
                      const key = cur.toISOString().slice(0, 10);
                      const inFuture = cur.getTime() > Date.now();
                      const cell = map.get(key);
                      if (cell) mx = Math.max(mx, Math.abs(cell.pnl));
                      col.push({ key, inFuture });
                      cur.setDate(cur.getDate() + 1);
                    }
                    wks.push(col);
                  }
                  const map2 = new Map([...map]);
                  return (
                    <div className="flex gap-[4px]">
                      {wks.map((col, wi) => (
                        <div key={wi} className="flex flex-1 flex-col gap-[4px]">
                          {col.map((cell) => {
                            const rec = map2.get(cell.key);
                            const alpha = rec ? 20 + 75 * (Math.abs(rec.pnl) / Math.max(1, filteredKpis.net || 1)) : 0;
                            const bg = cell.inFuture
                              ? "transparent"
                              : rec
                                ? rec.pnl > 0
                                  ? `color-mix(in srgb, var(--gain) ${Math.min(100, alpha + 20)}%, transparent)`
                                  : rec.pnl < 0
                                    ? `color-mix(in srgb, var(--loss) ${alpha}%, transparent)`
                                    : "var(--edge2)"
                                : "var(--edge2)";
                            return (
                              <div key={cell.key} className="group relative h-[16px] flex-1">
                                <div className="h-full w-full rounded-[3px] transition-transform duration-150 group-hover:scale-110 group-hover:ring-1 group-hover:ring-brand" style={{ background: bg }} />
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="mt-3 flex items-center justify-between text-[9px] font-bold text-faint">
                <span>12 weeks ago</span>
                <div className="flex items-center gap-1">
                  <span>Less</span>
                  {[0, 25, 50, 75, 100].map((a) => (
                    <span key={a} className="h-2 w-2 rounded" style={{ background: `color-mix(in srgb, var(--gain) ${a}%, var(--edge2))` }} />
                  ))}
                  <span>More</span>
                </div>
                <span>Today</span>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}