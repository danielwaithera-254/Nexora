import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BookHeart, Trash2, Plus, Sparkles, X, Activity, BarChart3, Scale } from "lucide-react";
import { Card, CardHead } from "./ui";
import type { Trade } from "../data/trades";
import { fmtDate, fmtDateShort, fmtMoney } from "../lib/format";
import { cn } from "../utils/cn";

/* ---------- emotion taxonomy ---------- */
export type EmotionKey =
  | "focused"
  | "confident"
  | "calm"
  | "happy"
  | "euphoric"
  | "anxious"
  | "fomo"
  | "tilted"
  | "greedy"
  | "hesitant"
  | "bored"
  | "revenge";

export interface EmotionEntry {
  id: string;
  date: string;
  ts: number;
  tradeId?: string;
  primary: EmotionKey;
  tags: EmotionKey[];
  intensity: number;
  note: string;
}

export const EMOTIONS: Record<
  EmotionKey,
  { label: string; emoji: string; tone: "pos" | "neg" | "neu" }
> = {
  focused: { label: "Focused", emoji: "🎯", tone: "pos" },
  confident: { label: "Confident", emoji: "💪", tone: "pos" },
  calm: { label: "Calm", emoji: "😌", tone: "pos" },
  happy: { label: "Happy", emoji: "😄", tone: "pos" },
  euphoric: { label: "Euphoric", emoji: "🤩", tone: "pos" },
  anxious: { label: "Anxious", emoji: "😰", tone: "neg" },
  fomo: { label: "FOMO", emoji: "😱", tone: "neg" },
  tilted: { label: "Tilted", emoji: "😡", tone: "neg" },
  greedy: { label: "Greedy", emoji: "🤑", tone: "neg" },
  hesitant: { label: "Hesitant", emoji: "😬", tone: "neg" },
  bored: { label: "Bored", emoji: "😑", tone: "neu" },
  revenge: { label: "Revenge", emoji: "🤬", tone: "neg" },
};

const ORDER = Object.keys(EMOTIONS) as EmotionKey[];
const STORAGE_KEY = "nexora-notebook-v1";

const toneColor = (t: "pos" | "neg" | "neu") =>
  t === "pos" ? "var(--gain)" : t === "neg" ? "var(--loss)" : "var(--faint)";

const isoOf = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

export function loadNotebook(): EmotionEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EmotionEntry[]) : [];
  } catch {
    return [];
  }
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Seed entries that correlate with real results, so the mood-vs-P&L chart tells a true story. */
export function seedNotebook(trades: Trade[]): EmotionEntry[] {
  const byDay = new Map<string, number>();
  for (const t of trades) byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.pnl);
  const days = [...byDay.keys()].sort().slice(-26);

  const good: EmotionKey[] = ["focused", "confident", "calm", "happy", "euphoric"];
  const bad: EmotionKey[] = ["anxious", "fomo", "tilted", "greedy", "revenge"];
  const flat: EmotionKey[] = ["bored", "hesitant", "calm"];

  return days.map((date, i) => {
    const pnl = byDay.get(date)!;
    const h = hash(date);
    const pool = pnl > 400 ? good : pnl < -300 ? bad : flat;
    const primary = pool[h % pool.length];
    const tags: EmotionKey[] = [];
    const extra = pnl < 0 ? bad : good;
    for (let n = 0; n < 1 + (h % 2); n++) {
      const cand = extra[(h + n * 2) % extra.length];
      if (cand !== primary && !tags.includes(cand)) tags.push(cand);
    }
    return {
      id: `N-${String(i + 1).padStart(4, "0")}`,
      date,
      ts: new Date(date + "T00:00:00").getTime(),
      primary,
      tags,
      intensity: Math.max(2, Math.min(10, Math.round(Math.abs(pnl) / 220) + 3)),
      note: NOTES[primary],
    };
  });
}

const NOTES: Record<EmotionKey, string> = {
  focused: "Took only A+ setups. No chasing, no widening stops.",
  confident: "Stuck to the plan and let the winners run to target.",
  calm: "Slow tape, stayed patient. No forced trades today.",
  happy: "Green day on the board — now protect the cushion.",
  euphoric: "Big day. Watch for over-confidence in the next session.",
  anxious: "Choppy conditions, scaled down to half size.",
  fomo: "Entered a late breakout without confirmation. Noted.",
  tilted: "Chased after a stop-out. Shut it down after the second loss.",
  greedy: "Moved my target instead of taking profit. Lesson logged.",
  hesitant: "Missed two clean entries waiting for perfect confirmation.",
  bored: "Flat day, sat on my hands. Sometimes that is the trade.",
  revenge: "Re-entered immediately after a stop. Review tomorrow.",
};

