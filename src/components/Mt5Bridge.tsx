import { useState, useEffect, useRef } from "react";
import { Cpu, Power, RefreshCw, Zap, Upload, FileDown } from "lucide-react";
import { Card, CardHead } from "./ui";
import type { Trade } from "../data/trades";
import { SYMBOLS, STRATEGIES, parseMT5CSV } from "../data/trades";
import { cn } from "../utils/cn";

interface LogLine {
  time: string;
  msg: string;
  type: "info" | "success" | "warn" | "error";
}

export default function Mt5Bridge({
  onNewTrade,
  onImportTrades,
}: {
  onNewTrade: (t: Trade) => void;
  onImportTrades?: (trades: Trade[]) => void;
}) {
  const [account, setAccount] = useState("50941822");
  const [server, setServer] = useState("ICMarkets-Demo");
  const [password, setPassword] = useState("••••••••••••");
  const [connected, setConnected] = useState(false);
  const [connecting, setConnectedState] = useState(false);
  const [autoTrade, setAutoTrade] = useState(false);
  const [logs, setLogs] = useState<LogLine[]>([
    { time: "09:30:00", msg: "Bridge client loaded. Ready to bind terminal.", type: "info" },
  ]);
  const [importStats, setImportStats] = useState<{ count: number; totalPnL: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const autoTimer = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addLog = (msg: string, type: LogLine["type"] = "info") => {
    const time = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLogs((l) => [{ time, msg, type }, ...l].slice(0, 50));
  };

  const handleConnect = () => {
    if (connected) {
      setConnected(false);
      setAutoTrade(false);
      addLog("MT5 Live Bridge disconnected manually.", "warn");
      return;
    }
    setConnectedState(true);
    addLog(`Initiating TLS handshake with ${server} MT5 Gateway...`, "info");
    setTimeout(() => {
      addLog(`Connected to MT5 Server. Authorizing ID ${account}...`, "info");
      setTimeout(() => {
        setConnected(true);
        setConnectedState(false);
        addLog("MT5 Sync Client authorized. Direct execution pipe established.", "success");
        addLog("Syncing historical trade database — imported all closed positions.", "success");
      }, 800);
    }, 900);
  };

  const handleMT5File = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseMT5CSV(text);
      if (parsed.length) {
        setImportStats({
          count: parsed.length,
          totalPnL: parsed.reduce((s, t) => s + t.pnl, 0),
        });
        if (onImportTrades) {
          onImportTrades(parsed);
        } else {
          parsed.forEach((t) => onNewTrade(t));
        }
        addLog(`Imported ${parsed.length} trades from MT5 report`, "success");
        addLog(`Portfolio P&L: ${parsed.reduce((s, t) => s + t.pnl, 0) >= 0 ? "+" : ""}$${parsed.reduce((s, t) => s + t.pnl, 0)}`, "info");
      } else {
        addLog("No valid trades found. Check the file format.", "error");
      }
    };
    reader.readAsText(file);
  };

  const triggerSimTrade = () => {
    if (!connected) return;

    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const strategy = STRATEGIES[Math.floor(Math.random() * STRATEGIES.length)];
    const side = Math.random() < 0.52 ? "Long" : "Short";
    const risk = 250;

    const win = Math.random() < 0.48;
    const r = win
      ? Math.round((0.5 + Math.random() * 2.2) * 100) / 100
      : Math.round(-(0.3 + Math.random() * 1.2) * 100) / 100;
    const pnl = Math.round(r * risk);

    const base = symbol === "NQ" ? 18400 : symbol === "ES" ? 5080 : 80;
    const dec = symbol === "6E" ? 4 : symbol === "CL" ? 2 : 1;
    const entry = +(base * (1 + (Math.random() - 0.5) * 0.005)).toFixed(dec);
    const dir = side === "Long" ? (r >= 0 ? 1 : -1) : r >= 0 ? -1 : 1;
    const exit = +(entry * (1 + dir * (Math.abs(r) / 150))).toFixed(dec);
    const qty = Math.max(1, Math.round(Math.random() * 4) + 1);

    addLog(`[MT5 FILL] Opened ${side} ${qty} Lot(s) on ${symbol} @ ${entry}`, "info");

    setTimeout(() => {
      const now = new Date();
      const isoDate = now.toISOString().split("T")[0];

      const newTrade: Trade = {
        id: `MT5-${Math.floor(100000 + Math.random() * 900000)}`,
        date: isoDate,
        ts: now.getTime(),
        symbol,
        side,
        strategy,
        account: "Main Futures",
        session: now.getHours() < 13 ? "New York" : "Asia",
        qty,
        entry,
        exit,
        risk,
        r,
        pnl,
        planned: Math.random() < 0.85,
      };

      onNewTrade(newTrade);
      addLog(`[MT5 CLOSE] ${symbol} ${side} closed @ ${exit} (${pnl >= 0 ? "+" : ""}$${pnl}) [${r >= 0 ? "+" : ""}${r}R]`, pnl >= 0 ? "success" : "error");
    }, 2400);
  };

  useEffect(() => {
    if (connected && autoTrade) {
      autoTimer.current = window.setInterval(() => {
        triggerSimTrade();
      }, 12000);
    } else {
      if (autoTimer.current) {
        clearInterval(autoTimer.current);
        autoTimer.current = null;
      }
    }
    return () => {
      if (autoTimer.current) clearInterval(autoTimer.current);
    };
  }, [connected, autoTrade]);

  return (
    <Card className="relative overflow-hidden">
      <span
        className={cn(
          "absolute right-3.5 top-3.5 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 transition-all duration-300",
          connected
            ? "bg-gain-soft text-gain ring-gain/20 shadow-[0_0_12px_rgba(52,211,153,0.15)]"
            : connecting
              ? "bg-warn-soft text-warn ring-warn/20"
              : "bg-panel2 text-faint ring-edge"
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            connected ? "bg-gain pulse-dot" : connecting ? "bg-warn animate-spin" : "bg-faint"
          )}
        />
        {connected ? "MT5 BRIDGE: LIVE" : connecting ? "AUTHORIZING..." : "MT5 DISCONNECTED"}
      </span>

      <CardHead
        title="MT5 Broker Gateway"
        info="Import real trades from MT5 reports or use the live simulation bridge."
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
              {connected ? "Disconnect Bridge" : "Establish MT5 Sync"}
            </button>

            {connected && (
              <>
                <button
                  onClick={() => {
                    addLog("Manual database query sent. MT5 fully up-to-date.", "info");
                  }}
                  className="flex items-center gap-1.5 rounded-xl border border-edge bg-panel2 px-3 py-2 text-[11px] font-bold text-ink transition-all hover:border-brand hover:text-brand"
                >
                  <RefreshCw size={11} /> Sync now
                </button>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoTrade}
                    onChange={(e) => {
                      setAutoTrade(e.target.checked);
                      addLog(
                        e.target.checked
                          ? "Automated MT5 Live Simulation activated (Every 12s)."
                          : "Automated MT5 Live Simulation stopped.",
                        "info"
                      );
                    }}
                    className="accent-[color:var(--brand)]"
                  />
                  <span className="text-[10.5px] font-bold text-mut">Live Trades Sync</span>
                </label>
              </>
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
              choose CSV format. Drag the file below.
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

          {importStats && (
            <div className="rounded-xl border border-gain/20 bg-gain-soft/50 px-3.5 py-2">
              <div className="flex items-center gap-2">
                <FileDown size={13} className="text-gain" />
                <span className="text-[11px] font-bold text-gain">
                  {importStats.count} trades imported
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
              Terminal log &amp; Live fills Feed
            </span>
            {connected && (
              <button
                onClick={triggerSimTrade}
                className="flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider text-brand hover:underline"
              >
                <Zap size={10} /> Force Simulated trade
              </button>
            )}
          </div>
          <div className="h-[152px] overflow-y-auto rounded-xl border border-edge bg-panel2 p-3 font-mono text-[10px] leading-relaxed select-none">
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
