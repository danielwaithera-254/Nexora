import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, Upload } from "lucide-react";
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
import ComingSoon from "./components/ComingSoon";
import Mt5Bridge from "./components/Mt5Bridge";
import { Reveal } from "./components/ui";
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
import { cn } from "./utils/cn";

type PageId =
  | "dashboard"
  | "journal"
  | "trades"
  | "mt5"
  | "notebook"
  | "playbooks"
  | "progress"
  | "replay"
  | "resources";

interface Toast {
  msg: string;
  tone: "gain" | "loss" | "brand";
}

export default function App() {
  const [trades, setTrades] = useState<Trade[]>(() => generateTrades());
  const [filters, setFilters] = useState<Filters>({ range: "90D", strategy: "All", account: "All" });
  const [dark, setDark] = useState(() => localStorage.getItem("nexora-dark") === "1");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [page, setPage] = useState<PageId>("dashboard");
  const [toast, setToast] = useState<Toast | null>(null);
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
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("nexora-dark", dark ? "1" : "0");
  }, [dark]);

  const showToast = (msg: string, tone: Toast["tone"] = "brand") => {
    window.clearTimeout(toastTimer.current);
    setToast({ msg, tone });
    toastTimer.current = window.setTimeout(() => setToast(null), 3200);
  };

  const { current, previous } = useMemo(() => splitByFilters(trades, filters), [trades, filters]);
  const k = useMemo(() => withRisk(computeKpis(current), current), [current]);
  const prevK = useMemo(() => (previous.length ? computeKpis(previous) : null), [previous]);
  const spark = useMemo(() => sparkDaily(current), [current]);
  const cum = useMemo(() => cumSeries(current), [current]);
  const bal = useMemo(() => balanceSeries(current), [current]);
  const wd = useMemo(() => weekdaySeries(current), [current]);
  const donut = useMemo(() => donutData(k), [k]);
  const scores = useMemo(() => radarScores(k), [k]);
  const ins = useMemo(() => insights(current, k), [current, k]);
  const calTrades = useMemo(
    () =>
      trades.filter(
        (t) =>
          (filters.strategy === "All" || t.strategy === filters.strategy) &&
          (filters.account === "All" || t.account === filters.account)
      ),
    [trades, filters.strategy, filters.account]
  );

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const { trades, report } = parseImportFile(String(reader.result ?? ""));
      if (trades.length) {
        setTrades((t) => [...t, ...trades]);
        const acc = report?.accountNum ? ` · account ${report.accountNum}` : "";
        showToast(`Imported ${trades.length} trades from ${file.name}${acc}`, "gain");
      } else {
        showToast(
          "No valid rows found — expected an MT5 detailed report, MT5 export or date,symbol,side,pnl… CSV",
          "loss"
        );
      }
    };
    reader.readAsText(file);
  }, []);

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
              <ControlBar
                filters={filters}
                onChange={(f) => setFilters((prev) => ({ ...prev, ...f }))}
                strategies={[...STRATEGIES]}
                accounts={[...ACCOUNTS]}
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
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
              <Reveal delay={80} className="h-[320px] lg:col-span-5 lg:h-[420px]">
                <BalanceCard data={bal} />
              </Reveal>
              <Reveal delay={120} className="lg:col-span-7">
                <Calendar trades={calTrades} />
              </Reveal>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <Reveal delay={80} className="h-[330px] lg:col-span-4 lg:h-[340px]">
                <DonutCard data={donut} winRate={k.winRate} />
              </Reveal>
              <Reveal delay={120} className="h-[330px] lg:col-span-8 lg:h-[340px]">
                <WeekdayBarCard data={wd} />
              </Reveal>
            </div>
            <Reveal delay={80}>
              <TradesTable trades={current} />
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
                accounts={[...ACCOUNTS]}
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
                accounts={[...ACCOUNTS]}
                onImport={() => fileRef.current?.click()}
                onExport={handleExport}
                onSample={handleSample}
                count={current.length}
              />
            </Reveal>
            <Reveal delay={60}>
              <TradesTable trades={current} />
            </Reveal>
          </>
        );
      case "notebook":
        return (
          <Reveal>
            <Notebook trades={current} />
          </Reveal>
        );
      case "playbooks":
      case "progress":
      case "replay":
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
    playbooks: "Playbooks",
    progress: "Progress Tracker",
    replay: "Trade Replay",
    resources: "Resource Center",
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={handleNavigate}
        onAddTrade={() => fileRef.current?.click()}
        active={page}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          onMenu={() => setSidebarOpen(true)}
          dark={dark}
          onToggleDark={() => setDark((d) => !d)}
          onInsights={() => setInsightsOpen(true)}
          syncLabel={syncLabel}
          pageLabel={pageTitle[page]}
        />

        <main className="mx-auto w-full max-w-[1520px] flex-1 space-y-4 p-4 sm:p-5">{renderPage()}</main>

        <footer className="mx-auto w-full max-w-[1520px] px-4 pb-4 text-[10.5px] text-faint sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Nexora · journal analytics for futures &amp; FX traders · data is simulated, CSV import/export is live
            </span>
            <span className="tnum">
              {trades.length} trades on file · {current.length} in view
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
    </div>
  );
}
