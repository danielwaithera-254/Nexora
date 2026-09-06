import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  BarChart3,
  Camera,
  CheckCircle2,
  Info,
  NotebookPen,
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
import AnalyzeLosses from "./components/AnalyzeLosses";
import Accounts from "./components/Accounts";
import Risk from "./components/Risk";
import Settings from "./components/Settings";
import { Reveal, Seg, Card, CardHead, Sparkline, PnlText, ChartTip } from "./components/ui";
import { accountTagSet, generateOpenPositions, SEED_ACCOUNTS } from "./lib/risk";
import { fmtMoney, fmtPct } from "./lib/format";
import { cn } from "./utils/cn";

import {
  generateTrades,
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

const SYNCED_OPTION = "__synced__";

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
  onNavigate,
  onSelect,
  onAnalyze,
}: {
  trades: Trade[];
  bal: { date: string; balance: number }[];
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
  }, [periodTrades]);

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
      <div className="rounded-2xl bg-surface-card border border-surface-border p-5 sm:p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <h1 className="font-bold text-[22px] tracking-tight text-white sm:text-[26px]">
              {greet}, <span className="text-neon-violet">{name}</span>
            </h1>
            <p className="mt-1 text-[11px] font-semibold text-faint">{dateLabel}</p>
          </div>
          {best && best.pnl > 0 && (
            <span className="hidden items-center gap-1.5 rounded-xl bg-neon-success/10 border border-neon-success/30 px-3 py-2 text-[10.5px] font-extrabold text-neon-success sm:flex">
              <Sparkles size={12} /> Best {PERIOD_LABEL[period].toLowerCase()}: {best.symbol} +${best.pnl.toLocaleString()}
            </span>
          )}
          <div className="ml-auto sm:ml-0">
            <Seg options={[...PERIODS]} value={period} onChange={setPeriod} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TodayStat
            label={`${PERIOD_LABEL[period]} P&L`}
            value={fmtMoney(tPnl, { sign: true })}
            trend={tPnl >= 0 ? "+14.2% vs prev" : "-8.3% vs prev"}
            positive={tPnl >= 0}
            sparklineData={sparkDaily(trades.filter((t) => t.date === isoToday()))}
            sparkColor={tPnl >= 0 ? "#10B981" : "#E11D48"}
          />
          <TodayStat
            label="Win Rate"
            value={`${winRate.toFixed(1)}%`}
            trend={`${tWins}W / ${tCount - tWins}L (${tCount} total)`}
            positive={winRate >= 40}
            sparklineData={sparkDaily(trades.filter((t) => t.pnl > 0))}
            sparkColor="#C084FC"
          />
          <TodayStat
            label="Profit Factor"
            value={tPnl >= 0 ? (tPnl / Math.abs(scoped.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0)) || 1).toFixed(2) : "0.00"}
            trend={tPnl >= 0 ? "Healthy ratio" : "Needs improvement"}
            positive={tPnl >= 0}
            sparklineData={sparkDaily(trades.filter((t) => t.pnl < 0))}
            sparkColor="#E879F9"
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {bySymbol.slice(0, 3).map((s) => (
            <SymbolRow key={s.symbol} symbol={s.symbol} pnl={s.pnl} count={s.count} max={maxPnl} />
          ))}
        </div>

        {positions.length && (
          <div className="mt-4 rounded-xl bg-surface-card-hover p-4 border border-surface-border/50">
            <p className="text-[10px] font-bold uppercase tracking-wider text-faint mb-3">Open Positions</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {positions.slice(0, 4).map((p, i) => (
                <div key={i} className="flex-shrink-0 w-36 rounded-xl bg-surface-card border border-surface-border p-3">
                  <p className="font-bold text-white">{p.symbol}</p>
                  <p className={cn("tnum mt-1 font-bold", p.pnl >= 0 ? "text-neon-success" : "text-neon-danger")}>
                    {p.pnl >= 0 ? "+" : ""}{fmtMoney(p.pnl)}
                  </p>
                  <p className="text-[10px] text-faint mt-1">{p.side} · {p.r.toFixed(1)}R</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-xl bg-surface-card border border-surface-border p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-faint mb-3">Quick Actions</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button onClick={() => onNavigate("trades")} className="col-span-2 py-2.5 px-4 rounded-xl bg-surface-card border border-surface-border text-white font-medium text-sm hover:border-neon-violet/50 hover:bg-surface-card-hover transition-all flex items-center justify-center gap-2">
              <Plus size={16} /> Add Trade
            </button>
            <button onClick={() => onNavigate("journal")} className="py-2 px-3 rounded-xl bg-surface-card border border-surface-border text-white font-medium text-sm hover:border-neon-violet/50 hover:bg-surface-card-hover transition-all flex items-center justify-center gap-2">
              <span className="w-4 h-4" style={{ background: "linear-gradient(135deg, #A855F7, #EC4899)", borderRadius: "50%" }} /> Journal
            </button>
            <button onClick={() => onNavigate("reports")} className="py-2 px-3 rounded-xl bg-surface-card border border-surface-border text-white font-medium text-sm hover:border-neon-violet/50 hover:bg-surface-card-hover transition-all flex items-center justify-center gap-2">
              <BarChart3 size={16} /> Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TodayStat({
  label,
  value,
  trend,
  positive,
  sparklineData,
  sparkColor,
}: {
  label: string;
  value: string;
  trend: string;
  positive: boolean;
  sparklineData?: number[];
  sparkColor: string;
}) {
  return (
    <div className="rounded-xl bg-surface-card border border-surface-border p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-mono tracking-widest text-faint uppercase font-medium">{label}</span>
        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold", positive ? "bg-neon-success/20 text-neon-success border-neon-success/30" : "bg-neon-danger/20 text-neon-danger border-neon-danger/30")}>
          {trend}
        </span>
      </div>
      <div className="text-2xl font-mono font-bold text-white tracking-tight">{value}</div>
      <div className="mt-3 h-1.5 w-full bg-surface-border rounded-full overflow-hidden border border-surface-border/60">
        <div className="bg-gradient-to-r from-neon-purple to-neon-pink h-full rounded-full shadow-[0_0_8px_rgba(192,132,252,0.5)]" style={{ width: "72%" }} />
      </div>
      <div className="flex justify-between items-center mt-1.5 text-[9px] font-mono text-faint/70">
        <span>Target: $15K</span>
        <span>81% to goal</span>
      </div>
    </div>
  );
}

function SymbolRow({ symbol, pnl, count, max }: { symbol: string; pnl: number; count: number; max: number }) {
  return (
    <div className="rounded-xl bg-surface-card border border-surface-border p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-mono tracking-widest text-faint uppercase font-medium">{symbol}</span>
        <span className={cn("text-[11px] font-mono tracking-widest font-medium", pnl >= 0 ? "text-neon-success" : "text-neon-danger")}>
          {pnl >= 0 ? "+" : ""}{pnl.toLocaleString()}
        </span>
      </div>
      <div className="h-2 bg-surface-border rounded-full flex overflow-hidden border border-surface-border/60">
        <div className="bg-gradient-to-r from-neon-purple to-neon-pink h-full shadow-[0_0_6px_rgba(192,132,252,0.5)]" style={{ width: `${Math.min(100, (Math.abs(pnl) / Math.max(1, 1000)) * 100)}%` }} />
      </div>
      <div className="flex justify-between text-[9px] font-mono text-faint mt-1.5">
        <span>{count} trades</span>
        <span>PR: 50%</span>
      </div>
    </div>
  );
}

function JournalApp({ dark, onToggleDark, onLock }: { dark: boolean; onToggleDark: () => void; onLock: () => void }) {
  const [trades, setTrades] = useState<Trade[]>(() => {
    const raw = vaultGet<Trade[]>("trades", generateTrades());
    const seen = new Set<string>();
    const out: Trade[] = [];
    for (const t of raw) if (!seen.has(t.id)) {
      seen.add(t.id);
      out.push(t);
    }
    return out;
  });
  const [filters, setFilters] = useState<Filters>({ range: "week", strategy: "All", account: "All" });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [page, setPage] = useState<PageId>("dashboard");
  const [detail, setDetail] = useState<Trade | null>(null);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [activeAccount, setActiveAccount] = useState<string>(
    () => {
      const stored = vaultGet<{ activeAccount?: string }>("settings", {}).activeAccount ?? "";
      return stored === "All" ? "" : stored;
    }
  );
  const [accountsVersion, setAccountsVersion] = useState(0);
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
      let attached = 0;
      let added = 0;
      setTrades((prev) => {
        const map = new Map(prev.map((t) => [t.id, t]));
        for (const t of list) {
          const existing = map.get(t.id);
          if (existing) {
            if (existing.account !== accountName) {
              map.set(t.id, { ...existing, account: accountName });
              attached++;
            }
          } else {
            map.set(t.id, t);
            added++;
          }
        }
        return [...map.values()];
      });
      changeAccount(accountName);
      setFilters({ range: "ALL", strategy: "All", account: "All" });
      showToast(
        added
          ? `Imported ${added} trades into ${accountName}${attached ? `, re-attached ${attached} existing` : ""} (${sourceName})`
          : attached
            ? `Re-attached ${attached} existing trades to ${accountName} (${sourceName})`
            : `All ${list.length} trades already belong to ${accountName} (${sourceName})`,
        "gain"
      );
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
    showToast(`Retagged ${from} → ${to}`, "brand");
  }, []);

  const deleteTrades = useCallback((tags: string[]) => {
    const del = new Set(tags);
    setTrades((prev) => prev.filter((t) => !del.has(t.account)));
    const settings = vaultGet<{ name?: string; activeAccount?: string }>("settings", {});
    if (settings.activeAccount && del.has(settings.activeAccount)) {
      setActiveAccount("");
      vaultSet("settings", { ...settings, activeAccount: "" });
    }
    showToast(`Removed trades tagged ${tags.join(", ")}`, "brand");
  }, []);

  const accountOptions = useMemo(() => {
    const allAccounts = vaultGet("accounts", SEED_ACCOUNTS);
    const tagToValue = new Map<string, string>();
    const tagSets = new Map<string, Set<string>>();
    const labels = new Map<string, string>();
    for (const a of allAccounts) {
      const value = a.tradeAccount || a.name;
      const set = tagSets.get(value) ?? new Set<string>();
      accountTagSet(a).forEach((t) => {
        set.add(t);
        if (!tagToValue.has(t)) tagToValue.set(t, value);
      });
      tagSets.set(value, set);
      labels.set(value, a.name === value ? value : `${a.name} (${value})`);
    }
    const countFor = (tags: Set<string>) => trades.reduce((s, t) => s + (tags.has(t.account) ? 1 : 0), 0);
    const options: { value: string; label: string }[] = [];
    const syncedIds = vaultGet<{ syncedAccounts?: string[] }>("settings", {}).syncedAccounts ?? [];
    const syncedAccs = allAccounts.filter((a) => syncedIds.includes(a.id));
    if (syncedAccs.length >= 2) {
      const syncedTags = new Set(syncedAccs.flatMap((a) => [...accountTagSet(a)]));
      options.push({ value: SYNCED_OPTION, label: `Synced accounts (${syncedAccs.length}) · ${countFor(syncedTags)}` });
    }
    const seen = new Set<string>();
    for (const [value, tags] of tagSets) {
      seen.add(value);
      options.push({ value, label: `${labels.get(value) ?? value} · ${countFor(tags)}` });
    }
    for (const tag of [...new Set(trades.map((t) => t.account).filter(Boolean))].sort((a, b) => a.localeCompare(b))) {
      const value = tagToValue.get(tag) ?? tag;
      if (seen.has(value)) continue;
      seen.add(value);
      options.push({ value, label: `${labels.get(value) ?? value} · ${countFor(tagSets.get(value) ?? new Set([value]))}` });
    }
    return options;
  }, [accountsVersion, activeAccount, trades.length]);

  const effectiveAccount = useMemo(() => {
    if (activeAccount && accountOptions.some((o) => o.value === activeAccount)) return activeAccount;
    return accountOptions[0]?.value ?? "";
  }, [activeAccount, accountOptions]);

  const scopedTrades = useMemo(() => {
    if (!effectiveAccount) return trades;
    const accounts = vaultGet("accounts", SEED_ACCOUNTS);
    if (effectiveAccount === SYNCED_OPTION) {
      const syncedIds = vaultGet<{ syncedAccounts?: string[] }>("settings", {}).syncedAccounts ?? [];
      const sel = accounts.filter((a) => syncedIds.includes(a.id));
      const tags = new Set(sel.flatMap((a) => [...accountTagSet(a)]));
      return trades.filter((t) => tags.has(t.account));
    }
    const acc = accounts.find((a) => (a.tradeAccount || a.name) === effectiveAccount);
    const tags = acc ? accountTagSet(acc) : new Set([effectiveAccount]);
    return trades.filter((t) => tags.has(t.account));
  }, [trades, effectiveAccount, accountsVersion]);

  const { current, previous } = useMemo(() => splitByFilters(scopedTrades, filters), [scopedTrades, filters]);
  const k = useMemo(() => withRisk(computeKpis(current), current), [current]);
  const prevK = useMemo(() => (previous.length ? computeKpis(previous) : null), [previous]);
  const spark = useMemo(() => sparkDaily(current), [current]);
  const cum = useMemo(() => cumSeries(current), [current]);
  const accSettings = vaultGet<{ name?: string; customAccounts?: boolean }>("settings", {});
  const startCapital = useMemo(() => {
    const accounts = vaultGet("accounts", SEED_ACCOUNTS);
    if (effectiveAccount === SYNCED_OPTION) {
      const syncedIds = vaultGet<{ syncedAccounts?: string[] }>("settings", {}).syncedAccounts ?? [];
      const sum = accounts
        .filter((a) => syncedIds.includes(a.id))
        .reduce((s, a) => s + a.balance, 0);
      return sum || 25000;
    }
    if (effectiveAccount) {
      const match = accounts.find((a) => (a.tradeAccount || a.name) === effectiveAccount);
      if (match) return match.balance;
    }
    if (accSettings.customAccounts) return accounts.reduce((s, a) => s + a.balance, 0) || 25000;
    return 25000;
  }, [effectiveAccount, accSettings.customAccounts, accountsVersion]);
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
  };

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <CommandCenter
              trades={trades}
              bal={bal}
              onNavigate={handleNavigate}
              onSelect={setDetail}
              onAnalyze={() => setAnalyzeOpen(true)}
            />

            {/* KPI Metrics Row */}
            <KpiCards trades={scopedTrades} period={filters.range === "today" ? "today" : filters.range === "week" ? "week" : filters.range === "month" ? "month" : "all"} />

            {/* Middle Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <RadarCard elo={81} scores={scores} />
              <CumPnLCard trades={scopedTrades} />
              <HeatmapCard />
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-6">
                <BalanceCard trades={scopedTrades} balance={25000} />
                <TradesTable trades={scopedTrades} onSelect={setDetail} />
              </div>
              <div className="lg:col-span-7">
                <Calendar trades={scopedTrades} />
              </div>
            </div>
          </div>
        );
      case "journal":
        return <DailyJournal trades={trades} onSelect={setDetail} />;
      case "trades":
        return <TradesTable trades={scopedTrades} onSelect={setDetail} />;
      case "mt5":
        return <Mt5Bridge />;
      case "notebook":
        return <Notebook />;
      case "attachments":
        return <Attachments />;
      case "reports":
        return <Reports trades={scopedTrades} />;
      case "playbooks":
        return <Playbooks />;
      case "progress":
        return <HeatmapCard />;
      case "replay":
        return <Replay />;
      case "calendar":
        return <Calendar trades={scopedTrades} />;
      case "accounts":
        return (
          <Accounts
            trades={trades}
            onImportTrades={importTrades}
            onAccountsChanged={() => setAccountsVersion((v) => v + 1)}
            onRetagTrades={retagTrades}
            onDeleteTrades={deleteTrades}
          />
        );
      case "risk":
        return <Risk trades={scopedTrades} account={effectiveAccount} />;
      case "settings":
        return <Settings dark={dark} onToggleDark={onToggleDark} onLock={onLock} />;
      default:
        return <ComingSoon />;
    }
  };

  return (
    <div className="min-h-screen bg-canvas dark flex">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={handleNavigate}
        active={page}
        name={settings.name?.trim() || "Daniel"}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onMenu={() => setSidebarOpen(true)}
          dark={dark}
          onToggleDark={onToggleDark}
          onInsights={() => setInsightsOpen(true)}
          onLock={onLock}
          syncLabel={syncLabel}
          pageLabel={page}
          accounts={accountOptions}
          account={effectiveAccount}
          onAccountChange={changeAccount}
        />

        <main className="flex-1 p-6 space-y-6 overflow-y-auto">{renderPage()}</main>
      </div>

      {toast && (
        <div className={cn("fixed bottom-4 right-4 z-50 toast-in", toast.tone === "gain" ? "bg-neon-success" : toast.tone === "loss" ? "bg-neon-danger" : "bg-neon-purple")}>
          <div className="px-4 py-3 rounded-xl shadow-[var(--shadow-neon-card)] text-white font-medium flex items-center gap-2">
            {toast.msg}
          </div>
        </div>
      )}

      {detail && <TradeDetail trade={detail} onClose={() => setDetail(null)} />}
      {analyzeOpen && <AnalyzeLosses trades={trades} open={analyzeOpen} onClose={() => setAnalyzeOpen(false)} />}
      {insightsOpen && <InsightsDrawer open={insightsOpen} onClose={() => setInsightsOpen(false)} items={ins} />}
    </div>
  );
}

const App = () => <JournalApp dark={true} onToggleDark={() => {}} onLock={() => {}} />;

export default App;