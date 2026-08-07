import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  BarChart3,
  Camera,
  CheckCircle2,
  Info,
  NotebookPen,
  Plus,
  Sparkles,
  Upload,
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import ControlBar from "./components/ControlBar";
import KpiCards from "./components/KpiCards";
import RadarCard from "./components/charts/RadarCard";
import CumPnLCard from "./components/charts/CumPnLCard";
import HeatmapCard from "./components/charts/HeatmapCard";
import BalanceCard from "./components/charts/BalanceCard";
import DonutCard from "./components/charts/DonutCard";
import WeekdayBarCard from "./components/charts/WeekdayBarCard";
import Calendar from "./components/Calendar";
import TradesTable from "./components/TradesTable";
import InsightsDrawer from "./components/InsightsDrawer";
import DailyJournal from "./components/DailyJournal";
import Notebook from "./components/Notebook";
import Attachments from "./components/Attachments";
import Playbooks from "./components/Playbooks";
import Reports from "./components/Reports";
import Replay from "./components/Replay";
import TradeDetail from "./components/TradeDetail";
import ComingSoon from "./components/ComingSoon";
import Mt5Bridge from "./components/Mt5Bridge";
import Unlock from "./components/Unlock";
import AnalyzeLosses from "./components/AnalyzeLosses";
import Accounts from "./components/Accounts";
import Risk from "./components/Risk";
import Settings from "./components/Settings";
import { Reveal, Seg } from "./components/ui";
import { canUseVault, lockVault, migrateLegacy, trySessionUnlock, vaultExists, vaultGet, vaultSet } from "./lib/vault";
import { generateOpenPositions, SEED_ACCOUNTS } from "./lib/risk";
import { fmtMoney, fmtPct } from "./lib/format";
import { cn } from "./utils/cn";

import {
  generateTrades,
  parseImportFile,
  tradesToCSV,
  sampleCSV,
  STRATEGIES,
  ACCOUNTS,
  type Trade,
} from "./data/trades";
import {
  balanceSeries,
  computeKpis,
  cumSeries,
  donutData,
  insights,
  radarScores,
  sparkDaily,
  splitByFilters,
  weekdaySeries,
  withRisk,
  type Filters,
} from "./lib/metrics";

type PageId =
  | "dashboard"
  | "journal"
  | "trades"
  | "mt5"
  | "notebook"
  | "attachments"
  | "reports"
  | "playbooks"
  | "progress"
  | "replay"
  | "resources"
  | "calendar"
  | "accounts"
  | "risk"
  | "settings";

interface Toast {
  msg: string;
  tone: "gain" | "loss" | "brand";
}

/* ------------------- command center (dashboard hero) ------------------- */

const isoToday = () => new Date().toISOString().slice(0, 10);

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "7d" },
  { key: "month", label: "30d" },
  { key: "all", label: "All" },
] as const;
type PeriodKey = (typeof PERIODS)[number]["key"];
const PERIOD_LABEL: Record<PeriodKey, string> = {
  today: "Today",
  week: "Last 7 days",
  month: "Last 30 days",
  all: "All time",
};
const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

