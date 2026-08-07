import type { Trade } from "../data/trades";

/* ------------------------------------------------------------------ */
/* Playbooks: named strategy rule-sets a trade can be checked against  */
/* ------------------------------------------------------------------ */

export interface PlaybookRule {
  id: string;
  text: string;
}

export interface Playbook {
  id: string;
  name: string;
  rules: PlaybookRule[];
}

export interface TradeReview {
  playbookId?: string;
  checks: Record<string, boolean>;
  whyMissed: Record<string, string>;
  mistakeTags: string[];
  notes: { why?: string; well?: string; poorly?: string; change?: string };
}

export interface TradeAttach {
  id: string;
  name: string;
  dataUrl: string;
  size: number;
  addedAt: number;
}

export interface ExecEvent {
  id: string;
  time: string;
  label: string;
  detail: string;
  tone: "gain" | "loss" | "brand" | "flat";
}

const PLAYBOOKS_KEY = "nexora-playbooks";
const REVIEWS_KEY = "nexora-trade-reviews";
const ATTACH_KEY = "nexora-trade-attachments";
const DAILY_KEY = "nexora-daily-notes";

export const MISTAKE_TAGS = [
  "Early Entry",
  "Chased",
  "Oversized",
  "Moved Stop",
  "No Confirmation",
  "Held Too Long",
  "Cut Too Early",
  "FOMO",
  "Revenge",
  "Skewed Risk",
] as const;

const SEED_PLAYBOOKS: Playbook[] = [
  {
    id: "pb-lsr",
    name: "London Session Reversal",
    rules: [
      { id: "l1", text: "HTF bias identified" },
      { id: "l2", text: "Liquidity level identified" },
      { id: "l3", text: "Liquidity sweep occurred" },
      { id: "l4", text: "Displacement confirmed" },
      { id: "l5", text: "FVG formed" },
      { id: "l6", text: "Entry within planned zone" },
      { id: "l7", text: "Stop placed beyond invalidation" },
      { id: "l8", text: "Entry during approved session" },
    ],
  },
  {
    id: "pb-ny",
    name: "NY Liquidity Sweep",
    rules: [
      { id: "n1", text: "HTF bias identified" },
      { id: "n2", text: "Asia range liquidity sweep" },
      { id: "n3", text: "Displacement confirmed" },
      { id: "n4", text: "FVG / OB formed" },
      { id: "n5", text: "Entry confirmation" },
    ],
  },
];

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full — ignore */
  }
};

export function loadPlaybooks(): Playbook[] {
  const stored = read<Playbook[] | null>(PLAYBOOKS_KEY, null);
  if (stored) return stored;
  const seeded = SEED_PLAYBOOKS;
  write(PLAYBOOKS_KEY, seeded);
  return seeded;
}

export function savePlaybooks(p: Playbook[]) {
  write(PLAYBOOKS_KEY, p);
}

export function loadReviews(): Record<string, TradeReview> {
  return read<Record<string, TradeReview>>(REVIEWS_KEY, {});
}

export function saveReview(tradeId: string, review: TradeReview) {
  const all = loadReviews();
  all[tradeId] = review;
  write(REVIEWS_KEY, all);
}

export function loadTradeAttachments(): Record<string, TradeAttach[]> {
  return read<Record<string, TradeAttach[]>>(ATTACH_KEY, {});
}

export function saveTradeAttachments(map: Record<string, TradeAttach[]>) {
  write(ATTACH_KEY, map);
}

export function loadDailyNotes(): Record<string, string> {
  return read<Record<string, string>>(DAILY_KEY, {});
}

export function saveDailyNotes(map: Record<string, string>) {
  write(DAILY_KEY, map);
}

export const adherencePercent = (rules: PlaybookRule[], checks: Record<string, boolean>) => {
  if (!rules.length) return 0;
  const done = rules.filter((r) => checks[r.id] !== undefined);
  const passed = done.filter((r) => checks[r.id]).length;
  return rules.length ? Math.round((passed / rules.length) * 100) : 0;
};

/* ------------------------------------------------------------------ */
/* Deterministic helpers (stable per trade id)                          */
/* ------------------------------------------------------------------ */

export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const half = (n: number) => Math.max(0.5, Math.round(n * 2) / 2);

