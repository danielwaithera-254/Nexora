import { useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ImagePlus,
  Lightbulb,
  ListChecks,
  PlayCircle,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Card, CardHead, Seg, SelectBox } from "./ui";
import type { Trade } from "../data/trades";
import { fmtDate } from "../lib/format";
import {
  adherencePercent,
  execDuration,
  generateExecutions,
  generatePricePath,
  loadDailyNotes,
  loadReviews,
  loadTradeAttachments,
  maxRunUpDown,
  MISTAKE_TAGS,
  pathToCandles,
  pnlFromPath,
  PSYCH_EMOTIONS,
  saveDailyNotes,
  saveReview,
  saveTradeAttachments,
  loadPlaybooks,
  type ExecEvent,
  type Playbook,
  type TradeAttach,
  type TradeReview,
} from "../lib/tradetools";
import { cn } from "../utils/cn";

type TabId = "stats" | "playbook" | "execution" | "psychology" | "attachments";

const fmtMoney = (v: number) => `${v >= 0 ? "+" : "-"}$${Math.abs(v).toLocaleString()}`;

export default function TradeDetail({ trade, onClose }: { trade: Trade; onClose: () => void }) {
  const [tab, setTab] = useState<TabId>("stats");
  const [playbooks] = useState<Playbook[]>(() => loadPlaybooks());
  const [review, setReview] = useState<TradeReview>(() => loadReviews()[trade.id] ?? blankReview());
  const [attachments, setAttachments] = useState<TradeAttach[]>(() => loadTradeAttachments()[trade.id] ?? []);
  const [daily, setDaily] = useState(() => loadDailyNotes()[trade.date] ?? "");
  const [tf, setTf] = useState("15M");

  const execs = useMemo(() => generateExecutions(trade), [trade]);
  const path = useMemo(() => generatePricePath(trade), [trade]);
  const candles = useMemo(() => pathToCandles(path), [path]);
  const pnls = useMemo(() => pnlFromPath(trade, path), [trade, path]);
  const dur = useMemo(() => execDuration(execs), [execs]);
  const run = useMemo(() => maxRunUpDown(pnls), [pnls]);

  const patchReview = (patch: Partial<TradeReview>) => {
    setReview((prev) => {
      const next = { ...prev, ...patch };
      saveReview(trade.id, next);
      return next;
    });
  };

  const toggleRule = (ruleId: string) => {
    const checks = { ...review.checks, [ruleId]: !review.checks[ruleId] };
    patchReview({ checks });
  };

  const patchNotes = (k: keyof TradeReview["notes"], v: string) => {
    patchReview({ notes: { ...review.notes, [k]: v } });
  };

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div
        className="mx-auto max-w-5xl space-y-3 rounded-2xl border border-edge bg-panel p-4 shadow-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-brand-soft px-2 py-1 font-display text-[12px] font-bold text-brand">
            {trade.symbol}
          </span>
          <span
            className={cn(
              "rounded-md px-2 py-1 text-[10.5px] font-bold",
              trade.side === "Long" ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss"
            )}
          >
            {trade.side}
          </span>
          <span className="font-mono text-[11px] font-bold text-faint">{trade.id}</span>
          <span className="text-[11px] font-semibold text-mut">{fmtDate(trade.date)}</span>
          <span className="ml-auto flex items-center gap-1.5 rounded-lg border border-edge bg-panel2 px-2.5 py-1.5">
            <ClipboardCheck size={12} className="text-brand" />
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-mut">
              Playbook · Execution · Attachments
            </span>
          </span>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-faint transition-colors hover:bg-panel2 hover:text-ink"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          <Kpi label="Net P&L" value={fmtMoney(trade.pnl)} tone={trade.pnl >= 0 ? "gain" : "loss"} />
          <Kpi label="R Multiple" value={`${trade.r > 0 ? "+" : ""}${trade.r.toFixed(1)}R`} tone={trade.r >= 0 ? "gain" : "loss"} />
          <Kpi label="Quantity" value={String(trade.qty)} />
          <Kpi label="Risk" value={`$${trade.risk.toLocaleString()}`} />
          <Kpi label="Entry" value={String(trade.entry)} />
          <Kpi label="Exit" value={String(trade.exit)} />
          <Kpi label="Session" value={trade.session} />
          <Kpi label="Duration" value={dur} />
        </div>

        {/* chart + running P&L */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          <MiniChart trade={trade} candles={candles} tf={tf} onTf={setTf} />
          <RunningPnl pnls={pnls} up={run.up} down={run.down} />
        </div>

        {/* tabs */}
        <Seg
          options={[
            { key: "stats", label: "Stats" },
            { key: "playbook", label: "Playbook" },
            { key: "execution", label: "Execution" },
            { key: "psychology", label: "Psychology" },
            { key: "attachments", label: "Attachments" },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "stats" && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-edge bg-panel2 p-4 sm:grid-cols-3">
            <StatRow k="Symbol" v={trade.symbol} />
            <StatRow k="Side" v={trade.side} />
            <StatRow k="Quantity" v={String(trade.qty)} />
            <StatRow k="Entry price" v={String(trade.entry)} />
            <StatRow k="Exit price" v={String(trade.exit)} />
            <StatRow k="Net P&L" v={fmtMoney(trade.pnl)} tone={trade.pnl >= 0 ? "gain" : "loss"} />
            <StatRow k="R multiple" v={`${trade.r > 0 ? "+" : ""}${trade.r.toFixed(2)}R`} />
            <StatRow k="Risked" v={`$${trade.risk.toLocaleString()}`} />
            <StatRow k="Strategy" v={trade.strategy} />
            <StatRow k="Account" v={trade.account} />
            <StatRow k="Session" v={trade.session} />
            <StatRow k="Planned" v={trade.planned ? "Yes" : "No"} />
            <StatRow k="Trade ID" v={trade.id} mono />
            <StatRow k="Opened" v={fmtDate(trade.date)} />
            <StatRow k="Held" v={dur} />
          </div>
        )}

        {tab === "playbook" && (
          <PlaybookTab
            playbooks={playbooks}
            review={review}
            onSelectPlaybook={(id) => patchReview({ playbookId: id, checks: {}, whyMissed: {} })}
            onToggle={toggleRule}
            onWhyMissed={(ruleId, v) => patchReview({ whyMissed: { ...review.whyMissed, [ruleId]: v } })}
          />
        )}

        {tab === "psychology" && (
          <PsychTab
            review={review}
            onPsych={(patch) => patchReview({ psych: { ...review.psych, ...patch } })}
            onFollowed={(v) => patchReview({ psych: { ...review.psych, followedPlan: v } })}
            onToggleTag={(tag) =>
              patchReview({
                mistakeTags: review.mistakeTags.includes(tag)
                  ? review.mistakeTags.filter((x) => x !== tag)
                  : [...review.mistakeTags, tag],
              })
            }
          />
        )}

        {tab === "execution" && <ExecutionTab events={execs} trade={trade} />}

        {tab === "attachments" && (
          <AttachmentsTab
            list={attachments}
            onChange={(next) => {
              setAttachments(next);
              const all = loadTradeAttachments();
              all[trade.id] = next;
              saveTradeAttachments(all);
            }}
          />
        )}

        {/* persistent notes */}
        <NotesBlock
          notes={review.notes}
          onPatch={patchNotes}
          daily={daily}
          onDaily={(v) => {
            setDaily(v);
            const all = loadDailyNotes();
            all[trade.date] = v;
            saveDailyNotes(all);
          }}
        />
      </div>
    </div>
  );
}

