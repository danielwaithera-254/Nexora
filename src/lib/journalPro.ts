import type { Trade } from "../data/trades";

/* ---------- Calendar insights (LuxAlgo docs/calendar-insights.md) ---------- */

export interface CalendarInsight {
  title: string;
  detail: string;
  tone: "gain" | "loss" | "brand" | "warn";
}

export function calendarInsights(trades: Trade[], month?: Date): CalendarInsight[] {
  const out: CalendarInsight[] = [];
  if (!trades.length) return out;
  const m = month ?? new Date();
  const inMonth = trades.filter((t) => {
    const d = new Date(t.ts);
    return d.getMonth() === m.getMonth() && d.getFullYear() === m.getFullYear();
  });
  const pool = inMonth.length ? inMonth : trades;
  const byDay = new Map<string, number>();
  for (const t of pool) byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.pnl);
  const days = [...byDay.entries()];
  const net = days.reduce((s, [, v]) => s + v, 0);
  const avg = days.length ? net / days.length : 0;
  const green = days.filter(([, v]) => v > 0).length;
  const best = days.length ? [...days].sort((a, b) => b[1] - a[1])[0]! : null;
  const worst = days.length ? [...days].sort((a, b) => a[1] - b[1])[0]! : null;
  out.push({
    tone: net >= 0 ? "gain" : "loss",
    title: `${green}/${days.length} green days · ${net >= 0 ? "+" : ""}$${Math.round(net).toLocaleString()} net`,
    detail: `Avg ${avg >= 0 ? "+" : ""}$${Math.round(avg).toLocaleString()}/day across ${days.length} trading days.`,
  });
  if (best) out.push({ tone: "gain", title: `Best day ${best[0].slice(5)}`, detail: `+$${Math.round(best[1]).toLocaleString()} — what setup repeated?` });
  if (worst && worst[1] < 0) out.push({ tone: "loss", title: `Worst day ${worst[0].slice(5)}`, detail: `-$${Math.round(Math.abs(worst[1])).toLocaleString()} — size down until stats recover.` });
  // weekday edge
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const agg = new Map<string, number>();
  for (const t of pool) {
    const d = wd[new Date(t.ts).getDay()]!;
    agg.set(d, (agg.get(d) ?? 0) + t.pnl);
  }
  const pos = [...agg.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0];
  if (pos) out.push({ tone: "brand", title: `${pos[0]} is your weekday edge`, detail: `+$${Math.round(pos[1]).toLocaleString()} net on ${pos[0]}s in view.` });
  return out.slice(0, 4);
}

/* ---------- Trade explorer: rolling trends + cross-analysis ---------- */

export function rollingSeries(trades: Trade[], window = 10) {
  const sorted = [...trades].sort((a, b) => a.ts - b.ts);
  let acc = 0;
  return sorted.map((t, i) => {
    acc += t.pnl;
    const slice = sorted.slice(Math.max(0, i - window + 1), i + 1);
    const wins = slice.filter((x) => x.pnl > 0).length;
    return {
      date: t.date,
      id: t.id,
      equity: acc,
      rollWinRate: slice.length ? (wins / slice.length) * 100 : 0,
      rollAvg: slice.length ? slice.reduce((s, x) => s + x.pnl, 0) / slice.length : 0,
    };
  });
}

export function crossMatrix(trades: Trade[], rowKey: (t: Trade) => string, colKey: (t: Trade) => string) {
  const rows = [...new Set(trades.map(rowKey))].sort();
  const cols = [...new Set(trades.map(colKey))].sort();
  const cell = (r: string, c: string) => {
    const list = trades.filter((t) => rowKey(t) === r && colKey(t) === c);
    const net = list.reduce((s, t) => s + t.pnl, 0);
    const wr = list.length ? (list.filter((t) => t.pnl > 0).length / list.length) * 100 : 0;
    return { count: list.length, net, winRate: wr };
  };
  return { rows, cols, cell };
}

/* ---------- Playbook adherence ---------- */

export interface PlaybookRule { id: string; label: string; }
export interface Playbook {
  id: string;
  name: string;
  description: string;
  rules: PlaybookRule[];
  createdAt: number;
}

export function scoreAdherence(checkedRuleIds: string[], playbook: Playbook): number {
  if (!playbook.rules.length) return 0;
  return Math.round((checkedRuleIds.length / playbook.rules.length) * 100);
}

/* ---------- MAE/MFE estimation (candle-based, LuxAlgo market-data model) ---------- */

export interface Candle { time: number; open: number; high: number; low: number; close: number; }

export function estimateMaeMfe(entry: number, side: "Long" | "Short", candles: Candle[], qty = 1, multiplier = 1) {
  if (!candles.length) return null;
  let mae = 0;
  let mfe = 0;
  for (const c of candles) {
    if (side === "Long") {
      mae = Math.min(mae, (c.low - entry) * qty * multiplier);
      mfe = Math.max(mfe, (c.high - entry) * qty * multiplier);
    } else {
      mae = Math.min(mae, (entry - c.high) * qty * multiplier);
      mfe = Math.max(mfe, (entry - c.low) * qty * multiplier);
    }
  }
  return { mae: Math.round(mae), mfe: Math.round(mfe) };
}