function CommandCenter({
  trades,
  bal,
  onImport,
  onNavigate,
  onSelect,
  onAnalyze,
}: {
  trades: Trade[];
  bal: { date: string; balance: number }[];
  onImport: () => void;
  onNavigate: (id: PageId) => void;
  onSelect: (t: Trade) => void;
  onAnalyze: () => void;
}) {
  const [period, setPeriod] = useState<PeriodKey>("today");

  const periodTrades = useMemo(() => {
    if (period === "today") return trades.filter((t) => t.date === isoToday());
    if (period === "week") return trades.filter((t) => t.date >= isoDaysAgo(6));
    if (period === "month") return trades.filter((t) => t.date >= isoDaysAgo(29));
    return trades;
  }, [trades, period]);

  const scoped = periodTrades;
  const tPnl = scoped.reduce((s, t) => s + t.pnl, 0);
  const tWins = scoped.filter((t) => t.pnl > 0).length;
  const tCount = scoped.length;
  const winRate = tCount ? (tWins / tCount) * 100 : 0;
  const best = scoped.reduce<{ pnl: number; symbol: string } | null>(
    (b, t) => (b === null || t.pnl > b.pnl ? { pnl: t.pnl, symbol: t.symbol } : b),
    null
  );

  const bySymbol = useMemo(() => {
    const m = new Map<string, { pnl: number; count: number }>();
    for (const t of scoped) {
      const e = m.get(t.symbol) ?? { pnl: 0, count: 0 };
      e.pnl += t.pnl;
      e.count++;
      m.set(t.symbol, e);
    }
    return [...m.entries()].map(([symbol, e]) => ({ symbol, ...e })).sort((a, b) => b.pnl - a.pnl);
  }, [periodTrades]); // eslint-disable-line react-hooks/exhaustive-deps

  const positions = useMemo(() => generateOpenPositions(trades), [trades]);

  const settings = vaultGet<{ name?: string }>("settings", {});
  const name = settings.name?.trim() || "Daniel";
  const hour = new Date().getHours();
  const greet = hour < 5 ? "Up late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const maxPnl = Math.max(1, ...bySymbol.map((s) => Math.abs(s.pnl)));

  return (
    <div className="space-y-4">
      {/* greeting */}
      <div className="rounded-2xl border border-edge bg-panel p-5 sm:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <h1 className="font-display text-[22px] font-bold tracking-tight text-ink sm:text-[26px]">
              {greet}, <span className="brand-text">{name}</span>
            </h1>
            <p className="mt-1 text-[11px] font-semibold text-mut">{dateLabel}</p>
          </div>
          {best && best.pnl > 0 && (
            <span className="hidden items-center gap-1.5 rounded-xl bg-gain-soft px-3 py-2 text-[10.5px] font-extrabold text-gain sm:flex">
              <Sparkles size={12} /> Best {PERIOD_LABEL[period].toLowerCase()}: {best.symbol} +${best.pnl.toLocaleString()}
            </span>
          )}
          <div className="ml-auto sm:ml-0">
            <Seg options={[...PERIODS]} value={period} onChange={setPeriod} />
          </div>
        </div>

        {/* today strip */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TodayStat
            label={`${PERIOD_LABEL[period]} P&L`}
            value={fmtMoney(tPnl, { sign: true })}
            tone={tPnl >= 0 ? "gain" : "loss"}
            sub={tCount ? `${tCount} trade${tCount > 1 ? "s" : ""} in this period` : `No trades ${period === "today" ? "today" : "in this period"}`}
          />
          <TodayStat
            label="Win rate"
            value={tCount ? fmtPct(winRate, 0) : "—"}
            tone={winRate >= 50 ? "gain" : "loss"}
            sub={`${tWins} wins · ${tCount - tWins} losses`}
          />
          <TodayStat
            label="Trades"
            value={String(tCount)}
            tone="brand"
            sub={tPnl !== 0 ? `avg ${fmtMoney(tCount ? tPnl / tCount : 0, { sign: true })} / trade` : "Flat so far"}
          />
        </div>
      </div>

      {/* equity */}
      <BalanceCard data={bal} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* period performance */}
        <div className="rounded-2xl border border-edge bg-panel p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-faint">{PERIOD_LABEL[period]} performance</p>
          {bySymbol.length === 0 ? (
            <p className="py-8 text-center text-[11px] font-bold text-faint">No trades {period === "today" ? "today" : "in this period"} — import a CSV or generate a sample to see your day.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {bySymbol.map((s) => (
                <div key={s.symbol} className="flex items-center gap-2.5">
                  <span className="w-16 shrink-0 rounded-md bg-brand-soft px-1.5 py-0.5 text-center font-display text-[11px] font-bold text-brand">
                    {s.symbol}
                  </span>
                  <div className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-edge">
                    <div
                      className={cn("h-full rounded-full", s.pnl >= 0 ? "bg-gain" : "bg-loss")}
                      style={{ width: `${(Math.abs(s.pnl) / maxPnl) * 100}%`, marginLeft: s.pnl < 0 ? "auto" : undefined }}
                    />
                  </div>
                  <span className={cn("tnum w-16 shrink-0 text-right text-[11.5px] font-bold", s.pnl >= 0 ? "text-gain" : "text-loss")}>
                    {s.pnl >= 0 ? "+" : "-"}${Math.abs(s.pnl).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* current positions */}
        <div className="rounded-2xl border border-edge bg-panel p-5">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-faint">Current positions</p>
            <span className="ml-auto rounded-md bg-panel2 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wider text-faint">
              Simulated
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {positions.map((p, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-edge bg-panel2 px-3 py-2.5">
                <span className={cn("w-14 shrink-0 rounded-md px-1.5 py-0.5 text-center font-display text-[10.5px] font-bold", p.side === "Long" ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss")}>
                  {p.symbol}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-mut">{p.side}</p>
                  <p className="tnum text-[10px] font-semibold text-faint">
                    Entry {p.entry} · Now {p.current}
                  </p>
                </div>
                <span className={cn("tnum text-right text-[11.5px] font-bold", p.pnl >= 0 ? "text-gain" : "text-loss")}>
                  {p.pnl >= 0 ? "+" : "-"}${Math.abs(p.pnl).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* period activity */}
        <div className="rounded-2xl border border-edge bg-panel p-5">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-faint">{PERIOD_LABEL[period]} activity</p>
          {scoped.length === 0 ? (
            <p className="py-8 text-center text-[11px] font-bold text-faint">Nothing closed in this period.</p>
          ) : (
            <div className="mt-3 space-y-1">
              {[...scoped].reverse().slice(0, 6).map((t) => (
                <button
                  key={t.id}
                  onClick={() => onSelect(t)}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-brand-soft/40"
                >
                  <span className="w-14 shrink-0 rounded-md bg-brand-soft px-1.5 py-0.5 text-center font-display text-[10.5px] font-bold text-brand">
                    {t.symbol}
                  </span>
                  <span className={cn("w-12 shrink-0 text-[9.5px] font-extrabold uppercase", t.side === "Long" ? "text-gain" : "text-loss")}>
                    {t.side}
                  </span>
                  <span className="tnum ml-auto text-[11px] font-bold text-faint">
                    {t.r > 0 ? "+" : ""}
                    {t.r.toFixed(1)}R
                  </span>
                  <span className={cn("tnum w-16 shrink-0 text-right text-[11.5px] font-bold", t.pnl >= 0 ? "text-gain" : "text-loss")}>
                    {fmtMoney(t.pnl, { sign: true })}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <QuickAction icon={<Plus size={15} />} label="Add trade" hint="Import CSV" onClick={onImport} />
        <QuickAction icon={<Camera size={15} />} label="Screenshots" hint="Attachments" onClick={() => onNavigate("attachments")} />
        <QuickAction icon={<NotebookPen size={15} />} label="Journal" hint="Daily notes" onClick={() => onNavigate("journal")} />
        <QuickAction icon={<BarChart3 size={15} />} label="Analyze" hint="Reports" onClick={() => onNavigate("reports")} />
        <QuickAction icon={<ArrowDownRight size={15} />} label="Why did I lose?" hint="Mine your losses" onClick={onAnalyze} tone="loss" />
      </div>
    </div>
  );
}

function TodayStat({ label, value, tone, sub }: { label: string; value: string; tone: "gain" | "loss" | "brand"; sub: string }) {
  return (
    <div className="rounded-xl border border-edge bg-panel2 px-4 py-3">
      <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-faint">{label}</p>
      <p className={cn("tnum mt-1 font-display text-[24px] font-bold leading-none", tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : "text-ink")}>
        {value}
      </p>
      <p className="mt-1.5 text-[10px] font-semibold text-faint">{sub}</p>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  hint,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  onClick: () => void;
  tone?: "loss";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-2xl border bg-panel p-3.5 text-left transition-all hover:-translate-y-px hover:shadow-[var(--shadow)] active:translate-y-0 active:scale-[0.98]",
        tone === "loss" ? "border-loss/25 hover:border-loss/50" : "border-edge hover:border-brand/50"
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110",
          tone === "loss" ? "bg-loss-soft text-loss" : "brand-gradient text-white shadow-[0_6px_16px_-6px_var(--brand-ring)]"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12px] font-extrabold text-ink">{label}</span>
        <span className="block truncate text-[9.5px] font-semibold text-faint">{hint}</span>
      </span>
    </button>
  );
}

export default function App() {
  const [gate, setGate] = useState<"loading" | "create" | "unlock" | "error" | "ready">("loading");
  const [dark, setDark] = useState(() => localStorage.getItem("nexora-dark") === "1");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("nexora-dark", dark ? "1" : "0");
  }, [dark]);

  useEffect(() => {
    const boot = async () => {
      if (!canUseVault()) {
        setGate("error");
        return;
      }
      if (!vaultExists()) {
        setGate("create");
        return;
      }
      const ok = await trySessionUnlock();
      if (ok) {
        migrateLegacy();
        setGate("ready");
      } else {
        setGate("unlock");
      }
    };
    void boot();
  }, []);

  if (gate !== "ready") {
    return (
      <Unlock
        mode={gate === "error" ? "error" : gate === "create" ? "create" : "unlock"}
        dark={dark}
        onToggleDark={() => setDark((d) => !d)}
        onReady={() => {
          migrateLegacy();
          setGate("ready");
        }}
      />
    );
  }

  return <JournalApp dark={dark} onToggleDark={() => setDark((d) => !d)} onLock={() => { lockVault(); window.location.reload(); }} />;
}

function JournalApp({ dark, onToggleDark, onLock }: { dark: boolean; onToggleDark: () => void; onLock: () => void }) {
  const [trades, setTrades] = useState<Trade[]>(() => vaultGet("trades", generateTrades()));
  const [filters, setFilters] = useState<Filters>({ range: "90D", strategy: "All", account: "All" });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [page, setPage] = useState<PageId>("dashboard");
  const [detail, setDetail] = useState<Trade | null>(null);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [activeAccount, setActiveAccount] = useState<string>(
    () => vaultGet<{ activeAccount?: string }>("settings", {}).activeAccount ?? "All"
  );
  const [accountsVersion, setAccountsVersion] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number>(0);
  const [syncLabel] = useState(() =>
    new Date().toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  );

  useEffect(() => {
    vaultSet("trades", trades);
  }, [trades]);

  const showToast = (msg: string, tone: Toast["tone"] = "brand") => {
    window.clearTimeout(toastTimer.current);
    setToast({ msg, tone });
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  };

  const changeAccount = (acc: string) => {
    setActiveAccount(acc);
    const settings = vaultGet<{ name?: string; activeAccount?: string }>("settings", {});
    vaultSet("settings", { ...settings, activeAccount: acc });
  };

  const importTrades = useCallback(
    (list: Trade[], accountName: string, sourceName: string) => {
      if (!list.length) {
        showToast("No valid rows found — expected an MT5 report or date,symbol,side,pnl CSV", "loss");
        return;
      }
      setTrades((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        return [...prev, ...list.filter((t) => !seen.has(t.id))];
      });
      changeAccount(accountName);
      setFilters({ range: "ALL", strategy: "All", account: "All" });
      showToast(`Imported ${list.length} trades into ${accountName} (${sourceName})`, "gain");
    },
    []
  );

  const retagTrades = useCallback((from: string, to: string) => {
    if (from === to) return;
    setTrades((prev) => prev.map((t) => (t.account === from ? { ...t, account: to } : t)));
    const settings = vaultGet<{ name?: string; activeAccount?: string }>("settings", {});
    if (settings.activeAccount === from) {
      setActiveAccount(to);
      vaultSet("settings", { ...settings, activeAccount: to });
    }
  }, []);

  const scopedTrades = useMemo(
    () => (activeAccount === "All" ? trades : trades.filter((t) => t.account === activeAccount)),
    [trades, activeAccount]
  );
  const { current, previous } = useMemo(() => splitByFilters(scopedTrades, filters), [scopedTrades, filters]);
  const k = useMemo(() => withRisk(computeKpis(current), current), [current]);
  const prevK = useMemo(() => (previous.length ? computeKpis(previous) : null), [previous]);
  const spark = useMemo(() => sparkDaily(current), [current]);
  const cum = useMemo(() => cumSeries(current), [current]);
  const accSettings = vaultGet<{ name?: string; customAccounts?: boolean }>("settings", {});
  const startCapital = useMemo(() => {
    const accounts = vaultGet("accounts", SEED_ACCOUNTS);
    if (activeAccount !== "All") {
      const match = accounts.find((a) => (a.tradeAccount || a.name) === activeAccount);
      if (match) return match.balance;
    }
    if (accSettings.customAccounts) return accounts.reduce((s, a) => s + a.balance, 0) || 25000;
    return 25000;
  }, [activeAccount, accSettings.customAccounts]);
  const bal = useMemo(() => balanceSeries(scopedTrades, startCapital), [scopedTrades, startCapital]);
  const wd = useMemo(() => weekdaySeries(current), [current]);
  const donut = useMemo(() => donutData(k), [k]);
  const scores = useMemo(() => radarScores(k), [k]);
  const ins = useMemo(() => insights(current, k), [current, k]);
  const calTrades = useMemo(
    () =>
      scopedTrades.filter(
        (t) =>
          (filters.strategy === "All" || t.strategy === filters.strategy) &&
          (filters.account === "All" || t.account === filters.account)
      ),
    [scopedTrades, filters.strategy, filters.account]
  );

  const accountOptions = useMemo(() => {
    const linked = new Set(vaultGet("accounts", SEED_ACCOUNTS).map((a) => a.tradeAccount || a.name));
    const tags = new Set(trades.map((t) => t.account).filter(Boolean));
    const counts = new Map<string, number>();
    for (const t of trades) counts.set(t.account, (counts.get(t.account) ?? 0) + 1);
    const all = [...new Set([...linked, ...tags])].sort((a, b) => a.localeCompare(b));
    return [
      { value: "All", label: "All accounts" },
      ...all.map((n) => ({ value: n, label: `${n} · ${counts.get(n) ?? 0}` })),
    ];
  }, [accountsVersion, activeAccount, trades.length]);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const stamp = activeAccount === "All" ? undefined : activeAccount;
      const { trades, report } = parseImportFile(String(reader.result ?? ""), stamp);
      if (trades.length) {
        setTrades((t) => [...t, ...trades]);
        setFilters({ range: "ALL", strategy: "All", account: "All" });
        const acc = report?.accountNum ? ` · account ${report.accountNum}` : "";
        showToast(
          `Imported ${trades.length} trades from ${file.name}${acc}${stamp ? ` into ${stamp}` : ""}`,
          "gain"
        );
      } else {
        showToast(
          "No valid rows found — expected an MT5 detailed report, MT5 export or date,symbol,side,pnl… CSV",
          "loss"
        );
      }
    };
    reader.readAsText(file);
  }, [activeAccount]);

  /* global drag-and-drop: drop a CSV anywhere in the app to import it */
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const onDragEnter = (e: DragEvent) => {
      if (hasFiles(e)) {
        e.preventDefault();
        setDragging(true);
      }
    };
    const onDragOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer?.files?.[0];
      if (!f) return;
      if (!f.name.toLowerCase().endsWith(".csv")) {
        showToast(`Drop a CSV file — "${f.name}" isn't one`, "loss");
        return;
      }
      handleFile(f);
    };
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [handleFile]);

  const handleExport = () => {
    const csv = tradesToCSV(current);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexora-${filters.range.toLowerCase()}-${filters.strategy.toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${current.length} trades to CSV`, "brand");
  };

  const handleSample = () => {
    const blob = new Blob([sampleCSV()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexora-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Sample CSV downloaded — re-import it via “Import” to see it merge", "brand");
  };

  const handleNavigate = (id: PageId) => {
    setPage(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return (
          <>
            <Reveal>
              <CommandCenter
                trades={scopedTrades}
                bal={bal}
                onImport={() => fileRef.current?.click()}
                onNavigate={handleNavigate}
                onSelect={setDetail}
                onAnalyze={() => setAnalyzeOpen(true)}
              />
            </Reveal>
            <Reveal delay={80}>
              <ControlBar
                filters={filters}
                onChange={(f) => setFilters((prev) => ({ ...prev, ...f }))}
                strategies={[...STRATEGIES]}
                accounts={controlAccounts}
                onImport={() => fileRef.current?.click()}
                onExport={handleExport}
                onSample={handleSample}
                count={current.length}
              />
            </Reveal>
            <Reveal delay={60}>
              <KpiCards k={k} prev={prevK} spark={spark} />
            </Reveal>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <Reveal delay={80} className="lg:col-span-3 lg:h-[372px]">
                <RadarCard scores={scores} />
              </Reveal>
              <Reveal delay={120} className="h-[300px] lg:col-span-5 lg:h-[372px]">
                <CumPnLCard data={cum} />
              </Reveal>
              <Reveal delay={160} className="lg:col-span-4 lg:h-[372px]">
                <HeatmapCard trades={current} />
              </Reveal>
            </div>
            <Reveal delay={80}>
              <Calendar trades={calTrades} onSelectTrade={setDetail} showDayDetail />
            </Reveal>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <Reveal delay={80} className="h-[330px] lg:col-span-4 lg:h-[340px]">
                <DonutCard data={donut} winRate={k.winRate} />
              </Reveal>
              <Reveal delay={120} className="h-[330px] lg:col-span-8 lg:h-[340px]">
                <WeekdayBarCard data={wd} />
              </Reveal>
            </div>
            <Reveal delay={80}>
              <TradesTable trades={current} onSelect={setDetail} />
            </Reveal>
          </>
        );
      case "mt5":
        return (
          <Reveal>
            <Mt5Bridge
              onReplaceTrades={(trades) => {
                setTrades(trades);
                setFilters({ range: "ALL", strategy: "All", account: "All" });
                const pnl = trades.reduce((s, t) => s + t.pnl, 0);
                showToast(`Loaded ${trades.length} MT5 trades — net P&L: ${pnl >= 0 ? "+" : ""}$${pnl.toLocaleString()}`, "gain");
              }}
              onNavigate={() => handleNavigate("dashboard")}
            />
          </Reveal>
        );
      case "journal":
        return (
          <>
            <Reveal>
              <ControlBar
                filters={filters}
                onChange={(f) => setFilters((prev) => ({ ...prev, ...f }))}
                strategies={[...STRATEGIES]}
                accounts={controlAccounts}
                onImport={() => fileRef.current?.click()}
                onExport={handleExport}
                onSample={handleSample}
                count={current.length}
              />
            </Reveal>
            <Reveal delay={60}>
              <DailyJournal trades={current} />
            </Reveal>
          </>
        );
      case "trades":
        return (
          <>
            <Reveal>
              <ControlBar
                filters={filters}
                onChange={(f) => setFilters((prev) => ({ ...prev, ...f }))}
                strategies={[...STRATEGIES]}
                accounts={controlAccounts}
                onImport={() => fileRef.current?.click()}
                onExport={handleExport}
                onSample={handleSample}
                count={current.length}
              />
            </Reveal>
            <Reveal delay={60}>
              <TradesTable trades={current} onSelect={setDetail} />
            </Reveal>
          </>
        );
      case "notebook":
        return (
          <Reveal>
            <Notebook trades={current} />
          </Reveal>
        );
      case "attachments":
        return (
          <Reveal>
            <Attachments />
          </Reveal>
        );
      case "reports":
        return (
          <Reveal>
            <Reports trades={scopedTrades} />
          </Reveal>
        );
      case "playbooks":
        return (
          <Reveal>
            <Playbooks trades={scopedTrades} />
          </Reveal>
        );
      case "replay":
        return (
          <Reveal>
            <Replay trades={scopedTrades} />
          </Reveal>
        );
      case "calendar":
        return (
          <Reveal>
            <Calendar trades={calTrades} onSelectTrade={setDetail} showDayDetail />
          </Reveal>
        );
      case "accounts":
        return (
          <Reveal>
            <Accounts
              trades={scopedTrades}
              onImportTrades={importTrades}
              onAccountsChanged={() => setAccountsVersion((v) => v + 1)}
              onRetagTrades={retagTrades}
            />
          </Reveal>
        );
      case "risk":
        return (
          <Reveal>
            <Risk trades={scopedTrades} />
          </Reveal>
        );
      case "settings":
        return (
          <Reveal>
            <Settings />
          </Reveal>
        );
      case "progress":
      case "resources":
        return <ComingSoon page={page} />;
    }
  };

  const pageTitle: Record<PageId, string> = {
    dashboard: "Dashboard",
    journal: "Daily Journal",
    trades: "Trades",
    mt5: "MT5 Gateway",
    notebook: "Notebook",
    attachments: "Attachments",
    reports: "Analytics",
    playbooks: "Playbooks",
    progress: "Progress Tracker",
    replay: "Trade Replay",
    resources: "Resource Center",
    calendar: "Calendar",
    accounts: "Accounts",
    risk: "Risk",
    settings: "Settings",
  };

  const settingsName = vaultGet<{ name?: string }>("settings", {}).name?.trim() || "Daniel";
  const controlAccounts = useMemo(
    () => [...new Set([...ACCOUNTS, ...accountOptions.slice(1).map((o) => o.value)])],
    [accountOptions]
  );

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={handleNavigate}
        onAddTrade={() => fileRef.current?.click()}
        active={page}
        name={settingsName}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onMenu={() => setSidebarOpen(true)}
          dark={dark}
          onToggleDark={onToggleDark}
          onInsights={() => setInsightsOpen(true)}
          onLock={onLock}
          syncLabel={syncLabel}
          pageLabel={pageTitle[page]}
          accounts={accountOptions}
          account={activeAccount}
          onAccountChange={changeAccount}
        />

        <main className="mx-auto w-full max-w-[1520px] flex-1 space-y-4 p-4 sm:p-5">{renderPage()}</main>

        <footer className="mx-auto w-full max-w-[1520px] px-4 pb-4 text-[10.5px] text-faint sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Nexora · journal analytics for futures &amp; FX traders · data is simulated, CSV import/export is live
            </span>
            <span className="tnum">
              {scopedTrades.length} of {trades.length} trades · {current.length} in view
            </span>
          </div>
        </footer>
      </div>

      <InsightsDrawer open={insightsOpen} onClose={() => setInsightsOpen(false)} items={ins} />

      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />

      <div
        className={cn(
          "fixed bottom-5 right-5 z-[70] transition-all",
          toast ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        )}
      >
        {toast && (
          <div className="toast-in flex items-center gap-2.5 rounded-xl border border-edge bg-panel px-4 py-3 shadow-2xl">
            {toast.tone === "gain" ? (
              <CheckCircle2 size={16} className="text-gain" />
            ) : toast.tone === "loss" ? (
              <AlertTriangle size={16} className="text-loss" />
            ) : (
              <Info size={16} className="text-brand" />
            )}
            <span className="text-[12px] font-bold text-ink">{toast.msg}</span>
          </div>
        )}
      </div>

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-surface/70 backdrop-blur-sm">
          <div className="rounded-2xl border-2 border-dashed border-brand bg-panel px-12 py-10 text-center shadow-2xl">
            <Upload size={30} className="mx-auto text-brand" />
            <div className="mt-3 text-sm font-extrabold text-ink">
              Drop your CSV anywhere to import
            </div>
            <div className="mt-1 text-[11px] text-mut">
              MT5 detailed reports (Positions/Deals/Results), MT5 exports or Nexora journal CSVs
            </div>
          </div>
        </div>
      )}

      {detail && <TradeDetail trade={detail} onClose={() => setDetail(null)} />}
      {analyzeOpen && <AnalyzeLosses trades={trades} open={analyzeOpen} onClose={() => setAnalyzeOpen(false)} />}
    </div>
  );
}
