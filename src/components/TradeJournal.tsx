import { useEffect, useMemo, useState } from "react";
import {
  NotebookPen,
  Star,
  Tags,
  Brain,
  ListChecks,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Search,
  ChevronRight,
  Save,
  Trash2,
  Sparkles,
} from "lucide-react";
import { Card, CardHead } from "./ui";
import { cn } from "../utils/cn";
import { fmtMoney } from "../lib/format";
import type { Trade } from "../data/trades";
import { vaultGet, vaultSet } from "../lib/vault";

interface JournalEntry {
  rating: number; // 1-5
  confidence: number; // 1-10
  mood: string;
  setup: string;
  setupGrade: "A" | "B" | "C" | "";
  confluence: string[];
  mistakes: string[];
  tags: string[];
  prePlan: string;
  postReview: string;
  lessons: string;
  followUp: boolean;
  screenshots: { entry: boolean; exit: boolean; htf: boolean };
  updatedAt: number;
}

type JournalMap = Record<string, JournalEntry>;

const VAULT_KEY = "nexora-trade-journal";

const MOODS = ["Calm", "Confident", "Anxious", "Frustrated", "Euphoric", "Tired", "Focused", "Revengeful"];
const MISTAKES = ["FOMO entry", "Revenge trade", "Oversized", "Moved stop", "Early exit", "Late entry", "No stop", "Overtrading", "Off-session", "Ignored plan"];
const CONFLUENCE = ["Trend align", "Key level", "Liquidity sweep", "Order block", "FVG", "VWAP", "Session open", "News avoided", "HTF bias", "Volume confirm"];
const SETUPS = ["A+ Breakout", "Pullback", "Reversal", "Range fade", "Trend continuation", "News play", "Scalp", "Custom"];

function blankEntry(): JournalEntry {
  return {
    rating: 0, confidence: 5, mood: "", setup: "", setupGrade: "",
    confluence: [], mistakes: [], tags: [],
    prePlan: "", postReview: "", lessons: "",
    followUp: false,
    screenshots: { entry: false, exit: false, htf: false },
    updatedAt: Date.now(),
  };
}

function loadJournal(): JournalMap {
  try {
    const v = vaultGet<JournalMap>(VAULT_KEY, {});
    return v && typeof v === "object" ? v : {};
  } catch { return {}; }
}

function completeness(e: JournalEntry): number {
  let got = 0; const total = 8;
  if (e.rating > 0) got++;
  if (e.setup) got++;
  if (e.prePlan.trim()) got++;
  if (e.postReview.trim()) got++;
  if (e.lessons.trim()) got++;
  if (e.mood) got++;
  if (e.tags.length) got++;
  if (e.confluence.length || e.mistakes.length) got++;
  return Math.round((got / total) * 100);
}