function blankReview(): TradeReview {
  return { checks: {}, whyMissed: {}, mistakeTags: [], notes: {}, psych: {} };
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "gain" | "loss" }) {
  return (
    <div className="rounded-xl border border-edge bg-panel2 px-3 py-2">
      <p className="text-[8.5px] font-extrabold uppercase tracking-wider text-faint">{label}</p>
      <p className={cn("mt-0.5 truncate font-display text-[12.5px] font-bold tnum", tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : "text-ink")}>
        {value}
      </p>
    </div>
  );
}

function StatRow({ k, v, tone, mono }: { k: string; v: string; tone?: "gain" | "loss"; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-edge2/70 pb-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wide text-faint">{k}</span>
      <span className={cn("text-[11.5px] font-bold tnum", mono && "font-mono text-[10.5px]", tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : "text-ink")}>
        {v}
      </span>
    </div>
  );
}

/* ---------------- mini chart ---------------- */

function MiniChart({
  trade,
  candles,
  tf,
  onTf,
}: {
  trade: Trade;
  candles: { o: number; h: number; l: number; c: number }[];
  tf: string;
  onTf: (t: string) => void;
}) {
  const W = 560;
  const H = 230;
  const PAD = 8;
  const lo = Math.min(...candles.map((c) => c.l));
  const hi = Math.max(...candles.map((c) => c.h));
  const span = hi - lo || 1;
  const y = (p: number) => PAD + (1 - (p - lo) / span) * (H - PAD * 2);
  const bw = W / candles.length;
  const entryIdx = 0;
  const exitIdx = candles.length - 1;

  return (
    <Card>
      <CardHead
        title={`${trade.symbol} · ${trade.side}`}
        info="Synthetic 1m chart reconstructed from the trade's execution path."
        icon={<Activity size={14} />}
        right={
          <div className="flex items-center gap-1 rounded-lg border border-edge bg-panel2 p-0.5">
            {["1m", "5m", "15M", "1H", "4H", "1D"].map((t) => (
              <button
                key={t}
                onClick={() => onTf(t)}
                className={cn(
                  "rounded-md px-1.5 py-0.5 text-[9px] font-bold transition-all",
                  tf === t ? "brand-gradient text-white" : "text-faint hover:text-brand"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        }
      />
      <div className="px-4 pb-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          {candles.map((c, i) => {
            const x = i * bw + bw / 2;
            const up = c.c >= c.o;
            const col = up ? "var(--gain)" : "var(--loss)";
            const bodyY = y(Math.max(c.o, c.c));
            const bodyH = Math.max(1.5, Math.abs(y(c.o) - y(c.c)));
            return (
              <g key={i}>
                <line x1={x} y1={y(c.h)} x2={x} y2={y(c.l)} stroke={col} strokeWidth={1} opacity={0.7} />
                <rect x={x - bw * 0.28} y={bodyY} width={bw * 0.56} height={bodyH} rx={1} fill={col} />
              </g>
            );
          })}
          {/* entry / exit markers */}
          <g>
            <circle cx={entryIdx * bw + bw / 2} cy={y(candles[entryIdx].o)} r={4.5} fill="var(--panel)" stroke="var(--brand)" strokeWidth={2} />
            <text x={entryIdx * bw + bw / 2 - 4} y={y(candles[entryIdx].o) - 9} textAnchor="end" fontSize={10} fontWeight={800} fill="var(--brand)">
              ENTRY
            </text>
          </g>
          <g>
            <circle cx={exitIdx * bw + bw / 2} cy={y(candles[exitIdx].c)} r={4.5} fill="var(--panel)" stroke="var(--warn)" strokeWidth={2} />
            <text x={exitIdx * bw + bw / 2 + 4} y={y(candles[exitIdx].c) - 9} fontSize={10} fontWeight={800} fill="var(--warn)">
              EXIT
            </text>
          </g>
        </svg>
        <div className="mt-1 flex items-center justify-between text-[9px] font-bold text-faint">
          <span>Entry {trade.entry} · {fmtDate(trade.date)}</span>
          <span className="flex items-center gap-1">
            <Clock size={10} /> {tf} · {candles.length} bars
          </span>
        </div>
      </div>
    </Card>
  );
}

/* ---------------- running P&L ---------------- */

function RunningPnl({ pnls, up, down }: { pnls: number[]; up: number; down: number }) {
  const W = 560;
  const H = 210;
  const PAD = 10;
  const lo = Math.min(...pnls, 0);
  const hi = Math.max(...pnls, 0);
  const span = hi - lo || 1;
  const y = (v: number) => PAD + (1 - (v - lo) / span) * (H - PAD * 2);
  const step = Math.max(1, Math.floor(pnls.length / W));
  const pts = pnls
    .map((v, i) => (i % step === 0 || i === pnls.length - 1 ? `${(i / Math.max(1, pnls.length - 1)) * W},${y(v)}` : null))
    .filter(Boolean)
    .join(" ");
  const area = `0,${H} ${pts} ${W},${H}`;
  const last = pnls[pnls.length - 1];

  return (
    <Card>
      <CardHead
        title="Running P&L"
        info="How unrealized P&L progressed from entry to exit."
        icon={<BarChart3 size={14} />}
      />
      <div className="px-4 pb-4">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
          <defs>
            <linearGradient id="runGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="var(--edge)" strokeWidth={1} strokeDasharray="4 4" />
          <polygon points={area} fill="url(#runGrad)" />
          <polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={W} cy={y(last)} r={4} fill={last >= 0 ? "var(--gain)" : "var(--loss)"} />
        </svg>
        <div className="mt-1 flex items-center justify-between text-[9px] font-bold">
          <span className="text-faint">Max unrealized +<span className="text-gain">{up.toLocaleString()}</span> · -<span className="text-loss">{Math.abs(down).toLocaleString()}</span></span>
          <span className={cn("tnum text-[10px]", last >= 0 ? "text-gain" : "text-loss")}>
            {fmtMoney(last)} final
          </span>
        </div>
      </div>
    </Card>
  );
}

/* ---------------- playbook tab ---------------- */

function PlaybookTab({
  playbooks,
  review,
  onSelectPlaybook,
  onToggle,
  onWhyMissed,
}: {
  playbooks: Playbook[];
  review: TradeReview;
  onSelectPlaybook: (id: string) => void;
  onToggle: (ruleId: string) => void;
  onWhyMissed: (ruleId: string, v: string) => void;
}) {
  const pb = playbooks.find((p) => p.id === review.playbookId) ?? playbooks[0];
  const adh = adherencePercent(pb?.rules ?? [], review.checks);
  const valid = adh === 100 && (pb?.rules.length ?? 0) > 0;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-56">
          <SelectBox
            value={pb?.id ?? ""}
            onChange={onSelectPlaybook}
            options={playbooks.map((p) => ({ value: p.id, label: p.name }))}
          />
        </div>
        <div className="flex-1" />
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10.5px] font-extrabold ring-1",
            valid ? "bg-gain-soft text-gain ring-gain/20" : "bg-warn-soft text-warn ring-warn/20"
          )}
        >
          {valid ? <ShieldCheck size={12} /> : <Lightbulb size={12} />}
          {valid ? "Valid Setup" : "Off-plan"}
        </span>
      </div>

      <div className="rounded-xl border border-edge bg-panel2 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-mut">Rule adherence</span>
          <span className={cn("tnum font-display text-[15px] font-extrabold", adh >= 80 ? "text-gain" : adh >= 50 ? "text-warn" : "text-loss")}>
            {adh}%
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-edge">
          <div
            className={cn("h-full rounded-full transition-all duration-500", adh >= 80 ? "bg-gain" : adh >= 50 ? "bg-warn" : "bg-loss")}
            style={{ width: `${adh}%` }}
          />
        </div>
        <p className="mt-2 text-[10px] text-faint">
          {pb ? `"${pb.name}" · ${(pb.rules ?? []).length} rules` : "Select a playbook to check this trade against your rules."}
        </p>
      </div>

      {(pb?.rules ?? []).map((r) => {
        const val = !!review.checks[r.id];
        const missed = !val && review.checks[r.id] !== undefined;
        return (
          <div key={r.id} className={cn("rounded-xl border p-3.5 transition-colors", missed ? "border-loss/25 bg-loss-soft/30" : "border-edge bg-panel2")}>
            <div className="flex items-start gap-3">
              <button
                onClick={() => onToggle(r.id)}
                className={cn(
                  "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 transition-all",
                  val ? "border-gain bg-gain text-white" : "border-edge bg-panel hover:border-brand"
                )}
                aria-label={`Rule: ${r.text}`}
              >
                {val && <CheckCircle2 size={13} strokeWidth={3} />}
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("text-[12px] font-bold", val ? "text-gain" : "text-ink")}>{r.text}</p>
                {missed && (
                  <div className="mt-2 space-y-2">
                    <input
                      value={review.whyMissed[r.id] ?? ""}
                      onChange={(e) => onWhyMissed(r.id, e.target.value)}
                      placeholder="Why missed? (e.g. entered before displacement)"
                      className="w-full rounded-lg border border-edge bg-panel px-3 py-1.5 text-[10.5px] font-semibold text-ink outline-none transition-colors placeholder:text-faint focus:border-brand"
                    />
                  </div>
                )}
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-md px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide",
                  val ? "bg-gain-soft text-gain" : missed ? "bg-loss-soft text-loss" : "bg-panel text-faint"
                )}
              >
                {val ? "Pass" : missed ? "Fail" : "—"}
              </span>
            </div>
          </div>
        );
      })}

      <p className="text-[9.5px] text-faint">
        Answers are saved per trade and feed the Playbooks page — spot which rules your losing trades keep breaking. Tag the psychological mistakes in the Psychology tab.
      </p>
    </div>
  );
}