/* ================================ page ================================ */
export default function Notebook({ trades }: { trades: Trade[] }) {
  const [entries, setEntries] = useState<EmotionEntry[]>(() => {
    const stored = loadNotebook();
    return stored.length ? stored : seedNotebook(trades);
  });
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "pos" | "neg">("all");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const addEntry = (e: Omit<EmotionEntry, "id" | "ts">) => {
    setEntries((prev) =>
      [
        { ...e, id: `N-${Date.now().toString(36)}`, ts: new Date(e.date + "T00:00:00").getTime() },
        ...prev,
      ].sort((a, b) => b.ts - a.ts)
    );
    setShowForm(false);
  };

  const visible = useMemo(
    () =>
      filter === "all"
        ? entries
        : entries.filter((e) => EMOTIONS[e.primary].tone === filter),
    [entries, filter]
  );

  /* ---- aggregates ---- */
  const stats = useMemo(() => {
    if (!entries.length)
      return { dominant: null as EmotionKey | null, avgIntensity: 0, negShare: 0, streak: 0 };
    const counts = new Map<EmotionKey, number>();
    for (const e of entries) counts.set(e.primary, (counts.get(e.primary) ?? 0) + 1);
    const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const avgIntensity = entries.reduce((s, e) => s + e.intensity, 0) / entries.length;
    const negShare =
      (entries.filter((e) => EMOTIONS[e.primary].tone === "neg").length / entries.length) * 100;
    let streak = 0;
    for (const e of [...entries].sort((a, b) => b.ts - a.ts)) {
      if (EMOTIONS[e.primary].tone === "pos") streak++;
      else break;
    }
    return { dominant, avgIntensity, negShare, streak };
  }, [entries]);

  return (
    <div className="space-y-4">
      {/* header + stat strip */}
      <Card>
        <CardHead
          title="Trader's Notebook"
          info="Log how you feel before, during and after sessions. Emotional data compounds into your sharpest edge."
          icon={<BookHeart size={14} />}
          right={
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[11px] font-bold text-white shadow-md shadow-brand/25 transition-all hover:brightness-110 active:scale-95"
            >
              <Plus size={12} strokeWidth={3} /> Log emotion
            </button>
          }
        />
        <div className="grid grid-cols-2 gap-4 border-t border-edge2 px-5 py-4 lg:grid-cols-4">
          <Stat label="Entries logged" value={String(entries.length)} tone="ink" />
          <Stat
            label="Dominant mood"
            value={stats.dominant ? `${EMOTIONS[stats.dominant].emoji} ${EMOTIONS[stats.dominant].label}` : "—"}
            tone={stats.dominant ? (EMOTIONS[stats.dominant].tone === "neg" ? "loss" : "gain") : "ink"}
          />
          <Stat label="Avg intensity" value={`${stats.avgIntensity.toFixed(1)}/10`} tone="brand" />
          <Stat
            label="Negative share"
            value={`${Math.round(stats.negShare)}%`}
            tone={stats.negShare > 45 ? "loss" : "gain"}
          />
        </div>
      </Card>

      {/* charts — siblings, never nested inside another card */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="h-[300px] lg:col-span-7">
          <IntensityTimeline entries={entries} />
        </div>
        <div className="h-[300px] lg:col-span-5">
          <EmotionFrequency entries={entries} />
        </div>
      </div>

      <div className="h-[320px]">
        <MoodVsPnl entries={entries} trades={trades} />
      </div>

      {/* entries */}
      <Card>
        <CardHead
          title="Recent entries"
          info="Scroll your emotional history. Tags reveal the recurring triggers behind your worst sessions."
          right={
            <div className="flex items-center rounded-lg border border-edge bg-panel2 p-0.5">
              {(
                [
                  { k: "all", l: "All" },
                  { k: "pos", l: "Positive" },
                  { k: "neg", l: "Negative" },
                ] as const
              ).map((o) => (
                <button
                  key={o.k}
                  onClick={() => setFilter(o.k)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[11px] font-bold transition-all",
                    filter === o.k ? "border border-edge bg-panel text-brand shadow-sm" : "text-mut hover:text-ink"
                  )}
                >
                  {o.l}
                </button>
              ))}
            </div>
          }
        />
        <div className="divide-y divide-edge2">
          {visible.slice(0, 14).map((e) => {
            const info = EMOTIONS[e.primary];
            return (
              <div key={e.id} className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-panel2">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-panel2 text-lg">
                  {info.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[12.5px] font-bold text-ink">{info.label}</p>
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider",
                        info.tone === "pos"
                          ? "bg-gain-soft text-gain"
                          : info.tone === "neg"
                            ? "bg-loss-soft text-loss"
                            : "bg-panel2 text-mut"
                      )}
                    >
                      {info.tone === "pos" ? "constructive" : info.tone === "neg" ? "watch" : "neutral"}
                    </span>
                    <span className="flex items-center gap-1">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <span
                          key={i}
                          className={cn(
                            "h-1 w-1 rounded-full",
                            i < e.intensity ? (info.tone === "neg" ? "bg-loss" : "bg-brand") : "bg-edge"
                          )}
                        />
                      ))}
                    </span>
                  </div>
                  {e.note && <p className="mt-1 text-[11.5px] leading-relaxed text-mut">{e.note}</p>}
                  {(e.tags.length > 0 || e.tradeId) && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1">
                      {e.tags.map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 rounded-md bg-panel2 px-1.5 py-0.5 text-[9.5px] font-bold text-mut"
                        >
                          {EMOTIONS[t].emoji} {EMOTIONS[t].label}
                        </span>
                      ))}
                      {e.tradeId && (
                        <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[9.5px] font-bold text-brand">
                          {e.tradeId}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <span className="whitespace-nowrap pt-1 text-[10.5px] font-semibold text-faint">
                  {fmtDate(e.date)}
                </span>
                <button
                  onClick={() => setEntries((prev) => prev.filter((x) => x.id !== e.id))}
                  className="mt-0.5 rounded-md p-1.5 text-faint transition-colors hover:bg-loss-soft hover:text-loss"
                  aria-label="Delete entry"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
          {visible.length === 0 && (
            <div className="px-5 py-14 text-center">
              <BookHeart size={28} className="mx-auto mb-2 text-faint" />
              <p className="text-sm font-bold text-mut">No entries yet</p>
              <p className="mt-1 text-[11px] text-faint">Log your first emotion to start building the record.</p>
            </div>
          )}
        </div>
      </Card>

      {showForm && <EmotionForm trades={trades} onClose={() => setShowForm(false)} onAdd={addEntry} />}
    </div>
  );
}

/* ---------- pieces ---------- */
function Stat({ label, value, tone }: { label: string; value: string; tone: "gain" | "loss" | "brand" | "ink" }) {
  const map = { gain: "text-gain", loss: "text-loss", brand: "text-brand", ink: "text-ink" };
  return (
    <div>
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-mut">{label}</p>
      <p className={cn("mt-1 font-display text-lg font-bold", map[tone])}>{value}</p>
    </div>
  );
}

function IntensityTimeline({ entries }: { entries: EmotionEntry[] }) {
  const data = useMemo(
    () =>
      [...entries]
        .sort((a, b) => a.ts - b.ts)
        .map((e) => ({
          label: fmtDateShort(e.date),
          date: e.date,
          intensity: e.intensity,
          emoji: EMOTIONS[e.primary].emoji,
          name: EMOTIONS[e.primary].label,
          tone: EMOTIONS[e.primary].tone,
        })),
    [entries]
  );

  const ticks = data
    .filter((_, i) => i % Math.max(1, Math.floor(data.length / 5)) === 0)
    .map((d) => d.label);

  return (
    <Card className="flex h-full flex-col">
      <CardHead
        title="Emotional Intensity"
        info="How strongly you felt across sessions. Spikes often precede your biggest mistakes."
        icon={<Activity size={14} />}
      />
      <div className="min-h-0 flex-1 px-2 pb-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 10, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="var(--edge2)" vertical={false} />
            <XAxis
              dataKey="label"
              ticks={ticks}
              tick={{ fontSize: 9.5, fill: "var(--faint)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 10]}
              tick={{ fontSize: 9.5, fill: "var(--faint)" }}
              axisLine={false}
              tickLine={false}
              width={34}
            />
            <Tooltip
              cursor={{ stroke: "var(--faint)", strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
                if (!active || !p) return null;
                return (
                  <div className="rounded-lg border border-edge bg-panel/95 px-3 py-2 text-[11px] shadow-xl backdrop-blur">
                    <p className="font-display font-semibold text-ink">
                      {p.emoji} {p.name}
                    </p>
                    <p className="mt-0.5 text-mut">{fmtDate(p.date)}</p>
                    <p className="text-mut">
                      Intensity <b className="tnum text-ink">{p.intensity}/10</b>
                    </p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={7} stroke="var(--brand)" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="intensity"
              stroke="var(--brand)"
              strokeWidth={2.2}
              animationDuration={800}
              dot={(props: any) => {
                const { cx, cy, payload, index } = props;
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={3.2}
                    fill={toneColor(payload.tone)}
                    stroke="var(--panel)"
                    strokeWidth={1.6}
                  />
                );
              }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function EmotionFrequency({ entries }: { entries: EmotionEntry[] }) {
  const data = useMemo(() => {
    const counts = new Map<EmotionKey, number>();
    for (const e of entries) counts.set(e.primary, (counts.get(e.primary) ?? 0) + 1);
    return ORDER.filter((k) => counts.has(k))
      .map((k) => ({ key: k, label: EMOTIONS[k].label, emoji: EMOTIONS[k].emoji, count: counts.get(k)!, tone: EMOTIONS[k].tone }))
      .sort((a, b) => b.count - a.count);
  }, [entries]);

  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <Card className="flex h-full flex-col">
      <CardHead
        title="Emotion Frequency"
        info="Which feelings show up most often in your trading sessions."
        icon={<BarChart3 size={14} />}
      />
      {/* horizontal bars read far better than emoji-only axis ticks */}
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-5 pb-4">
        {data.map((d) => (
          <div key={d.key} className="group flex items-center gap-2">
            <span className="w-4 shrink-0 text-center text-[13px]">{d.emoji}</span>
            <span className="w-16 shrink-0 truncate text-[10.5px] font-bold text-mut">{d.label}</span>
            <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-panel2">
              <div
                className="h-full rounded-full transition-all duration-700 group-hover:opacity-80"
                style={{ width: `${(d.count / max) * 100}%`, background: toneColor(d.tone) }}
              />
            </div>
            <span className="w-5 shrink-0 text-right text-[10.5px] font-bold text-ink tnum">{d.count}</span>
          </div>
        ))}
        {data.length === 0 && <p className="pt-10 text-center text-[12px] text-mut">No data yet.</p>}
      </div>
    </Card>
  );
}

function MoodVsPnl({ entries, trades }: { entries: EmotionEntry[]; trades: Trade[] }) {
  const data = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const t of trades) byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.pnl);
    const agg = new Map<EmotionKey, { sum: number; n: number }>();
    for (const e of entries) {
      const pnl = byDay.get(e.date);
      if (pnl === undefined) continue;
      const cur = agg.get(e.primary) ?? { sum: 0, n: 0 };
      cur.sum += pnl;
      cur.n++;
      agg.set(e.primary, cur);
    }
    return ORDER.filter((k) => agg.has(k)).map((k) => ({
      key: k,
      label: EMOTIONS[k].label,
      emoji: EMOTIONS[k].emoji,
      avg: Math.round(agg.get(k)!.sum / agg.get(k)!.n),
      days: agg.get(k)!.n,
    }));
  }, [entries, trades]);

  return (
    <Card className="flex h-full flex-col">
      <CardHead
        title="Mood vs. Performance"
        info="Average daily P&L on days you felt each emotion — the clearest proof of how psychology drives your results."
        icon={<Scale size={14} />}
      />
      <div className="min-h-0 flex-1 px-2 pb-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 10, left: -6, bottom: 0 }} barCategoryGap="26%">
            <CartesianGrid stroke="var(--edge2)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9.5, fill: "var(--mut)", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-18}
              textAnchor="end"
              height={44}
            />
            <YAxis
              tickFormatter={(v) => (Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
              tick={{ fontSize: 9.5, fill: "var(--faint)" }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              cursor={{ fill: "var(--edge2)", opacity: 0.5 }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as (typeof data)[number] | undefined;
                if (!active || !p) return null;
                return (
                  <div className="rounded-lg border border-edge bg-panel/95 px-3 py-2 text-[11px] shadow-xl backdrop-blur">
                    <p className="font-display font-semibold text-ink">
                      {p.emoji} {p.label}
                    </p>
                    <p className="mt-0.5 text-mut">
                      Avg day{" "}
                      <b className={cn("tnum", p.avg >= 0 ? "text-gain" : "text-loss")}>
                        {fmtMoney(p.avg, { sign: true })}
                      </b>
                    </p>
                    <p className="text-faint tnum">{p.days} logged days</p>
                  </div>
                );
              }}
            />
            <ReferenceLine y={0} stroke="var(--faint)" />
            <Bar dataKey="avg" radius={[6, 6, 0, 0]} animationDuration={800}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.avg >= 0 ? "var(--gain)" : "var(--loss)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ---------- modal ---------- */
function EmotionForm({
  trades,
  onClose,
  onAdd,
}: {
  trades: Trade[];
  onClose: () => void;
  onAdd: (e: Omit<EmotionEntry, "id" | "ts">) => void;
}) {
  const [date, setDate] = useState(isoOf(new Date()));
  const [primary, setPrimary] = useState<EmotionKey>("focused");
  const [tags, setTags] = useState<EmotionKey[]>([]);
  const [intensity, setIntensity] = useState(5);
  const [note, setNote] = useState("");
  const [tradeId, setTradeId] = useState("");

  const dayTrades = useMemo(() => trades.filter((t) => t.date === date), [trades, date]);

  const toggleTag = (k: EmotionKey) =>
    setTags((t) => (t.includes(k) ? t.filter((x) => x !== k) : t.length >= 4 ? t : [...t, k]));

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="toast-in max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-edge bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 flex items-center gap-2.5 border-b border-edge bg-panel px-5 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-soft text-brand">
            <Sparkles size={14} />
          </span>
          <div>
            <h3 className="font-display text-sm font-bold text-ink">Log an emotion</h3>
            <p className="text-[10.5px] text-mut">Honesty compounds. Record what you actually felt.</p>
          </div>
          <button onClick={onClose} className="ml-auto rounded-md p-1.5 text-mut hover:bg-panel2 hover:text-ink">
            <X size={15} />
          </button>
        </header>

        <div className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-mut">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setTradeId("");
                }}
                className="mt-1.5 w-full rounded-lg border border-edge bg-panel2 px-3 py-2 text-[12.5px] font-semibold text-ink outline-none focus:border-brand"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-mut">
                Link a trade {dayTrades.length > 0 && `(${dayTrades.length})`}
              </span>
              <select
                value={tradeId}
                onChange={(e) => setTradeId(e.target.value)}
                disabled={dayTrades.length === 0}
                className="mt-1.5 w-full appearance-none rounded-lg border border-edge bg-panel2 px-3 py-2 text-[12.5px] font-semibold text-ink outline-none focus:border-brand disabled:opacity-50"
              >
                <option value="">{dayTrades.length ? "— none —" : "no trades that day"}</option>
                {dayTrades.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.symbol} {t.side} · {t.pnl > 0 ? "+" : ""}
                    {t.pnl}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-mut">Primary feeling</span>
            <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
              {ORDER.map((k) => {
                const e = EMOTIONS[k];
                const active = primary === k;
                return (
                  <button
                    key={k}
                    onClick={() => setPrimary(k)}
                    title={e.label}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border px-1 py-2 transition-all",
                      active
                        ? "border-brand bg-brand-soft ring-2 ring-brand/25"
                        : "border-edge2 bg-panel2 hover:border-brand/40"
                    )}
                  >
                    <span className="text-lg leading-none">{e.emoji}</span>
                    <span className={cn("text-[9px] font-bold", active ? "text-brand" : "text-mut")}>{e.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-mut">
              Secondary tags · {tags.length}/4
            </span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ORDER.filter((k) => k !== primary).map((k) => {
                const e = EMOTIONS[k];
                const active = tags.includes(k);
                return (
                  <button
                    key={k}
                    onClick={() => toggleTag(k)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10.5px] font-bold transition-all",
                      active
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-edge2 bg-panel2 text-mut hover:border-brand/40 hover:text-ink"
                    )}
                  >
                    {e.emoji} {e.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-mut">Intensity</span>
              <span className="font-display text-lg font-bold text-ink tnum">{intensity}/10</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={intensity}
              onChange={(e) => setIntensity(parseInt(e.target.value))}
              className="mt-2 w-full accent-[color:var(--brand)]"
            />
            <div className="mt-1 flex justify-between text-[9px] font-bold uppercase tracking-wider text-faint">
              <span>Subtle</span>
              <span>Overwhelming</span>
            </div>
          </div>

          <label className="block">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-mut">Journal note</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="What happened? What did you do well? What will you do differently?"
              className="mt-1.5 w-full resize-none rounded-lg border border-edge bg-panel2 px-3 py-2 text-[12px] text-ink outline-none placeholder:text-faint focus:border-brand"
            />
          </label>
        </div>

        <footer className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-edge bg-panel px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-edge bg-panel2 px-3 py-1.5 text-[11.5px] font-bold text-ink transition-colors hover:border-loss hover:text-loss"
          >
            Cancel
          </button>
          <button
            onClick={() => onAdd({ date, primary, tags, intensity, note, tradeId: tradeId || undefined })}
            className="rounded-lg bg-brand px-4 py-1.5 text-[11.5px] font-bold text-white shadow-md shadow-brand/25 transition-all hover:brightness-110 active:scale-95"
          >
            Save entry
          </button>
        </footer>
      </div>
    </div>
  );
}
