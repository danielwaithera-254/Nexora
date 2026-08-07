import type { Trade } from "../data/trades";
import { hashStr, mulberry32, type TradeReview } from "./tradetools";

/* ------------------------------------------------------------------ */
/* Open positions (simulated until live MT5 sync lands)                 */
/* ------------------------------------------------------------------ */

export interface OpenPosition {
  symbol: string;
  side: "Long" | "Short";
  qty: number;
  entry: number;
  current: number;
  pnl: number;
  r: number;
}

const fmtPrice = (v: number) => (v >= 100 ? v.toLocaleString(undefined, { maximumFractionDigits: 1 }) : v.toFixed(v >= 10 ? 2 : 4));

export function generateOpenPositions(trades: Trade[], seedDate = Date.now()): OpenPosition[] {
  const symbols = [...new Set(trades.map((t) => t.symbol))];
  if (!symbols.length) return [];
  const rnd = mulberry32(hashStr(`open-${seedDate}`));
  const count = 2 + Math.floor(rnd() * 2);
  const out: OpenPosition[] = [];
  for (let i = 0; i < count; i++) {
    const symbol = symbols[Math.floor(rnd() * symbols.length)];
    const refs = trades.filter((t) => t.symbol === symbol);
    const ref = refs[Math.floor(rnd() * refs.length)] ?? trades[0];
    const side = ref.side;
    const qty = ref.qty;
    const drift = (rnd() - (side === "Long" ? 0.42 : 0.58)) * 0.012;
    const entry = ref.exit;
    const current = entry * (1 + drift);
    const pnlRaw = (current - entry) * qty * (side === "Long" ? 1 : -1);
    const pnl = Math.round(pnlRaw);
    const riskPer = Math.max(1, Math.abs(ref.exit - ref.entry));
    const r = (pnlRaw / riskPer) * 0.02;
    out.push({ symbol, side, qty, entry: Number(entry.toFixed(2)), current: Number(current.toFixed(2)), pnl, r });
  }
  return out;
}

export const positionPrice = (p: OpenPosition) => fmtPrice(p.current);

/* ------------------------------------------------------------------ */
/* Prop-firm accounts                                                  */
/* ------------------------------------------------------------------ */

export interface AccountDef {
  id: string;
  name: string;
  size: number;
  balance: number;
  dailyLossLimit: number;
  maxDrawdown: number;
  profitTarget: number;
  tradeAccount?: string;
}

export const SEED_ACCOUNTS: AccountDef[] = [
  {
    id: "acc-ftmo",
    name: "FTMO · 100k",
    size: 100_000,
    balance: 100_000,
    dailyLossLimit: 5_000,
    maxDrawdown: 10_000,
    profitTarget: 10_000,
    tradeAccount: "Prop Firm",
  },
  {
    id: "acc-e8",
    name: "E8 · 50k",
    size: 50_000,
    balance: 50_000,
    dailyLossLimit: 2_500,
    maxDrawdown: 5_000,
    profitTarget: 5_000,
    tradeAccount: "Swing",
  },
  {
    id: "acc-personal",
    name: "Personal",
    size: 25_000,
    balance: 25_000,
    dailyLossLimit: 1_250,
    maxDrawdown: 2_500,
    profitTarget: 5_000,
    tradeAccount: "Main Futures",
  },
];

export interface AccountStats {
  equity: number;
  todayPnl: number;
  dailyLossRemaining: number;
  drawdown: number;
  drawdownRemaining: number;
  tradingDays: number;
  payout: number; // 0..1 progress toward profit target
  totalPnl: number;
  wins: number;
  losses: number;
}

/** Tags that book trades to an account: its name, its trade link, and MT5 variants (MT5 reports tag trades `MT5-<accountNum>`). */
export function accountTagSet(acc: AccountDef): Set<string> {
  const s = new Set<string>();
  if (acc.tradeAccount) s.add(acc.tradeAccount);
  s.add(acc.name);
  for (const v of [acc.tradeAccount, acc.name]) {
    if (!v) continue;
    if (/^\d+$/.test(v)) s.add(`MT5-${v}`);
    else {
      const m = v.match(/^MT5-(\d+)$/);
      if (m) s.add(m[1]);
    }
  }
  return s;
}