/* ---------------- psychology tab ---------------- */

function PsychTab({
  review,
  onPsych,
  onFollowed,
  onToggleTag,
}: {
  review: TradeReview;
  onPsych: (patch: { before?: string; during?: string; after?: string }) => void;
  onFollowed: (v: boolean) => void;
  onToggleTag: (tag: string) => void;
}) {
  const psych = review.psych ?? {};
  const rows: Array<{ key: "before" | "during" | "after"; label: string; hint: string }> = [
    { key: "before", label: "Before trade", hint: "What state did you enter in?" },
    { key: "during", label: "During trade", hint: "What were you feeling while in it?" },
    { key: "after", label: "After trade", hint: "How did you feel when it closed?" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.key} className="rounded-xl border border-edge bg-panel2 p-3.5">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-mut">{r.label}</p>
            <p className="mt-0.5 text-[9.5px] text-faint">{r.hint}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {PSYCH_EMOTIONS.map((e) => {
                const on = psych[r.key] === e;
                return (
                  <button
                    key={e}
                    onClick={() => onPsych({ [r.key]: on ? undefined : e })}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-[10px] font-bold ring-1 transition-all",
                      on ? "bg-brand text-white ring-brand" : "bg-panel text-mut ring-edge hover:text-brand"
                    )}
                  >
                    {e}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-edge bg-panel2 p-3.5">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-mut">Did you follow your plan?</p>
        <div className="mt-2.5 flex gap-2">
          {[true, false].map((v) => (
            <button
              key={String(v)}
              onClick={() => onFollowed(v)}
              className={cn(
                "rounded-xl px-4 py-2 text-[11px] font-extrabold ring-1 transition-all",
                psych.followedPlan === v
                  ? v
                    ? "bg-gain text-white ring-gain"
                    : "bg-loss text-white ring-loss"
                  : "bg-panel text-mut ring-edge hover:text-ink"
              )}
            >
              {v ? "Yes, I followed my plan" : "No, I deviated"}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-edge bg-panel2 p-3.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-mut">Mistakes I made</span>
          <Brain size={13} className="text-brand" />
        </div>
        <p className="mt-0.5 text-[9.5px] text-faint">
          Be honest — these tags power the "Why did I lose?" analysis and your pattern feedback.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {MISTAKE_TAGS.map((tag) => {
            const on = review.mistakeTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => onToggleTag(tag)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-[10px] font-bold ring-1 transition-all",
                  on ? "bg-loss-soft text-loss ring-loss/25" : "bg-panel text-mut ring-edge hover:text-brand"
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[9.5px] text-faint">
        Saved per trade. After 50+ tagged trades, Nexora surfaces your most recurring losing pattern.
      </p>
    </div>
  );
}

/* ---------------- execution tab ---------------- */

function ExecutionTab({ events, trade }: { events: ExecEvent[]; trade: Trade }) {
  const [viewAll, setViewAll] = useState(false);
  const shown = viewAll ? events : events.slice(0, 5);
  const first = events[0]?.label ?? "Entry";

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-edge bg-panel2 p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-soft text-brand">
            <PlayCircle size={17} />
          </span>
          <div>
            <p className="text-[12px] font-extrabold text-ink">Raw transaction history</p>
            <p className="text-[10px] text-faint">
              {events.length} fills · {first} → {events[events.length - 1]?.label} · {trade.symbol} · held{" "}
              {execDuration(events)}
            </p>
          </div>
          <span className="ml-auto flex items-center gap-1.5 rounded-lg bg-panel px-2 py-1 text-[9px] font-extrabold uppercase tracking-wider text-faint">
            <Clock size={10} /> view all
          </span>
        </div>
      </div>

      <div className="space-y-0">
        {shown.map((e, i) => (
          <div key={e.id} className="relative flex gap-3 pb-3">
            {i < shown.length - 1 && <span className="absolute left-[5px] top-4 h-full w-px bg-edge" />}
            <span
              className={cn(
                "relative mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4",
                e.tone === "gain"
                  ? "bg-gain ring-gain-soft"
                  : e.tone === "loss"
                    ? "bg-loss ring-loss-soft"
                    : e.tone === "brand"
                      ? "bg-brand ring-brand-soft"
                      : "bg-faint ring-edge2"
              )}
            />
            <div className="min-w-0 flex-1 rounded-xl border border-edge bg-panel2 px-3.5 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] font-bold text-faint tnum">{e.time}</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide",
                    e.tone === "gain"
                      ? "bg-gain-soft text-gain"
                      : e.tone === "loss"
                        ? "bg-loss-soft text-loss"
                        : e.tone === "brand"
                          ? "bg-brand-soft text-brand"
                          : "bg-panel text-mut ring-1 ring-edge"
                  )}
                >
                  {e.label}
                </span>
              </div>
              <p className="mt-1 font-mono text-[11.5px] font-semibold text-ink tnum">{e.detail}</p>
            </div>
          </div>
        ))}
        {events.length > 5 && (
          <button
            onClick={() => setViewAll((v) => !v)}
            className="w-full rounded-xl border border-edge bg-panel2 py-2 text-[10.5px] font-bold text-brand transition-colors hover:border-brand/40"
          >
            {viewAll ? "Show less" : `View all ${events.length} executions`}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- attachments tab ---------------- */

function AttachmentsTab({ list, onChange }: { list: TradeAttach[]; onChange: (l: TradeAttach[]) => void }) {
  const [drag, setDrag] = useState(false);
  const [view, setView] = useState<string | null>(null);
  const ref = useRef<HTMLInputElement>(null);

  const addFiles = (files: FileList | File[]) => {
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    imgs.forEach((f) => {
      const reader = new FileReader();
      reader.onload = () => {
        onChange([
          ...list,
          { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: f.name.replace(/\.[^.]+$/, ""), dataUrl: String(reader.result ?? ""), size: f.size, addedAt: Date.now() },
        ]);
      };
      reader.readAsDataURL(f);
    });
  };

  return (
    <div className="space-y-3">
      <div
        data-dropzone
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDrag(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => ref.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-5 py-5 text-center transition-all",
          drag ? "border-brand bg-brand/5" : "border-edge bg-panel2 hover:border-brand/50"
        )}
      >
        <Upload size={18} className={drag ? "text-brand" : "text-faint"} />
        <span className="text-[11px] font-bold text-mut">Drop screenshots for this trade or browse</span>
        <span className="text-[9px] text-faint">Chart setups, entry/exit, annotations — PNG · JPG · WEBP</span>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {list.length === 0 ? (
        <div className="rounded-xl border border-dashed border-edge py-10 text-center">
          <ImagePlus size={22} className="mx-auto text-faint" />
          <p className="mt-2 text-[11.5px] font-bold text-mut">No screenshots for this trade yet</p>
          <p className="mt-0.5 text-[10px] text-faint">Pre-trade, setup, entry and exit evidence lives here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {list.map((a) => (
            <div key={a.id} className="group relative overflow-hidden rounded-xl border border-edge bg-panel2">
              <button onClick={() => setView(a.id)} className="block w-full">
                <img src={a.dataUrl} alt={a.name} loading="lazy" className="aspect-video w-full object-cover" />
              </button>
              <div className="flex items-center gap-1 px-2 py-1.5">
                <p className="min-w-0 flex-1 truncate text-[9.5px] font-bold text-mut">{a.name}</p>
                <button
                  onClick={() => onChange(list.filter((x) => x.id !== a.id))}
                  className="rounded p-1 text-faint transition-colors hover:bg-loss-soft hover:text-loss"
                  aria-label="Delete attachment"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {view && list.find((a) => a.id === view) && (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/90 p-4" onClick={() => setView(null)}>
          <button className="absolute right-4 top-4 rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
          <img
            src={list.find((a) => a.id === view)?.dataUrl}
            alt="Preview"
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

/* ---------------- notes ---------------- */

const NOTE_TEMPLATES = [
  { label: "Pre-trade reasoning", key: "why" as const, text: "Why did I take this trade? (bias, liquidity, setup)" },
  { label: "What went right?", key: "well" as const, text: "What did I do well?" },
  { label: "What went wrong?", key: "poorly" as const, text: "What did I do poorly?" },
  { label: "Lesson", key: "change" as const, text: "What will I change next time?" },
];

function NotesBlock({
  notes,
  onPatch,
  daily,
  onDaily,
}: {
  notes: TradeReview["notes"];
  onPatch: (k: keyof TradeReview["notes"], v: string) => void;
  daily: string;
  onDaily: (v: string) => void;
}) {
  return (
    <Card className="overflow-visible">
      <CardHead
        title="Trade Notes"
        info="This trade's story — saved automatically and shown again whenever you reopen it."
        icon={<ListChecks size={14} />}
        right={
          <div className="flex flex-wrap gap-1">
            {NOTE_TEMPLATES.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  if (document.getElementById(`note-${t.key}`)) {
                    document.getElementById(`note-${t.key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                    (document.getElementById(`note-${t.key}`) as HTMLTextAreaElement | null)?.focus();
                  }
                }}
                className="rounded-lg border border-edge bg-panel2 px-2 py-1 text-[9px] font-bold text-mut transition-colors hover:border-brand/40 hover:text-brand"
              >
                + {t.label}
              </button>
            ))}
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-5">
        {NOTE_TEMPLATES.map((t) => (
          <div key={t.key}>
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-mut">{t.label}</span>
            <textarea
              id={`note-${t.key}`}
              value={notes[t.key] ?? ""}
              onChange={(e) => onPatch(t.key, e.target.value)}
              rows={3}
              placeholder={t.text}
              className="mt-1 w-full resize-none rounded-xl border border-edge bg-panel2 px-3 py-2 text-[11px] font-medium leading-relaxed text-ink outline-none transition-colors placeholder:text-faint focus:border-brand"
            />
          </div>
        ))}

        <div className="sm:col-span-2">
          <span className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-wider text-mut">
            <Plus size={10} className="text-brand" />
            Daily Notes <span className="normal-case tracking-normal text-faint">— shared with every trade that day</span>
          </span>
          <textarea
            value={daily}
            onChange={(e) => onDaily(e.target.value)}
            rows={4}
            placeholder="Market conditions, mindset, mistakes, main lesson…"
            className="mt-1 w-full resize-none rounded-xl border border-edge bg-panel2 px-3 py-2 text-[11px] font-medium leading-relaxed text-ink outline-none transition-colors placeholder:text-faint focus:border-brand"
          />
        </div>
      </div>
      <div className="border-t border-edge2 px-5 py-2.5 text-[9px] text-faint">
        <span className="flex items-center gap-1">
          <ArrowUp size={10} /> <ArrowDown size={10} className="-ml-2" /> Notes sync to the Notebook automatically on save.
        </span>
      </div>
    </Card>
  );
}