export function parseCandleCSV(text: string): Candle[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const heads = lines[0]!.split(",").map((h) => h.trim().toLowerCase());
  const ci = (n: string) => heads.indexOf(n);
  const iT = Math.max(ci("time"), ci("timestamp"), ci("datetime"), ci("date"), 0);
  const iO = ci("open"), iH = ci("high"), iL = ci("low"), iC = ci("close");
  if (iO < 0 || iH < 0 || iL < 0 || iC < 0) return [];
  const out: Candle[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i]!.split(",");
    const t = Date.parse((c[iT] ?? "").trim());
    if (isNaN(t)) continue;
    out.push({
      time: t,
      open: parseFloat(c[iO] ?? "0") || 0,
      high: parseFloat(c[iH] ?? "0") || 0,
      low: parseFloat(c[iL] ?? "0") || 0,
      close: parseFloat(c[iC] ?? "0") || 0,
    });
  }
  return out.sort((a, b) => a.time - b.time);
}

/* ---------- Prop firm cash ledger (LuxAlgo docs/prop-firms.md metric contract) ---------- */

export type PropPhase = "evaluation" | "verification" | "funded" | "instant" | "live";
export type PropAccountStatus = "active" | "passed" | "breached" | "closed" | "archived";
export type PropEntryKind = "expense" | "refund" | "receipt" | "reversal";
export type ExpenseCategory = "evaluation" | "reset" | "activation" | "subscription" | "platform" | "market_data" | "transfer" | "other";

export interface PropAccount {
  id: string;
  firm: string;
  name: string;
  currency: string;
  phase: PropPhase;
  status: PropAccountStatus;
  openedAt: string;
  nominalSize?: number;
  renewalDate?: string;
  journalAccount?: string;
  notes?: string;
  createdAt: number;
}

export interface PropEntry {
  id: string;
  kind: PropEntryKind;
  firm: string;
  accountId?: string;
  currency: string;
  date: string; // YYYY-MM-DD payment/settlement date
  amount: number; // positive decimal
  category?: ExpenseCategory;
  expenseId?: string; // for refunds
  reference?: string;
  notes?: string;
  void?: boolean;
  createdAt: number;
}

export interface PayoutRequest {
  id: string;
  accountId: string;
  firm: string;
  currency: string;
  requestedAt: string;
  requestedGross: number;
  traderShareBps: number; // e.g. 9000 = 90%
  expectedFees: number;
  expectedAt?: string;
  status: "requested" | "approved" | "completed" | "rejected" | "cancelled";
  createdAt: number;
}

export const expectedNet = (p: PayoutRequest) =>
  Math.round(((p.requestedGross * p.traderShareBps) / 10000 - p.expectedFees) * 100) / 100;

export interface PropStats {
  spent: number;
  refunds: number;
  netSpend: number;
  received: number;
  netCash: number;
  cashRoi: number | null;
  outstanding: number;
  awaiting: number;
}

export function computePropStats(entries: PropEntry[], payouts: PayoutRequest[], currency?: string): PropStats {
  const live = entries.filter((e) => !e.void && (!currency || e.currency === currency));
  const spent = live.filter((e) => e.kind === "expense").reduce((s, e) => s + e.amount, 0);
  const refunds = live.filter((e) => e.kind === "refund").reduce((s, e) => s + e.amount, 0);
  const receipts = live.filter((e) => e.kind === "receipt").reduce((s, e) => s + e.amount, 0);
  const reversals = live.filter((e) => e.kind === "reversal").reduce((s, e) => s + e.amount, 0);
  const received = receipts - reversals;
  const netSpend = spent - refunds;
  const netCash = received + refunds - spent;
  const cashRoi = netSpend > 0 ? (netCash / netSpend) * 100 : null;
  // outstanding from open payouts
  const rel = payouts.filter((p) => (!currency || p.currency === currency) && (p.status === "requested" || p.status === "approved"));
  const outstanding = rel.reduce((s, p) => {
    const got = live.filter((e) => e.kind === "receipt" && (e as unknown as { payoutId?: string }).payoutId === (p as unknown as { id: string }).id).reduce((a, e) => a + e.amount, 0);
    return s + Math.max(expectedNet(p) - got, 0);
  }, 0);
  return { spent, refunds, netSpend, received, netCash, cashRoi, outstanding, awaiting: outstanding };
}

export function propCashTemplate(): string {
  return [
    "id,kind,firm,account_id,currency,date,amount,category,expense_id,reference,notes",
    "eval-001,expense,FundedNext,acc-1,USD,2026-01-05,49,evaluation,,INV-001,First evaluation",
    "eval-001-r1,refund,FundedNext,acc-1,USD,2026-02-01,49,,,eval-001,Pass refund",
    "pay-001,payout,FundedNext,acc-1,USD,2026-03-10,890,,,,,March payout received",
  ].join("\n");
}