export default function TradeJournal({ trades }: { trades: Trade[] }) {
  const [journal, setJournal] = useState<JournalMap>(() => loadJournal());
  const [selectedId, setSelectedId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "journaled" | "unjournaled" | "followup" | "mistakes">("all");
  const [tab, setTab] = useState<"review" | "plan" | "psych">("review");
  const [savedTick, setSavedTick] = useState(0);

  useEffect(() => { try { vaultSet(VAULT_KEY, journal); } catch {} }, [journal]);

  const sorted = useMemo(() => [...trades].sort((a, b) => b.ts - a.ts), [trades]);

  const filtered = useMemo(() => sorted.filter((t) => {
    const e = journal[t.id];
    const done = e && completeness(e) >= 40;
    if (filter === "journaled" && !done) return false;
    if (filter === "unjournaled" && done) return false;
    if (filter === "followup" && !(e && e.followUp)) return false;
    if (filter === "mistakes" && !(e && e.mistakes.length)) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return [t.symbol, t.strategy, t.account, t.side, t.id].join(" ").toLowerCase().includes(q);
    }
    return true;
  }), [sorted, journal, filter, query]);

  useEffect(() => {
    if (!filtered.some((t) => t.id === selectedId)) setSelectedId(filtered[0]?.id ?? "");
  }, [filtered, selectedId]);

  const selected = filtered.find((t) => t.id === selectedId) ?? null;
  const entry: JournalEntry = selected ? (journal[selected.id] ?? blankEntry()) : blankEntry();

  const patch = (p: Partial<JournalEntry>) => {
    if (!selected) return;
    setJournal((prev) => ({ ...prev, [selected.id]: { ...(prev[selected.id] ?? blankEntry()), ...p, updatedAt: Date.now() } }));
    setSavedTick(Date.now());
  };
  const toggleList = (key: "confluence" | "mistakes" | "tags", val: string) => {
    const cur = entry[key];
    patch({ [key]: cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val] } as Partial<JournalEntry>);
  };

  const stats = useMemo(() => {
    const done = trades.filter((t) => { const e = journal[t.id]; return e && completeness(e) >= 40; }).length;
    const rated = Object.values(journal).filter((e) => e.rating > 0);
    const avgRating = rated.length ? rated.reduce((s, e) => s + e.rating, 0) / rated.length : 0;
    const followups = Object.values(journal).filter((e) => e.followUp).length;
    const mistakeCount = Object.values(journal).reduce((s, e) => s + e.mistakes.length, 0);
    return { done, total: trades.length, coverage: trades.length ? Math.round((done / trades.length) * 100) : 0, avgRating, followups, mistakeCount };
  }, [journal, trades]);

  const [tagInput, setTagInput] = useState("");

  if (!trades.length) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-xl font-bold leading-tight text-ink">Trade Journal</h1>
          <p className="text-xs text-mut">No trades yet — upload in Accounts</p>
        </div>
        <div className="rounded-2xl border-2 border-dashed border-edge bg-panel p-10 text-center">
          <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand"><NotebookPen size={18} /></div>
          <h3 className="mt-3 text-sm font-bold text-ink">Nothing to journal yet</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-mut">Upload a CSV per account and each trade will appear here ready for review, tagging, grading and lessons.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold leading-tight text-ink">Trade Journal</h1>
          <p className="text-xs text-mut">Review every execution — plan, grade, tag mistakes, capture lessons</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-panel2 p-1">
          {(["all", "journaled", "unjournaled", "followup", "mistakes"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cn("rounded-lg px-2.5 py-1.5 text-xs font-bold", filter === f ? "bg-brand text-white" : "text-mut hover:text-ink")}>
              {f === "all" ? "All" : f === "journaled" ? "Done" : f === "unjournaled" ? "Todo" : f === "followup" ? "Follow-up" : "Mistakes"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Coverage", value: `${stats.coverage}%`, sub: `${stats.done}/${stats.total} journaled`, tone: "brand" },
          { label: "Avg rating", value: stats.avgRating ? `${stats.avgRating.toFixed(1)} ★` : "—", sub: "1–5 trade grade", tone: "brand" },
          { label: "Follow-ups", value: String(stats.followups), sub: "flagged to revisit", tone: "brand" },
          { label: "Mistakes logged", value: String(stats.mistakeCount), sub: "across all reviews", tone: "loss" },
        ].map((m) => (
          <Card key={m.label} className="p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-mut">{m.label}</p>
            <p className="mt-1 font-display text-base font-bold tnum text-ink">{m.value}</p>
            <p className="mt-0.5 truncate text-[11px] text-faint">{m.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* trade list */}
        <div className="lg:col-span-4">
          <Card className="flex max-h-[720px] flex-col">
            <div className="border-b border-edge p-3">
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search symbol, strategy…" className="w-full rounded-xl border border-edge bg-panel2 py-2 pl-8 pr-3 text-xs text-ink outline-none placeholder:text-faint focus:border-brand" />
              </div>
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
              {filtered.map((t) => {
                const e = journal[t.id];
                const pct = e ? completeness(e) : 0;
                const on = t.id === selectedId;
                return (
                  <button key={t.id} onClick={() => setSelectedId(t.id)} className={cn("w-full rounded-xl border p-2.5 text-left transition-all", on ? "border-brand bg-brand-soft" : "border-edge bg-panel hover:border-brand/40")}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-md bg-brand-soft px-1.5 py-0.5 font-display text-[11px] font-bold text-brand">{t.symbol}</span>
                      <span className={cn("font-display text-sm font-bold tnum", t.pnl >= 0 ? "text-gain" : "text-loss")}>{fmtMoney(t.pnl, { sign: true })}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-mut">
                      <span>{t.date} · {t.side}</span>
                      <span className="tnum">{pct}%</span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-edge2">
                      <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    {e?.followUp && <span className="mt-1 inline-block rounded bg-warn-soft px-1.5 py-0.5 text-[10px] font-bold text-warn">Follow-up</span>}
                  </button>
                );
              })}
              {!filtered.length && <p className="p-6 text-center text-xs text-mut">No trades match this filter.</p>}
            </div>
          </Card>
        </div>

        {/* editor */}
        <div className="lg:col-span-8">
          {!selected ? (
            <Card className="grid place-items-center p-10 text-sm text-mut">Select a trade to journal it.</Card>
          ) : (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <p className="font-display text-lg font-bold text-ink">{selected.symbol} <span className="text-sm font-semibold text-mut">{selected.side}</span></p>
                    <p className="text-xs text-mut">{selected.date} · {selected.strategy} · {selected.account} · R {selected.r.toFixed(1)}</p>
                  </div>
                  <span className={cn("ml-auto font-display text-xl font-bold tnum", selected.pnl >= 0 ? "text-gain" : "text-loss")}>{fmtMoney(selected.pnl, { sign: true })}</span>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-mut"><span>Journal completeness</span><span className="font-bold text-ink">{completeness(entry)}%</span></div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-edge2"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${completeness(entry)}%` }} /></div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs font-bold text-mut">Grade:</span>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => patch({ rating: entry.rating === s ? 0 : s })} className="transition-transform hover:scale-110">
                      <Star size={18} className={s <= entry.rating ? "fill-amber-400 text-amber-400" : "text-faint"} />
                    </button>
                  ))}
                  <span className="ml-2 text-xs text-faint">{savedTick ? `saved ${new Date(savedTick).toLocaleTimeString()}` : "autosaves"}</span>
                  <button onClick={() => patch({ followUp: !entry.followUp })} className={cn("ml-auto rounded-lg px-2.5 py-1.5 text-xs font-bold", entry.followUp ? "bg-warn-soft text-warn" : "border border-edge text-mut hover:text-ink")}>
                    {entry.followUp ? "★ Follow-up on" : "☆ Follow-up"}
                  </button>
                </div>
              </Card>

              <div className="flex gap-1 rounded-xl bg-panel2 p-1">
                {([["review", "Review"], ["plan", "Plan & Setup"], ["psych", "Psychology"]] as const).map(([k, label]) => (
                  <button key={k} onClick={() => setTab(k)} className={cn("flex-1 rounded-lg px-3 py-1.5 text-xs font-bold", tab === k ? "bg-brand text-white" : "text-mut hover:text-ink")}>{label}</button>
                ))}
              </div>

              {tab === "review" && (
                <Card className="p-4">
                  <CardHead title="Post-trade review" info="What actually happened on this execution" icon={<ListChecks size={14} />} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-xs font-bold text-mut">Review notes</span>
                      <textarea value={entry.postReview} onChange={(e) => patch({ postReview: e.target.value })} rows={4} placeholder="Entry quality, management, exit — what worked / what didn't…" className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-brand" />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-xs font-bold text-mut">Lessons & rules to keep</span>
                      <textarea value={entry.lessons} onChange={(e) => patch({ lessons: e.target.value })} rows={3} placeholder="One rule I will follow next time…" className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-brand" />
                    </label>
                    <div className="sm:col-span-2">
                      <p className="mb-1.5 text-xs font-bold text-mut">Mistakes (TradeZella-style tags)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {MISTAKES.map((m) => (
                          <button key={m} onClick={() => toggleList("mistakes", m)} className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", entry.mistakes.includes(m) ? "bg-loss text-white" : "border border-edge bg-panel2 text-mut hover:border-loss/50 hover:text-loss")}>{m}</button>
                        ))}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-mut"><Camera size={12} /> Screenshots attached</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(["entry", "exit", "htf"] as const).map((s) => (
                          <button key={s} onClick={() => patch({ screenshots: { ...entry.screenshots, [s]: !entry.screenshots[s] } })} className={cn("rounded-lg px-2.5 py-1.5 text-xs font-bold", entry.screenshots[s] ? "bg-brand text-white" : "border border-edge text-mut")}>
                            {entry.screenshots[s] ? "✓ " : ""}{s === "htf" ? "HTF context" : `${s[0].toUpperCase() + s.slice(1)} chart`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {tab === "plan" && (
                <Card className="p-4">
                  <CardHead title="Plan & setup" info="Grade the idea before judging the outcome" icon={<CheckCircle2 size={14} />} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-bold text-mut">Setup name</span>
                      <select value={entry.setup} onChange={(e) => patch({ setup: e.target.value })} className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-brand">
                        <option value="">Select setup…</option>
                        {SETUPS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>
                    <div>
                      <p className="mb-1 text-xs font-bold text-mut">Setup grade</p>
                      <div className="flex gap-1.5">
                        {(["A", "B", "C"] as const).map((g) => (
                          <button key={g} onClick={() => patch({ setupGrade: entry.setupGrade === g ? "" : g })} className={cn("flex-1 rounded-xl border py-2 font-display text-sm font-bold", entry.setupGrade === g ? "border-brand bg-brand text-white" : "border-edge text-mut hover:border-brand/50")}>{g}</button>
                        ))}
                      </div>
                    </div>
                    <label className="block sm:col-span-2">
                      <span className="mb-1 block text-xs font-bold text-mut">Pre-trade plan (bias, level, invalidation, size)</span>
                      <textarea value={entry.prePlan} onChange={(e) => patch({ prePlan: e.target.value })} rows={4} placeholder="If price does X I will… invalidation at… risk $…" className="w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-brand" />
                    </label>
                    <div className="sm:col-span-2">
                      <p className="mb-1.5 text-xs font-bold text-mut">Confluence present</p>
                      <div className="flex flex-wrap gap-1.5">
                        {CONFLUENCE.map((c) => (
                          <button key={c} onClick={() => toggleList("confluence", c)} className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", entry.confluence.includes(c) ? "bg-brand text-white" : "border border-edge bg-panel2 text-mut hover:border-brand/50 hover:text-ink")}>{c}</button>
                        ))}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-mut"><Tags size={12} /> Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {entry.tags.map((t) => (
                          <button key={t} onClick={() => toggleList("tags", t)} className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand hover:bg-loss-soft hover:text-loss">#{t} ×</button>
                        ))}
                      </div>
                      <div className="mt-2 flex gap-2">
                        <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && tagInput.trim()) { toggleList("tags", tagInput.trim().toLowerCase()); setTagInput(""); } }} placeholder="Add tag + Enter (e.g. london, news)…" className="flex-1 rounded-xl border border-edge bg-panel2 px-3 py-1.5 text-xs text-ink outline-none placeholder:text-faint focus:border-brand" />
                        <button onClick={() => { if (tagInput.trim()) { toggleList("tags", tagInput.trim().toLowerCase()); setTagInput(""); } }} className="rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-white">Add</button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {tab === "psych" && (
                <Card className="p-4">
                  <CardHead title="Psychology" info="State of mind drives execution quality" icon={<Brain size={14} />} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <p className="mb-1.5 text-xs font-bold text-mut">How did you feel?</p>
                      <div className="flex flex-wrap gap-1.5">
                        {MOODS.map((m) => (
                          <button key={m} onClick={() => patch({ mood: entry.mood === m ? "" : m })} className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", entry.mood === m ? "bg-brand text-white" : "border border-edge bg-panel2 text-mut hover:border-brand/50 hover:text-ink")}>{m}</button>
                        ))}
                      </div>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between"><p className="text-xs font-bold text-mut">Confidence going in</p><span className="font-display text-sm font-bold text-ink">{entry.confidence}/10</span></div>
                      <input type="range" min={1} max={10} value={entry.confidence} onChange={(e) => patch({ confidence: Number(e.target.value) })} className="mt-2 w-full" />
                    </div>
                    <div className="rounded-xl bg-panel2 p-3 text-xs text-mut sm:col-span-2">
                      <span className="font-bold text-ink">TradeZella rule:</span> low confidence + high size = skip. If mood was Revengeful/Tired and rating ≤ 2, flag follow-up and review the plan tab before the next session.
                    </div>
                    {entry.mistakes.length > 0 && (
                      <div className="rounded-xl border border-loss/30 bg-loss-soft p-3 text-xs sm:col-span-2">
                        <p className="flex items-center gap-1.5 font-bold text-loss"><AlertTriangle size={13} /> Logged mistakes</p>
                        <p className="mt-1 text-loss/90">{entry.mistakes.join(" · ")}</p>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              <div className="flex items-center gap-2">
                <button onClick={() => { const j = { ...journal }; delete j[selected.id]; setJournal(j); }} className="flex items-center gap-1.5 rounded-xl border border-edge px-3 py-2 text-xs font-semibold text-mut hover:border-loss hover:text-loss">
                  <Trash2 size={13} /> Clear entry
                </button>
                <span className="ml-auto flex items-center gap-1.5 text-xs text-faint"><Save size={12} /> Autosaved to vault</span>
                <button onClick={() => { const i = filtered.findIndex((t) => t.id === selected.id); const n = filtered[i + 1] ?? filtered[0]; if (n) setSelectedId(n.id); }} className="flex items-center gap-1 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-deep">
                  Next trade <ChevronRight size={13} />
                </button>
              </div>

              {selected.pnl < 0 && !entry.postReview.trim() && (
                <div className="flex items-center gap-2 rounded-xl border border-warn/30 bg-warn-soft p-3 text-xs">
                  <Sparkles size={14} className="shrink-0 text-warn" />
                  <span className="text-ink">Losing trade without a review — add 2 lines on what broke down so this tab stays honest.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