/** Simulated raw transaction history for a closed trade (stable per trade). */
export function generateExecutions(t: Trade): ExecEvent[] {
  const rnd = mulberry32(hashStr(t.id) ^ 0x5f3a);
  const start = t.ts;
  const dur = Math.round((18 + rnd() * 70) * 60000);
  const fmt = (ms: number) => new Date(ms).toLocaleTimeString("en-US", { hour12: false });
  const events: ExecEvent[] = [];
  const buySell = t.side === "Long" ? "BUY" : "SELL";
  const closeSide = t.side === "Long" ? "SELL" : "BUY";

  const entryFills = t.qty >= 1.5 && rnd() < 0.6 ? 2 : 1;
  let filled = 0;
  for (let i = 0; i < entryFills; i++) {
    const part = i === entryFills - 1 ? t.qty - filled : half(t.qty * (0.4 + rnd() * 0.2));
    filled += part;
    const off = i === 0 ? 0 : Math.round((8 + rnd() * 40) * 1000);
    const px = +(t.entry + (rnd() - 0.5) * Math.abs(t.entry) * 0.0004).toFixed(2);
    events.push({
      id: `in-${i}`,
      time: fmt(start + off),
      label: i === 0 ? "Entry" : "Add",
      detail: `${buySell} ${part} ${t.symbol} @ ${px}`,
      tone: i === 0 ? "brand" : "flat",
    });
  }

  if (rnd() < 0.45) {
    events.push({
      id: "sl-move",
      time: fmt(Math.round(start + dur * 0.35)),
      label: "Move SL",
      detail: `Stop moved to ${t.side === "Long" ? "breakeven" : "breakeven"} (+0.2R buffer)`,
      tone: "flat",
    });
  }

  const exitFills = t.qty >= 1.5 && rnd() < 0.6 ? 2 : rnd() < 0.25 ? 2 : 1;
  let outFilled = 0;
  for (let i = 0; i < exitFills; i++) {
    const part = i === exitFills - 1 ? t.qty - outFilled : half(t.qty * (0.3 + rnd() * 0.25));
    outFilled += part;
    const off = (i === 0 ? 0.74 : 0.84 + (i - 1) * 0.08) * dur;
    const px = +(t.exit + (rnd() - 0.5) * Math.abs(t.exit) * 0.0003).toFixed(2);
    events.push({
      id: `out-${i}`,
      time: fmt(Math.round(start + off)),
      label: i === 0 && exitFills > 1 ? "Partial Exit" : "Final Exit",
      detail: `${closeSide} ${part} ${t.symbol} @ ${px}`,
      tone: t.pnl >= 0 ? "gain" : "loss",
    });
  }

  events.sort((a, b) => a.time.localeCompare(b.time));
  return events;
}

export function execDuration(events: ExecEvent[]): string {
  if (events.length < 2) return "—";
  const s = (time: string) => {
    const [h, m, sec] = time.split(":").map((n) => parseInt(n, 10));
    return (h || 0) * 3600 + (m || 0) * 60 + (sec || 0);
  };
  const secs = Math.max(60, s(events[events.length - 1].time) - s(events[0].time));
  return `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, "0")}s`;
}

/** Synthetic price path from entry → exit with realistic wiggles (stable per trade). */
export function generatePricePath(t: Trade, bars = 42): number[] {
  const rnd = mulberry32(hashStr(t.id) ^ 0x9e37);
  const dir = t.side === "Long" ? 1 : -1;
  const diff = t.exit - t.entry;
  const amp = Math.max(Math.abs(diff) * 1.6, Math.abs(t.entry) * 0.0012);
  const out: number[] = [t.entry];
  for (let i = 1; i < bars - 1; i++) {
    const f = i / (bars - 1);
    const trend = t.entry + diff * f;
    const wave = amp * Math.sin(f * Math.PI * 3.1 + rnd() * 2) * (0.5 + rnd() * 0.5);
    out.push(+((trend + wave * dir).toFixed(2)));
  }
  out.push(t.exit);
  return out;
}

/** Unrealized P&L series along the price path, ending exactly at the trade's P&L. */
export function pnlFromPath(t: Trade, path: number[]): number[] {
  const dir = t.side === "Long" ? 1 : -1;
  const span = dir * (t.exit - t.entry);
  const k = span !== 0 ? t.pnl / span : t.pnl;
  return path.map((p) => Math.round((p - t.entry) * dir * k));
}

export function maxRunUpDown(pnls: number[]): { up: number; down: number } {
  let up = 0;
  let down = 0;
  for (const p of pnls) {
    up = Math.max(up, p);
    down = Math.min(down, p);
  }
  return { up, down };
}

/** Candles derived from the price path so chart and replay share one source. */
export function pathToCandles(path: number[], bars = 28): { o: number; h: number; l: number; c: number }[] {
  const rnd = mulberry32(hashStr(String(path.length)) ^ 0xc0ffee);
  const out: { o: number; h: number; l: number; c: number }[] = [];
  const stride = Math.max(1, Math.floor((path.length - 1) / bars));
  const idxs: number[] = [];
  for (let i = 0; i <= bars; i++) idxs.push(Math.min(path.length - 1, i * stride));
  for (let i = 0; i < bars; i++) {
    const a = path[idxs[i]];
    const b = path[idxs[i + 1]];
    const o = a;
    const c = b;
    const w = Math.abs(a - b) * (0.3 + rnd() * 0.5) || Math.abs(a) * 0.0003;
    const h = Math.max(o, c) + w;
    const l = Math.min(o, c) - w;
    out.push({ o, h, l, c });
  }
  return out;
}

export function fmtNum2(n: number) {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