export function accountStats(acc: AccountDef, trades: Trade[]): AccountStats {
  const tags = accountTagSet(acc);
  const mine = tags.size ? trades.filter((t) => tags.has(t.account)) : [];
  const today = new Date().toISOString().slice(0, 10);
  const sorted = [...mine].sort((a, b) => a.ts - b.ts);
  let totalPnl = 0;
  let peak = acc.balance;
  let maxDD = 0;
  let todayPnl = 0;
  let wins = 0;
  let losses = 0;
  for (const t of sorted) {
    totalPnl += t.pnl;
    peak = Math.max(peak, acc.balance + totalPnl);
    maxDD = Math.max(maxDD, peak - (acc.balance + totalPnl));
    if (t.date === today) todayPnl += t.pnl;
    if (t.pnl > 0) wins++;
    else if (t.pnl < 0) losses++;
  }
  const equity = acc.balance + totalPnl;
  return {
    equity,
    todayPnl,
    dailyLossRemaining: Math.max(0, acc.dailyLossLimit + todayPnl),
    drawdown: maxDD,
    drawdownRemaining: Math.max(0, acc.maxDrawdown - maxDD),
    tradingDays: new Set(mine.map((t) => t.date)).size,
    payout: Math.min(1, Math.max(0, (equity - acc.size) / acc.profitTarget)),
    totalPnl,
    wins,
    losses,
  };
}

/* ------------------------------------------------------------------ */
/* Risk report                                                         */
/* ------------------------------------------------------------------ */

export interface RiskWarn {
  tone: "warn" | "danger" | "ok";
  text: string;
}

export interface RiskReport {
  todayLoss: number;
  tradesToday: number;
  winsToday: number;
  riskUsed: number; // 0..1 of primary account daily limit
  exposure: number; // $ notional at risk in open positions
  riskPerTrade: number; // 1% rule for the primary account
  openCount: number;
  warnings: RiskWarn[];
}

export function riskReport(accounts: AccountDef[], trades: Trade[], positions: OpenPosition[]): RiskReport {
  const primary = accounts[0];
  const today = new Date().toISOString().slice(0, 10);
  const todays = trades.filter((t) => t.date === today);
  const todayLoss = -Math.min(0, todays.reduce((s, t) => s + t.pnl, 0));
  const tradesToday = todays.length;
  const winsToday = todays.filter((t) => t.pnl > 0).length;
  const riskUsed = primary && primary.dailyLossLimit > 0 ? Math.min(1, todayLoss / primary.dailyLossLimit) : 0;
  const exposure = positions.reduce((s, p) => s + Math.abs(p.pnl), 0);
  const riskPerTrade = primary ? primary.balance * 0.01 : 0;
  const openCount = positions.length;

  const warnings: RiskWarn[] = [];
  if (tradesToday >= 3) {
    const wr = winsToday / tradesToday;
    if (wr <= 0.4) warnings.push({ tone: "warn", text: `Today is below 40% win rate (${Math.round(wr * 100)}%). Consider stopping until you find your A+ setup.` });
  }
  if (todayLoss > 0) {
    if (todayLoss >= (primary?.dailyLossLimit ?? Infinity)) {
      warnings.push({ tone: "danger", text: "Daily loss limit reached — today is over. Close the charts and review tomorrow." });
    } else if (riskUsed >= 0.6) {
      warnings.push({ tone: "danger", text: `You're approaching your daily loss limit (${Math.round(riskUsed * 100)}% used). One more loss likely ends the day.` });
    }
  }
  if (exposure > riskPerTrade && riskPerTrade > 0) {
    warnings.push({ tone: "warn", text: `Current open risk ($${exposure.toLocaleString()}) exceeds your 1% rule ($${riskPerTrade.toLocaleString()}).` });
  }
  if (openCount > 2) {
    warnings.push({ tone: "warn", text: `${openCount} open positions at once — multi-position exposure reduces your ability to react fast.` });
  }
  if (!warnings.length) {
    warnings.push({ tone: "ok", text: "No red flags. Risk is under control today." });
  }
  return { todayLoss, tradesToday, winsToday, riskUsed, exposure, riskPerTrade, openCount, warnings };
}

