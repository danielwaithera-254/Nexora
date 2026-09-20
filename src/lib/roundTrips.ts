/**
 * Round-trip engine — flat-to-flat position cycles from raw fills.
 * Ported from LuxAlgo trade-journal `packages/core/src/round-trips.ts` (MIT),
 * simplified to Nexora's execution shape.
 *
 * - FIFO / LIFO / weighted-average per account+symbol
 * - Partial fills, scale-ins, flips (cross-through-flat split), futures multipliers
 * - Deterministic: time, then id
 */

export type ProfitMethod = "fifo" | "lifo" | "wavg";
export type Direction = "long" | "short";

export interface Execution {
  id: string;
  accountId: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  executedAt: string; // ISO
  fee?: number;
}

export interface RoundTrip {
  key: string;
  accountId: string;
  symbol: string;
  direction: Direction;
  status: "open" | "win" | "loss" | "breakeven";
  openedAt: string;
  closedAt?: string;
  quantity: number;
  openQuantity: number;
  avgEntry: number;
  avgExit?: number;
  grossPnl: number;
  fees: number;
  netPnl: number;
  executionCount: number;
  executionIds: string[];
  durationMs?: number;
}

const FLAT_EPS = 1e-9;
const sum = (v: number[]) => v.reduce((s, x) => s + x, 0);

interface Lot { quantity: number; price: number; }
interface Cycle {
  direction: Direction;
  openedAt: string;
  lots: Lot[];
  entryQty: number;
  entryNotional: number;
  exitQty: number;
  exitNotional: number;
  grossPnl: number;
  fees: number;
  executionIds: string[];
}

const openQty = (c: Cycle) => sum(c.lots.map((l) => l.quantity));

function consume(c: Cycle, qty: number, method: ProfitMethod): number {
  let remaining = qty;
  let matched = 0;
  if (method === "wavg") {
    const tq = openQty(c);
    const tn = sum(c.lots.map((l) => l.quantity * l.price));
    const avg = tq > 0 ? tn / tq : 0;
    matched = avg * qty;
    const scale = tq > 0 ? (tq - qty) / tq : 0;
    c.lots = c.lots.map((l) => ({ ...l, quantity: l.quantity * scale })).filter((l) => l.quantity > FLAT_EPS);
    return matched;
  }
  while (remaining > FLAT_EPS && c.lots.length) {
    const idx = method === "fifo" ? 0 : c.lots.length - 1;
    const lot = c.lots[idx]!;
    const take = Math.min(lot.quantity, remaining);
    matched += take * lot.price;
    lot.quantity -= take;
    remaining -= take;
    if (lot.quantity <= FLAT_EPS) c.lots.splice(idx, 1);
  }
  return matched;
}

export interface BuildRoundTripsOptions {
  method?: ProfitMethod;
  multipliers?: Record<string, number>;
}

