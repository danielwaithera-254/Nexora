import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  LineChart,
  NotebookPen,
  BarChart3,
  Layers,
  Sparkles,
  RotateCw,
  GraduationCap,
  Bell,
  ChevronRight,
  ChevronDown,
  Settings,
  Plus,
  Sun,
  Download,
  Search,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
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
import { accountTagSet, generateOpenPositions, SEED_ACCOUNTS } from "./lib/risk";
import { fmtMoney } from "./lib/format";
import { cn } from "./utils/cn";
import { vaultGet, vaultSet } from "./lib/vault";

import {
  generateTrades,
  tradesToCSV,
  sampleCSV,
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

function JournalApp() {
  const [dark, setDark] = useState(() => localStorage.getItem("nexora-dark") === "1");
  const toggleDark = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem("nexora-dark", next ? "1" : "0");
    document.documentElement.classList.toggle("dark", next);
  };

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
  const settings = vaultGet<{ name?: string }>("settings", {});
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
  const scores = useMemo(() => {
    const rs = radarScores(k);
    return {
      profitFactor: rs.axes.find((a) => a.axis === "Profit Factor")?.value ?? 0,
      risk: rs.axes.find((a) => a.axis === "Risk Control")?.value ?? 0,
      discipline: rs.axes.find((a) => a.axis === "Discipline")?.value ?? 0,
      resilience: rs.axes.find((a) => a.axis === "Consistency")?.value ?? 0,
      winRate: rs.axes.find((a) => a.axis === "Win Rate")?.value ?? 0,
    };
  }, [k]);
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
    showToast('Sample CSV downloaded — re-import it via "Import" to see it merge', "brand");
  };

  const handleNavigate = (id: PageId) => {
    setPage(id);
  };

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        return (
          <div className="space-y-6">
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
                <BalanceCard trades={scopedTrades} balance={25000} startBalance={25000} />
                <TradesTable trades={scopedTrades} />
              </div>
              <div className="lg:col-span-7">
                <Calendar trades={scopedTrades} />
              </div>
            </div>
          </div>
        );
      case "journal":
        return <DailyJournal trades={trades} />;
      case "trades":
        return <TradesTable trades={scopedTrades} />;
      case "mt5":
        return <Mt5Bridge onReplaceTrades={importTrades} onNavigate={() => handleNavigate("trades")} />;
      case "notebook":
        return <Notebook trades={trades} />;
      case "attachments":
        return <Attachments />;
      case "reports":
        return <Reports trades={scopedTrades} />;
      case "playbooks":
        return <Playbooks trades={trades} />;
      case "progress":
        return <HeatmapCard />;
      case "replay":
        return <Replay trades={trades} />;
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
        return <Settings />;
      default:
        return <ComingSoon page={page} />;
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex" style={{ background: dark ? "var(--canvas)" : "var(--canvas)" }}>
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={handleNavigate}
        active={page}
        name={settings.name?.trim() || "Daniel"}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onMenu={() => setSidebarOpen(true)}
          dark={dark}
          onToggleDark={toggleDark}
          onInsights={() => setInsightsOpen(true)}
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

const App = () => <JournalApp />;

export default App;