/* ------------------------------------------------------------------ */
/* "Why did I lose?" — mistake mining                                   */
/* ------------------------------------------------------------------ */

export interface MistakeRow {
  tag: string;
  count: number;
  pnl: number;
  avgR: number;
}

/**
 * Ephemeral, deterministic review for trades the user never rated —
 * lets the analyzer always show patterns (marked as simulated).
 */
export function simReview(trade: Trade): TradeReview {
  const rnd = mulberry32(hashStr(`rev-${trade.id}`));
  const tags: string[] = [];
  const pick = (p: number, t: string) => {
    if (rnd() < p) tags.push(t);
  };
  pick(0.42, "Early Entry");
  pick(0.26, "No Confirmation");
  pick(0.22, "Chased");
  pick(0.18, "Moved Stop");
  pick(0.16, "Held Too Long");
  pick(0.12, "Cut Too Early");
  pick(0.1, "FOMO");
  pick(0.08, "Revenge");
  pick(0.08, "Oversized");
  const checks: Record<string, boolean> = {};
  const nRules = 5 + Math.floor(rnd() * 4);
  for (let i = 0; i < nRules; i++) checks[`r${i}`] = rnd() > 0.4;
  return { playbookId: undefined, checks, whyMissed: {}, mistakeTags: tags, notes: {}, psych: {} };
}

export function reviewFor(trade: Trade, reviews: Record<string, TradeReview>): TradeReview {
  return reviews[trade.id] ?? simReview(trade);
}

export function analyzeLosses(trades: Trade[], reviews: Record<string, TradeReview>, n = 50): { rows: MistakeRow[]; top: string; simulated: boolean } {
  const losers = trades.filter((t) => t.pnl < 0).sort((a, b) => b.ts - a.ts).slice(0, n);
  const count = new Map<string, { count: number; pnl: number; r: number }>();
  let simulated = false;
  for (const t of losers) {
    const rev = reviews[t.id];
    if (!rev) simulated = true;
    const tags = (rev ?? simReview(t)).mistakeTags;
    if (!tags.length) continue;
    for (const tag of tags) {
      const e = count.get(tag) ?? { count: 0, pnl: 0, r: 0 };
      e.count++;
      e.pnl += t.pnl;
      e.r += t.r;
      count.set(tag, e);
    }
  }
  const rows: MistakeRow[] = [...count.entries()]
    .map(([tag, e]) => ({ tag, count: e.count, pnl: e.pnl, avgR: e.count ? e.r / e.count : 0 }))
    .sort((a, b) => b.count - a.count);
  const top = rows[0]?.tag ?? "—";
  return { rows, top, simulated };
}

/** Best-condition mining: which dimension (session/strategy/side) concentrates your edge. */
export function bestConditions(trades: Trade[], dim: "session" | "strategy" | "side", min = 3) {
  const m = new Map<string, { count: number; wins: number; r: number; pnl: number }>();
  for (const t of trades) {
    const k = t[dim];
    const e = m.get(k) ?? { count: 0, wins: 0, r: 0, pnl: 0 };
    e.count++;
    e.r += t.r;
    e.pnl += t.pnl;
    if (t.pnl > 0) e.wins++;
    m.set(k, e);
  }
  return [...m.entries()]
    .filter(([, e]) => e.count >= min)
    .map(([key, e]) => ({ key, count: e.count, winRate: (e.wins / e.count) * 100, avgR: e.r / e.count, pnl: e.pnl }))
    .sort((a, b) => b.avgR - a.avgR);
}
