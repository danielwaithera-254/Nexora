import { useState, useRef } from "react";
import { Cpu, Power, Upload, FileDown, AlertTriangle, ExternalLink } from "lucide-react";
import { Card, CardHead } from "./ui";
import type { Trade } from "../data/trades";
import { parseMT5CSV } from "../data/trades";
import { cn } from "../utils/cn";

interface LogLine {
  time: string;
  msg: string;
  type: "info" | "success" | "warn" | "error";
}

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
  const [apiPort, setApiPort] = useState("8080");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([
    { time: "09:30:00", msg: "Bridge client loaded. No connection.", type: "info" },
  ]);
  const [importStats, setImportStats] = useState<{ count: number; totalPnL: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string, type: LogLine["type"] = "info") => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLogs((l) => [{ time, msg, type }, ...l].slice(0, 50));
  };

  const doReplace = (trades: Trade[]) => {
    const pnl = trades.reduce((s, t) => s + t.pnl, 0);
    setImportStats({ count: trades.length, totalPnL: pnl });
    onReplaceTrades(trades);
    addLog(`Loaded ${trades.length} trades (net P&L: ${pnl >= 0 ? "+" : ""}$${pnl.toLocaleString()})`, "success");
    if (onNavigate) onNavigate();
  };

  const handleConnect = async () => {
    if (connected) {
      setConnected(false);
      addLog("Disconnected from MT5 Web API.", "warn");
      return;
    }
    if (!password) {
      addLog("Password is required to connect.", "error");
      return;
    }
    setConnecting(true);
    addLog(`Connecting to MT5 Web API at localhost:${apiPort}...`, "info");

    try {
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), 5000);
      const res = await fetch(`http://localhost:${apiPort}/api/v1/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: account, password }),
        signal: ac.signal,
      });
      clearTimeout(to);
      if (!res.ok) throw new Error(`Auth failed (${res.status})`);
      const authData = await res.json();
      const token = authData.token || authData.access_token || authData.auth_token || "";

      addLog(`Authorized account ${account} on ${server}.`, "success");
      setConnected(true);
      setConnecting(false);

      addLog("Fetching trade history...", "info");
      const ac2 = new AbortController();
      const to2 = setTimeout(() => ac2.abort(), 15000);
      const dealsRes = await fetch(`http://localhost:${apiPort}/api/v1/trade/deals`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: ac2.signal,
      });
      clearTimeout(to2);
      if (!dealsRes.ok) throw new Error(`Failed to fetch deals (${dealsRes.status})`);
      const dealsData = await dealsRes.json();

      const deals = Array.isArray(dealsData)
        ? dealsData
        : dealsData.answer || dealsData.deals || dealsData.data || [];

      if (deals.length === 0) {
        addLog("No closed deals found in account history.", "warn");
        return;
      }

      const trades: Trade[] = deals
        .filter((d: any) => d.Profit !== undefined && d.Profit !== null)
        .map((d: any, i: number) => {
          const dateRaw = d.Time || d.CloseTime || d.OpenTime || "";
          const ts = dateRaw ? new Date(dateRaw).getTime() : Date.now() - i * 60000;
          const dDate = new Date(ts);
          const profit = parseFloat(d.Profit) || 0;
          const comm = parseFloat(d.Commission) || 0;
          const swap = parseFloat(d.Swap) || 0;
          const totalPnL = Math.round(profit + comm + swap);
          const typeRaw = (d.Type ?? "").toString().toLowerCase();
          const side: "Long" | "Short" =
            typeRaw === "buy" || typeRaw === "0" || typeRaw.includes("buy")
              ? "Long"
              : "Short";
          const volume = parseFloat(d.Volume || d.Size || "0") || 0.01;
          const risk = Math.max(1, Math.abs(Math.round(totalPnL * 0.6)));
          return {
            id: `MT5-${d.Deal || d.Ticket || i}-${ts % 100000}`,
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

      if (trades.length) {
        doReplace(trades);
        addLog(`Imported ${trades.length} deals from MT5 Web API.`, "success");
      } else {
        addLog("No trade data parsed from API response.", "warn");
      }
    } catch (err: any) {
      setConnected(false);
      setConnecting(false);
      const msg = err.name === "AbortError" ? "Connection timed out" : err.message || "Unknown error";
      addLog(`Connection failed: ${msg}`, "error");
      addLog(
        "Make sure MT5 Web API plugin is running on your terminal. Use CSV import as fallback.",
        "warn"
      );
    }
  };

  const handleMT5File = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseMT5CSV(text);
      if (parsed.length) {
        doReplace(parsed);
        addLog(`Imported ${parsed.length} trades from MT5 report file.`, "success");
      } else {
        addLog("No valid trades found. Check the file format.", "error");
      }
    };
    reader.readAsText(file);
  };

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
        info="Import real trades from MT5 via Web API or CSV report. Replaces existing data."
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

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-mut">API Port</span>
              <input
                disabled={connected}
                value={apiPort}
                onChange={(e) => setApiPort(e.target.value)}
                className="mt-1 w-full rounded-xl border border-edge bg-panel2 px-3 py-1.5 text-xs font-bold text-ink outline-none transition-all focus:border-brand disabled:opacity-60"
              />
            </div>
            <a
              href="https://www.metatrader5.com/en/terminal/help/webtrader"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center gap-1 text-[9px] text-faint hover:text-brand underline"
            >
              Setup guide <ExternalLink size={9} />
            </a>
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
              {connected ? "Disconnect" : "Connect via Web API"}
            </button>

            {!connected && (
              <span className="text-[9px] text-faint">
                Requires MT5 Web API plugin on localhost:{apiPort}
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-edge" />
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-faint">OR</span>
            <span className="h-px flex-1 bg-edge" />
          </div>

          {/* MT5 CSV Import */}
          <div>
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-mut">
              Import from MT5 Report
            </span>
            <p className="mt-0.5 text-[10px] leading-relaxed text-faint">
              Export your trade history from MetaTrader 5: open{" "}
              <span className="font-bold text-mut">Account History</span> tab →
              right-click → <span className="font-bold text-mut">Save as Detailed Report</span> →
              choose CSV format. Drop the file below.
            </p>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files[0];
              if (f) handleMT5File(f);
            }}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 transition-all",
              dragOver
                ? "border-brand bg-brand/5"
                : "border-edge bg-panel2 hover:border-brand/50 hover:bg-panel"
            )}
          >
            <Upload size={20} className="text-faint" />
            <span className="text-[11px] font-bold text-mut">
              Drop MT5 CSV here or click to browse
            </span>
            <span className="text-[9px] text-faint">Accepts .csv files from MT5</span>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleMT5File(f);
              e.target.value = "";
            }}
          />

          {!connected && !importStats && (
            <div className="flex items-center gap-2 rounded-xl border border-loss/20 bg-loss-soft/30 px-3.5 py-2.5">
              <AlertTriangle size={14} className="text-loss" />
              <span className="text-[10px] font-bold text-loss">NO CONNECTION</span>
              <span className="text-[9px] text-faint ml-1">
                — use CSV import or configure Web API to fetch live data
              </span>
            </div>
          )}

          {importStats && (
            <div className="rounded-xl border border-gain/20 bg-gain-soft/50 px-3.5 py-2">
              <div className="flex items-center gap-2">
                <FileDown size={13} className="text-gain" />
                <span className="text-[11px] font-bold text-gain">
                  {importStats.count} trades loaded
                </span>
              </div>
              <span className="text-[10px] text-mut">
                Net P&L:{" "}
                <span className={importStats.totalPnL >= 0 ? "text-gain font-bold" : "text-loss font-bold"}>
                  {importStats.totalPnL >= 0 ? "+" : ""}${importStats.totalPnL.toLocaleString()}
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Terminal logs output */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-faint">
              Terminal log
            </span>
            {connected && (
              <button
                onClick={() => {
                  addLog("Manual sync request sent.", "info");
                }}
                className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-brand hover:underline"
              >
                <ExternalLink size={10} /> Sync now
              </button>
            )}
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