export function buildRoundTrips(executions: Execution[], options: BuildRoundTripsOptions = {}): RoundTrip[] {
  const method = options.method ?? "fifo";
  const trips: RoundTrip[] = [];
  const collisions = new Map<string, number>();
  const groups = new Map<string, Execution[]>();
  for (const e of executions) {
    const k = `${e.accountId}\u0000${e.symbol}`;
    const g = groups.get(k);
    if (g) g.push(e);
    else groups.set(k, [e]);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => Date.parse(a.executedAt) - Date.parse(b.executedAt) || a.id.localeCompare(b.id));
    const { accountId, symbol } = group[0]!;
    const mult = options.multipliers?.[symbol] ?? 1;
    let cycle: Cycle | null = null;
    for (const e of group) {
      let signed = e.side === "buy" ? e.quantity : -e.quantity;
      let feeLeft = e.fee ?? 0;
      while (Math.abs(signed) > FLAT_EPS) {
        if (!cycle) {
          cycle = {
            direction: signed > 0 ? "long" : "short",
            openedAt: e.executedAt,
            lots: [],
            entryQty: 0,
            entryNotional: 0,
            exitQty: 0,
            exitNotional: 0,
            grossPnl: 0,
            fees: 0,
            executionIds: [],
          };
        }
        if (!cycle.executionIds.includes(e.id)) cycle.executionIds.push(e.id);
        const isEntry =
          (cycle.direction === "long" && signed > 0) || (cycle.direction === "short" && signed < 0);
        if (isEntry) {
          const q = Math.abs(signed);
          cycle.lots.push({ quantity: q, price: e.price });
          cycle.entryQty += q;
          cycle.entryNotional += q * e.price;
          cycle.fees += feeLeft;
          feeLeft = 0;
          signed = 0;
        } else {
          const oq = openQty(cycle);
          const exitQty = Math.min(Math.abs(signed), oq);
          const matched = consume(cycle, exitQty, method);
          const exitNot = exitQty * e.price;
          const chunk = cycle.direction === "long" ? (exitNot - matched) * mult : (matched - exitNot) * mult;
          const feeShare = Math.abs(signed) > 0 ? feeLeft * (exitQty / Math.abs(signed)) : 0;
          cycle.grossPnl += chunk;
          cycle.fees += feeShare;
          feeLeft -= feeShare;
          cycle.exitQty += exitQty;
          cycle.exitNotional += exitNot;
          signed += cycle.direction === "long" ? exitQty : -exitQty;
          if (openQty(cycle) <= FLAT_EPS) {
            const net = cycle.grossPnl - cycle.fees;
            const isOpen = false;
            void isOpen;
            const status = Math.abs(net) <= 1e-9 ? "breakeven" : net > 0 ? "win" : "loss";
            const base = `${accountId}|${symbol}|${cycle.direction}|${cycle.openedAt}`;
            const col = collisions.get(base) ?? 0;
            collisions.set(base, col + 1);
            trips.push({
              key: col === 0 ? base : `${base}|${col}`,
              accountId,
              symbol,
              direction: cycle.direction,
              status,
              openedAt: cycle.openedAt,
              closedAt: e.executedAt,
              quantity: cycle.entryQty,
              openQuantity: 0,
              avgEntry: cycle.entryQty > 0 ? cycle.entryNotional / cycle.entryQty : 0,
              avgExit: cycle.exitQty > 0 ? cycle.exitNotional / cycle.exitQty : undefined,
              grossPnl: Math.round(cycle.grossPnl * 100) / 100,
              fees: Math.round(cycle.fees * 100) / 100,
              netPnl: Math.round(net * 100) / 100,
              executionCount: cycle.executionIds.length,
              executionIds: [...cycle.executionIds],
              durationMs: Date.parse(e.executedAt) - Date.parse(cycle.openedAt),
            });
            cycle = null;
          }
        }
      }
      if (feeLeft !== 0 && cycle) cycle.fees += feeLeft;
    }
    if (cycle) {
      const net = cycle.grossPnl - cycle.fees;
      const base = `${accountId}|${symbol}|${cycle.direction}|${cycle.openedAt}`;
      const col = collisions.get(base) ?? 0;
      collisions.set(base, col + 1);
      trips.push({
        key: col === 0 ? base : `${base}|${col}`,
        accountId,
        symbol,
        direction: cycle.direction,
        status: "open",
        openedAt: cycle.openedAt,
        quantity: cycle.entryQty,
        openQuantity: openQty(cycle),
        avgEntry: cycle.entryQty > 0 ? cycle.entryNotional / cycle.entryQty : 0,
        avgExit: cycle.exitQty > 0 ? cycle.exitNotional / cycle.exitQty : undefined,
        grossPnl: Math.round(cycle.grossPnl * 100) / 100,
        fees: Math.round(cycle.fees * 100) / 100,
        netPnl: Math.round(net * 100) / 100,
        executionCount: cycle.executionIds.length,
        executionIds: [...cycle.executionIds],
      });
    }
  }
  trips.sort((a, b) => Date.parse(a.openedAt) - Date.parse(b.openedAt) || a.key.localeCompare(b.key));
  return trips;
}
