import { useState, useEffect } from "react";
import { Cpu, Power, FileDown, RefreshCw, AlertTriangle, Terminal } from "lucide-react";
import { Card, CardHead } from "./ui";
import type { Trade, MT5Report } from "../data/trades";
import { cn } from "../utils/cn";

interface LogLine {
  time: string;
  msg: string;
  type: "info" | "success" | "warn" | "error";
}

const DEFAULT_PORT = 8765;

export default function Mt5Bridge({
  onReplaceTrades,
  onNavigate,
}: {
  onReplaceTrades: (trades: Trade[]) => void;
  onNavigate?: () => void;
}) {
  const [account, setAccount] = useState("50941822");
  const [server, setServer] = useState("ICMarkets-Demo");
  const [password, setPassword] = useState("");
  const [apiPort, setApiPort] = useState(String(DEFAULT_PORT));
  const [daysBack, setDaysBack] = useState("365");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [accountInfo, setAccountInfo] = useState<{ balance?: number; equity?: number; currency?: string } | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([
    { time: "09:30:00", msg: "Bridge client loaded. No connection.", type: "info" },
  ]);
  const [importStats, setImportStats] = useState<{
    count: number;
    totalPnL: number;
    account?: string;
    profitFactor?: string;
    totalTrades?: string;
    sharpe?: string;
  } | null>(null);

  const base = `http://localhost:${apiPort}`;

  const addLog = (msg: string, type: LogLine["type"] = "info") => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLogs((l) => [{ time, msg, type }, ...l].slice(0, 50));
  };

  const doReplace = (trades: Trade[], report?: MT5Report | null) => {
    const pnl = trades.reduce((s, t) => s + t.pnl, 0);
    const r = report?.results ?? {};
    setImportStats({
      count: trades.length,
      totalPnL: pnl,
      account: report?.accountNum || undefined,
      profitFactor: r["profit factor"] && r["profit factor"] !== "" ? r["profit factor"] : undefined,
      totalTrades: r["total trades"] || undefined,
      sharpe: r["sharpe ratio"] || undefined,
    });
    onReplaceTrades(trades);
    addLog(`Loaded ${trades.length} trades (net P&L: ${pnl >= 0 ? "+" : ""}$${pnl.toLocaleString()})`, "success");
    if (onNavigate) onNavigate();
  };

  const fetchTrades = async () => {
    addLog("Fetching closed trade history...", "info");
    const res = await fetch(`${base}/api/trades?days_back=${parseInt(daysBack) || 365}`, {
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || `HTTP ${res.status}`);
    return (data.trades || []) as any[];
  };

  const mapDeals = (deals: any[]): Trade[] =>
    deals
      .filter((d) => d.Profit !== undefined && d.Profit !== null)
      .map((d: any, i: number) => {
        const dateRaw = d.Time || d.OpenTime || d.CloseTime || "";
        const ts = dateRaw ? new Date(dateRaw).getTime() : Date.now() - i * 60000;
        const dDate = new Date(ts);
        const profit = parseFloat(d.Profit) || 0;
        const comm = parseFloat(d.Commission) || 0;
        const swap = parseFloat(d.Swap) || 0;
        const totalPnL = Math.round((profit + comm + swap) * 100) / 100;

        const sideRaw = (d.Side ?? d.Type ?? "").toString().toLowerCase();
        let side: "Long" | "Short";
        if (sideRaw === "long") side = "Long";
        else if (sideRaw === "short") side = "Short";
        else side = sideRaw === "buy" || sideRaw === "0" || sideRaw.includes("buy") ? "Long" : "Short";

        const volume = parseFloat(d.Volume || d.Size || "0") || 0.01;
        const risk = Math.max(1, Math.abs(Math.round(totalPnL * 0.6)));
        return {
          id: `MT5-${d.Deal ?? d.Ticket ?? i}-${ts % 100000}`,
          date: `${dDate.getFullYear()}-${String(dDate.getMonth() + 1).padStart(2, "0")}-${String(dDate.getDate()).padStart(2, "0")}`,
          ts,
          symbol: (d.Symbol || "").toUpperCase() || "UNKNOWN",
          side,
          strategy: "Imported",
          account: "MT5",
          session: dDate.getHours() < 12 ? "New York" : dDate.getHours() < 18 ? "London" : "Asia",
          qty: volume,
          entry: parseFloat(d.EntryPrice || d.OpenPrice || d.Price || "0") || 0,
          exit: parseFloat(d.ClosePrice || d.Price || "0") || 0,
          risk,
          r: risk > 0 ? Math.round((totalPnL / risk) * 100) / 100 : 0,
          pnl: totalPnL,
          planned: false,
        };
      });

  const handleConnect = async () => {
    if (connected) {
      setConnected(false);
      setAccountInfo(null);
      try { await fetch(`${base}/api/disconnect`, { method: "POST" }); } catch { /* ignore */ }
      addLog("Disconnected from MT5 bridge.", "warn");
      return;
    }
    if (!account || !password) {
      addLog("Account ID and password are required to connect.", "error");
      return;
    }
    setConnecting(true);
    addLog(`Connecting to MT5 bridge at localhost:${apiPort}...`, "info");

    try {
      const res = await fetch(`${base}/api/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: account, password, server }),
        signal: AbortSignal.timeout(10000),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data?.error || `HTTP ${res.status}`);
      setConnected(true);
      setAccountInfo(data);
      addLog(`Connected to account ${data.account} (${data.server}).`, "success");

      const deals = await fetchTrades();
      if (deals.length) {
        doReplace(mapDeals(deals));
        addLog(`Imported ${deals.length} closed positions from MT5.`, "success");
      } else {
        addLog("No closed positions found in the selected range.", "warn");
      }
      setConnecting(false);
    } catch (err: any) {
      setConnected(false);
      setConnecting(false);
      const msg = err.name === "AbortError" ? "Connection timed out" : err.message || "Unknown error";
      addLog(`Connection failed: ${msg}`, "error");
      addLog("Is the Nexora bridge server running? Run: python server/mt5_server.py", "warn");
      addLog("CSV import below works without the server.", "warn");
    }
  };

  const handleResync = async () => {
    if (!connected) return;
    try {
      const deals = await fetchTrades();
      if (deals.length) {
        doReplace(mapDeals(deals));
        addLog(`Resynced ${deals.length} trades from MT5.`, "success");
      } else {
        addLog("No closed positions in range. Nothing changed.", "warn");
      }
    } catch (err: any) {
      addLog(`Sync failed: ${err.message}`, "error");
    }
  };

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(1500) });
        const data = await res.json();
        if (res.ok) {
          if (data.connected && data.account) {
            setConnected(true);
            addLog(`Bridge alive. Connected to account ${data.account} on ${data.server}.`, "success");
          }
        }
      } catch { /* server not running */ }
    };
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="relative overflow-hidden">
      <span
        className={cn(
          "absolute right-3.5 top-3.5 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 transition-all duration-300",
          connected
            ? "bg-gain-soft text-gain ring-gain/20 shadow-[0_0_12px_rgba(52,211,153,0.15)]"
            : connecting
              ? "bg-warn-soft text-warn ring-warn/20"
              : "bg-loss-soft text-loss ring-loss/20"
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            connected ? "bg-gain pulse-dot" : connecting ? "bg-warn animate-spin" : "bg-loss"
          )}
        />
        {connected ? "CONNECTED" : connecting ? "CONNECTING..." : "NO CONNECTION"}
      </span>

      <CardHead
        title="MT5 Broker Gateway"
        info="Connect to MetaTrader 5 through the local Python bridge server and pull real closed trades."
        icon={<Cpu size={14} />}
      />

      <div className="grid grid-cols-1 gap-5 px-5 pb-5 pt-3 lg:grid-cols-12">
        {/* Connection Form */}
        <div className="space-y-3.5 lg:col-span-5">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <div>
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-mut">Account ID</span>
              <input
                disabled={connected}
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-edge bg-panel2 px-3 py-1.5 text-xs font-bold text-ink outline-none transition-all focus:border-brand disabled:opacity-60"
              />
            </div>
            <div>
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-mut">Broker Server</span>
              <input
                disabled={connected}
                value={server}
                onChange={(e) => setServer(e.target.value)}
                className="mt-1 w-full rounded-xl border border-edge bg-panel2 px-3 py-1.5 text-xs font-bold text-ink outline-none transition-all focus:border-brand disabled:opacity-60"
              />
            </div>
            <div>
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-mut">Password</span>
              <input
                type="password"
                disabled={connected}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter MT5 password"
                className="mt-1 w-full rounded-xl border border-edge bg-panel2 px-3 py-1.5 text-xs font-bold text-ink outline-none transition-all focus:border-brand disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-mut">Bridge Port</span>
              <input
                disabled={connected}
                value={apiPort}
                onChange={(e) => setApiPort(e.target.value)}
                className="mt-1 w-full rounded-xl border border-edge bg-panel2 px-3 py-1.5 text-xs font-bold text-ink outline-none transition-all focus:border-brand disabled:opacity-60"
              />
            </div>
            <div>
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-mut">Days back</span>
              <input
                disabled={connected}
                value={daysBack}
                onChange={(e) => setDaysBack(e.target.value)}
                className="mt-1 w-full rounded-xl border border-edge bg-panel2 px-3 py-1.5 text-xs font-bold text-ink outline-none transition-all focus:border-brand disabled:opacity-60"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={handleConnect}
              disabled={connecting}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-bold shadow-sm transition-all active:scale-95",
                connected
                  ? "bg-loss text-white hover:brightness-110"
                  : "brand-gradient text-white hover:shadow-[var(--shadow)]"
              )}
            >
              <Power size={12} strokeWidth={2.5} />
              {connected ? "Disconnect" : "Connect to MT5"}
            </button>

            {connected && (
              <button
                onClick={handleResync}
                className="flex items-center gap-1.5 rounded-xl border border-edge bg-panel2 px-3 py-2 text-[11px] font-bold text-ink transition-all hover:border-brand hover:text-brand"
              >
                <RefreshCw size={11} /> Resync
              </button>
            )}
          </div>

          {accountInfo && (
            <div className="rounded-xl border border-gain/20 bg-gain-soft/40 px-3.5 py-2">
              <span className="text-[10px] text-mut">
                Account {accountInfo.balance?.toLocaleString()} {accountInfo.currency}
                {accountInfo.equity ? ` · Equity ${accountInfo.equity.toLocaleString()}` : ""}
              </span>
            </div>
          )}

          {/* Bridge setup note */}
          {!connected && (
            <div className="rounded-xl border border-edge bg-panel2 px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <Terminal size={13} className="text-brand" />
                <span className="text-[10px] font-bold text-mut">Run the Python bridge first</span>
              </div>
              <pre className="mt-1.5 overflow-x-auto rounded-lg bg-surface px-2.5 py-2 text-[9px] text-ink font-mono">
{`cd server
pip install -r requirements.txt
python mt5_server.py`}
              </pre>
              <span className="mt-1 block text-[9px] text-faint">
                Requires MetaTrader 5 terminal installed on this machine.
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-edge" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-faint">OR</span>
            <span className="h-px flex-1 bg-edge" />
          </div>

          {/* CSV imports now live on the Accounts page */}
          <div className="rounded-xl border border-edge bg-panel2 px-3.5 py-2.5">
            <p className="text-[10px] leading-relaxed text-faint">
              Importing trade history from a CSV happens per account — go to the{" "}
              <span className="font-bold text-mut">Accounts</span> page, choose an account and use its upload icon. Trades
              from a CSV always belong to that account.
            </p>
          </div>

          {!connected && !importStats && (
            <div className="flex items-center gap-2 rounded-xl border border-loss/20 bg-loss-soft/30 px-3.5 py-2.5">
              <AlertTriangle size={14} className="text-loss" />
              <span className="text-[10px] font-bold text-loss">NO CONNECTION</span>
              <span className="text-[9px] text-faint ml-1">
                — start the bridge to pull live history
              </span>
            </div>
          )}

          {importStats && (
            <div className="rounded-xl border border-gain/20 bg-gain-soft/50 px-3.5 py-2">
              <div className="flex items-center gap-2">
                <FileDown size={13} className="text-gain" />
                <span className="text-[11px] font-bold text-gain">
                  {importStats.count} trades loaded{importStats.account ? ` · Account ${importStats.account}` : ""}
                </span>
              </div>
              <span className="text-[10px] text-mut">
                Net P&L:{" "}
                <span className={importStats.totalPnL >= 0 ? "text-gain font-bold" : "text-loss font-bold"}>
                  {importStats.totalPnL >= 0 ? "+" : ""}${importStats.totalPnL.toLocaleString()}
                </span>
              </span>
              {(importStats.totalTrades || importStats.profitFactor || importStats.sharpe) && (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[9.5px] text-mut">
                  {importStats.totalTrades && (
                    <span>Total trades (report): <b className="text-ink">{importStats.totalTrades}</b></span>
                  )}
                  {importStats.profitFactor && (
                    <span>Profit factor: <b className="text-ink">{importStats.profitFactor}</b></span>
                  )}
                  {importStats.sharpe && (
                    <span>Sharpe: <b className="text-ink">{importStats.sharpe}</b></span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Terminal logs output */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-faint">
              Bridge terminal log
            </span>
            <button
              onClick={() => addLog("Log cleared.", "info")}
              className="text-[9.5px] font-bold uppercase tracking-wider text-faint hover:text-brand"
            >
              Clear
            </button>
          </div>
          <div className="h-[200px] overflow-y-auto rounded-xl border border-edge bg-panel2 p-3 font-mono text-[10px] leading-relaxed select-none">
            {logs.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-faint">{l.time}</span>
                <span
                  className={cn(
                    "flex-1",
                    l.type === "success"
                      ? "text-gain"
                      : l.type === "error"
                        ? "text-loss"
                        : l.type === "warn"
                          ? "text-brand"
                          : "text-mut"
                  )}
                >
                  {l.msg}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}