export type Side = "Long" | "Short";

export interface Trade {
  id: string;
  date: string; // yyyy-mm-dd
  ts: number;
  symbol: string;
  side: Side;
  strategy: string;
  account: string;
  session: string;
  qty: number;
  entry: number;
  exit: number;
  risk: number;
  r: number;
  pnl: number;
  planned: boolean;
}

export const SYMBOLS = ["NQ", "ES", "CL", "GC", "6E", "SI"] as const;
export const STRATEGIES = ["Breakout", "Pullback", "Reversal", "News", "Scalp"] as const;
export const ACCOUNTS = ["Main Futures", "Prop Firm", "Swing"] as const;
export const SESSIONS = ["New York", "London", "Asia"] as const;

const BASE_PRICE: Record<string, number> = {
  NQ: 15420,
  ES: 4780,
  CL: 78.4,
  GC: 2034,
  "6E": 1.084,
  SI: 24.16,
};

const RISK_BY_ACCOUNT: Record<string, number> = {
  "Main Futures": 250,
  "Prop Firm": 500,
  Swing: 150,
};

/* deterministic PRNG so the journal looks identical on every load */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

export function generateTrades(): Trade[] {
  const rnd = mulberry32(20260214);
  const trades: Trade[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const DAYS = 150;

  let idc = 1;
  for (let d = DAYS; d >= 0; d--) {
    const day = new Date(today);
    day.setDate(today.getDate() - d);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue; // markets closed

    // regime: solid start, rough patch ~45% in, recovery toward now
    const t = 1 - d / DAYS;
    const regime =
      0.56 + 0.1 * Math.sin(t * Math.PI * 2.2) - (t > 0.42 && t < 0.58 ? 0.28 : 0) + t * 0.06;
    const winP = Math.min(0.78, Math.max(0.24, regime + (rnd() - 0.5) * 0.12));

    const count = rnd() < 0.12 ? 0 : 1 + Math.floor(rnd() * (rnd() < 0.3 ? 4 : 3));
    for (let i = 0; i < count; i++) {
      const symbol = SYMBOLS[Math.floor(rnd() * SYMBOLS.length)];
      const account = ACCOUNTS[rnd() < 0.55 ? 0 : rnd() < 0.75 ? 1 : 2];
      const strategy = STRATEGIES[Math.floor(rnd() * STRATEGIES.length)];
      const session = SESSIONS[rnd() < 0.62 ? 0 : rnd() < 0.6 ? 1 : 2];
      const side: Side = rnd() < 0.54 ? "Long" : "Short";
      const risk = RISK_BY_ACCOUNT[account];

      let r: number;
      const roll = rnd();
      if (roll < winP) {
        // winners: mostly 1R–2.5R, occasional runner
        r = 0.4 + Math.pow(rnd(), 1.6) * 2.2 + (rnd() < 0.08 ? rnd() * 3 : 0);
      } else if (roll < winP + 0.07) {
        r = (rnd() - 0.5) * 0.3; // breakeven / scratch
      } else {
        r = -(0.3 + Math.pow(rnd(), 1.4) * 1.9); // losers cut near -1R..-2R
      }
      r = Math.round(r * 100) / 100;
      const pnl = Math.round(r * risk);

      const base = BASE_PRICE[symbol];
      const dec = symbol === "6E" ? 4 : symbol === "CL" || symbol === "SI" ? 2 : 1;
      const movePct = (Math.abs(r) * risk) / 4200;
      const entry = +(base * (1 + (rnd() - 0.5) * 0.01)).toFixed(dec);
      const dir = side === "Long" ? (r >= 0 ? 1 : -1) : r >= 0 ? -1 : 1;
      const exit = +(entry * (1 + dir * movePct)).toFixed(dec);
      const qty = Math.max(1, Math.round((risk * 8) / (base * 0.004)));

      trades.push({
        id: `T-${String(idc++).padStart(4, "0")}`,
        date: iso(day),
        ts: day.getTime(),
        symbol,
        side,
        strategy,
        account,
        session,
        qty,
        entry,
        exit,
        risk,
        r,
        pnl,
        planned: rnd() < (r >= 0 ? 0.86 : 0.62),
      });
    }
  }
  return trades;
}

/* ---------- CSV import / export (matches a Python backtest/journal export) ---------- */

export function parseTradesCSV(text: string): Trade[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length < 2) return [];
  const head = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (k: string) => head.indexOf(k);
  const iDate = idx("date");
  const iSym = idx("symbol");
  if (iDate < 0 || iSym < 0) return [];

  const out: Trade[] = [];
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(",").map((s) => s.trim());
    const dateRaw = c[iDate];
    const d = new Date(dateRaw);
    if (isNaN(d.getTime())) continue;
    d.setHours(0, 0, 0, 0);
    const pnl = parseFloat(c[idx("pnl")] ?? "0") || 0;
    const risk = Math.abs(parseFloat(c[idx("risk")] ?? "250") || 250);
    const r = idx("r") >= 0 ? parseFloat(c[idx("r")]) || pnl / risk : pnl / risk;
    const symbol = c[iSym].toUpperCase();
    out.push({
      id: `IMP-${i}-${Date.now() % 100000}`,
      date: iso(d),
      ts: d.getTime(),
      symbol,
      side: (c[idx("side")] ?? "long").toLowerCase().startsWith("s") ? "Short" : "Long",
      strategy: c[idx("strategy")] || "Imported",
      account: c[idx("account")] || "Main Futures",
      session: c[idx("session")] || "New York",
      qty: parseInt(c[idx("qty")] ?? "1") || 1,
      entry: parseFloat(c[idx("entry")] ?? "0") || 0,
      exit: parseFloat(c[idx("exit")] ?? "0") || 0,
      risk,
      r: Math.round(r * 100) / 100,
      pnl: Math.round(pnl),
      planned: (c[idx("planned")] ?? "true").toLowerCase() !== "false",
    });
  }
  return out;
}

export function tradesToCSV(trades: Trade[]): string {
  const head = "date,symbol,side,strategy,account,session,qty,entry,exit,risk,r,pnl,planned";
  const rows = trades.map((t) =>
    [
      t.date,
      t.symbol,
      t.side,
      t.strategy,
      t.account,
      t.session,
      t.qty,
      t.entry,
      t.exit,
      t.risk,
      t.r,
      t.pnl,
      t.planned,
    ].join(",")
  );
  return [head, ...rows].join("\n");
}

/* ---------- MetaTrader 5 CSV import ---------- */

/* ---------- proper CSV row parser (handles quoted fields) ---------- */

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ",") { out.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

/* ---------- MetaTrader 5 CSV import ---------- */

const MT5_HEADER_MAP: Record<string, string> = {
  ticket: "ticket",
  "ticket #": "ticket",
  "deal #": "ticket",
  "open time": "open_time",
  time: "open_time",
  type: "type",
  size: "size",
  volume: "size",
  symbol: "symbol",
  "open price": "open_price",
  price: "open_price",
  "s/l": "sl",
  "stop loss": "sl",
  "t/p": "tp",
  "take profit": "tp",
  "close time": "close_time",
  "close price": "close_price",
  commission: "commission",
  swap: "swap",
  profit: "profit",
  comment: "comment",
};

const MT5_DATE_RE = /(\d{4})[./-](\d{1,2})[./-](\d{1,2})/;

export function parseMT5CSV(text: string): Trade[] {
  const raw = text.replace(/^\uFEFF/, "").trim();
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const head = parseCSVLine(lines[0]).map((h) => h.toLowerCase());

  const idxMap: Record<string, number> = {};
  for (let i = 0; i < head.length; i++) {
    const mapped = MT5_HEADER_MAP[head[i]];
    if (mapped && !(mapped in idxMap)) idxMap[mapped] = i;
  }

  const idx = (k: string) => idxMap[k] ?? -1;
  const iOpen = idx("open_time");
  const iType = idx("type");
  const iSym = idx("symbol");
  const iProfit = idx("profit");

  if (iOpen < 0 || iType < 0 || iSym < 0 || iProfit < 0) return [];

  const iTicket = idx("ticket");
  const iSize = idx("size");
  const iOpenP = idx("open_price");
  const iCloseP = idx("close_price");
  const iCommission = idx("commission");
  const iSwap = idx("swap");

  const parseDate = (raw: string): Date | null => {
    const m = raw.match(MT5_DATE_RE);
    if (!m) return null;
    const d = new Date(`${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}T${raw.includes(":") ? raw.split(/\s+/)[1] || "00:00:00" : "00:00:00"}`);
    return isNaN(d.getTime()) ? null : d;
  };

  const out: Trade[] = [];
  let idc = 1;

  for (let i = 1; i < lines.length; i++) {
    const c = parseCSVLine(lines[i]);
    if (c.length <= Math.max(iOpen, iType, iSym, iProfit)) continue;

    const openRaw = c[iOpen] || "";
    const openDate = parseDate(openRaw);
    if (!openDate) continue;

    const profit = parseFloat(c[iProfit]);
    if (isNaN(profit)) continue;

    const commission = iCommission >= 0 ? parseFloat(c[iCommission]) || 0 : 0;
    const swap = iSwap >= 0 ? parseFloat(c[iSwap]) || 0 : 0;
    const totalPnL = Math.round((profit + commission + swap) * 100) / 100;
    if (totalPnL === 0) continue; // skip breakeven / still open

    const typeRaw = (c[iType] || "").toLowerCase();
    const side: Side = typeRaw === "buy" || typeRaw.includes("buy") ? "Long" : "Short";

    const qty = iSize >= 0 ? parseFloat(c[iSize]) || 0.01 : 0.01;
    const symbol = (c[iSym] || "").toUpperCase();
    const entry = iOpenP >= 0 ? parseFloat(c[iOpenP]) || 0 : 0;
    const exit = iCloseP >= 0 ? parseFloat(c[iCloseP]) || 0 : 0;

    const risk = Math.max(1, Math.abs(Math.round(totalPnL * 0.6)));
    const r = risk > 0 ? Math.round((totalPnL / risk) * 100) / 100 : 0;

    const ts = openDate.getTime();
    const dateStr = `${openDate.getFullYear()}-${String(openDate.getMonth() + 1).padStart(2, "0")}-${String(openDate.getDate()).padStart(2, "0")}`;

    out.push({
      id: `MT5-${iTicket >= 0 ? c[iTicket] : String(idc++).padStart(4, "0")}-${ts % 100000}`,
      date: dateStr,
      ts,
      symbol,
      side,
      strategy: "Imported",
      account: "MT5",
      session: openDate.getHours() < 12 ? "New York" : openDate.getHours() < 18 ? "London" : "Asia",
      qty: Math.max(0.01, qty),
      entry,
      exit,
      risk,
      r,
      pnl: totalPnL,
      planned: false,
    });
  }
  return out;
}

/* ---------- MT5 full detailed report import (Positions / Orders / Deals / Results) ---------- */

export interface MT5Report {
  isReport: boolean;
  accountName: string;
  accountNum: string;
  company: string;
  reportDate: string;
  results: Record<string, string>;
  trades: Trade[];
}

export interface ImportResult {
  trades: Trade[];
  report: MT5Report | null;
}

const MT5_SECTION_LABELS = new Set([
  "positions",
  "orders",
  "deals",
  "transactions",
  "results",
  "deposits and withdrawals",
]);

/* parses MT5 numbers: "3 403.55", " 835.00", "100 000.00", "1,000.50", "1.000,50" */
function mt5num(raw: string | undefined | null): number {
  if (raw == null || String(raw).trim() === "") return 0;
  let s = String(raw).replace(/[\s\u00a0]/g, "");
  if (s.includes(".") && s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function mt5DateTime(raw: string | undefined): Date | null {
  if (!raw) return null;
  const m = String(raw).match(MT5_DATE_RE);
  if (!m) return null;
  const time = String(raw).split(/\s+/)[1] || "00:00:00";
  const d = new Date(`${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}T${time}`);
  return isNaN(d.getTime()) ? null : d;
}

function sessionOf(hour: number): string {
  return hour < 12 ? "New York" : hour < 18 ? "London" : "Asia";
}

/**
 * Parses a MetaTrader 5 "Detailed Report" CSV export, which is a multi-section
 * report: metadata header (Name/Account/Company/Date), then Positions, Orders,
 * Deals and Results tables.
 *
 * Closed positions are read from the Positions table (one row per position with
 * aggregated P&L); if that table is missing, closing deals (direction = "out")
 * from the Deals table are used instead.
 */
export function parseMT5DetailedReport(text: string): MT5Report {
  const out: MT5Report = {
    isReport: false,
    accountName: "",
    accountNum: "",
    company: "",
    reportDate: "",
    results: {},
    trades: [],
  };
  const src = text.replace(/^\uFEFF/, "");
  const lines = src.split(/\r?\n/);
  if (lines.length < 5) return out;

  const low = src.toLowerCase();
  if (!/^\s*(positions|deals)\s*$/im.test(low) && !low.includes("positions") && !low.includes("deals")) {
    return out;
  }
  out.isReport = true;

  let posCols: Record<string, number> | null = null;
  let dealCols: Record<string, number> | null = null;
  let rowsFor: "positions" | "deals" | null = null;
  let afterResults = false;
  const positions: string[][] = [];
  const deals: string[][] = [];

  const resetRows = () => {
    rowsFor = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cells = parseCSVLine(line);
    const others = cells.filter((c) => c.trim());

    // ---- section labels ("Positions", "Orders", "Deals", "Results", ...)
    if (others.length === 1 && MT5_SECTION_LABELS.has(others[0].trim().toLowerCase())) {
      const label = others[0].trim().toLowerCase();
      if (label !== "positions" && label !== "deals") resetRows();
      afterResults = label === "results";
      continue;
    }

    // ---- table headers (duplicate "time"/"price" columns → open + close)
    const names = cells.map((c) => c.trim().toLowerCase());
    const isPosHeader = names.includes("profit") && names.includes("position") && names.includes("symbol");
    const isDealHeader = names.includes("profit") && names.includes("direction") && names.includes("deal");
    if (isPosHeader || isDealHeader) {
      const map: Record<string, number> = {};
      names.forEach((n, ci) => {
        if (!(n in map)) map[n] = ci;
        else {
          const dup = n === "time" ? "time2" : n === "price" ? "price2" : null;
          if (dup && !(dup in map)) map[dup] = ci;
        }
      });
      if (isPosHeader) {
        posCols = map;
        rowsFor = "positions";
      } else {
        dealCols = map;
        rowsFor = "deals";
      }
      continue;
    }

    // ---- metadata (Name / Account / Company / Date) — always before Results
    if (i < 8 && /^\w[\w ./-]*:\s*$/.test((cells[0] || "").trim())) {
      const key = (cells[0] || "").trim().replace(":", "").toLowerCase();
      const val = cells.slice(1).find((c) => c.trim()) || "";
      if (key === "name") out.accountName = val.trim();
      else if (key === "account") {
        out.accountNum = (val.trim().match(/\d[\d ]*/) || [""])[0].replace(/\s/g, "");
      } else if (key === "company") out.company = val.trim();
      else if (key === "date") {
        const d = mt5DateTime(val);
        out.reportDate = d ? iso(d) : val.trim();
      }
      continue;
    }

    // ---- results rows + balance lines: "Key: ,, value" pairs
    if (afterResults || /^\w[\w ./%()'-]*:\s*$/.test((cells[0] || "").trim())) {
      for (let ci = 0; ci < cells.length; ci++) {
        const m = (cells[ci] || "").trim().match(/^(.+?):\s*$/);
        if (!m) continue;
        const key = m[1].trim().toLowerCase();
        let val = ci + 3 < cells.length ? (cells[ci + 3] || "").trim() : "";
        if (!val) {
          const limit = Math.min(cells.length, ci + 6);
          for (let k = ci + 1; k < limit; k++) {
            const ck = (cells[k] || "").trim();
            if (ck && !/^.+:\s*$/.test(ck)) {
              val = ck;
              break;
            }
          }
        }
        if (val) out.results[key] = val;
      }
      continue;
    }

    // ---- data rows of the active table
    const first = (cells[0] || "").trim();
    if (first && rowsFor === "positions") {
      positions.push(cells);
      continue;
    }
    if (first && rowsFor === "deals") {
      deals.push(cells);
      continue;
    }
  }

  const pick = (cols: Record<string, number> | null, row: string[], name: string): string | undefined => {
    if (!cols) return undefined;
    const i = cols[name];
    return i !== undefined && i < row.length ? (row[i] || "").trim() : undefined;
  };

  const toTrade = (
    ts: number,
    symbol: string,
    side: Side,
    volume: number,
    entry: number,
    exit: number,
    pnl: number,
    ticket: string
  ): Trade => {
    const d = new Date(ts);
    const risk = Math.max(1, Math.abs(Math.round(pnl * 0.6)));
    return {
      id: `MT5R-${ticket || String(ts % 100000)}-${ts % 100000}`,
      date: iso(d),
      ts,
      symbol,
      side,
      strategy: "Imported",
      account: out.accountNum ? `MT5-${out.accountNum}` : "MT5",
      session: sessionOf(d.getHours()),
      qty: Math.max(0.01, volume),
      entry,
      exit,
      risk,
      r: risk > 0 ? Math.round((pnl / risk) * 100) / 100 : 0,
      pnl,
      planned: false,
    };
  };

  if (posCols && positions.length) {
    for (const row of positions) {
      const open = mt5DateTime(pick(posCols, row, "time"));
      const close = mt5DateTime(pick(posCols, row, "time2"));
      const ts = (open ?? close)?.getTime();
      if (!ts) continue;
      const symbol = (pick(posCols, row, "symbol") || "").toUpperCase();
      if (!symbol) continue;
      const profitRaw = pick(posCols, row, "profit") || "";
      if (!profitRaw && !close) continue; // still-open position, no realized P&L
      const typeRaw = (pick(posCols, row, "type") || "").toLowerCase();
      const side: Side = typeRaw === "buy" || typeRaw.includes("buy") ? "Long" : "Short";
      const pnl = Math.round(
        (mt5num(profitRaw) +
          mt5num(pick(posCols, row, "commission")) +
          mt5num(pick(posCols, row, "swap"))) *
          100
      ) / 100;
      out.trades.push(
        toTrade(
          ts,
          symbol,
          side,
          mt5num(pick(posCols, row, "volume")),
          mt5num(pick(posCols, row, "price")),
          mt5num(pick(posCols, row, "price2")),
          pnl,
          pick(posCols, row, "position") || ""
        )
      );
    }
  }

  /* fallback: closing deals (direction = "out") when no Positions table */
  if (out.trades.length === 0 && dealCols && deals.length) {
    const entries = new Map<string, { price: number; time: number }>();
    for (const row of deals) {
      const dir = (pick(dealCols, row, "direction") || "").toLowerCase();
      const order = pick(dealCols, row, "order") || "";
      if (dir === "in" && order) {
        const pr = mt5num(pick(dealCols, row, "price"));
        const tm = mt5DateTime(pick(dealCols, row, "time"))?.getTime() || 0;
        entries.set(order, { price: pr, time: tm });
      }
    }
    for (const row of deals) {
      const dir = (pick(dealCols, row, "direction") || "").toLowerCase();
      if (dir !== "out") continue;
      const symbol = (pick(dealCols, row, "symbol") || "").toUpperCase();
      if (!symbol) continue;
      const typeRaw = (pick(dealCols, row, "type") || "").toLowerCase();
      const outDate = mt5DateTime(pick(dealCols, row, "time"));
      const ts = outDate?.getTime() || Date.now();
      const order = pick(dealCols, row, "order") || "";
      const entryDeal = entries.get(order);
      const pnl = Math.round(
        (mt5num(pick(dealCols, row, "profit")) +
          mt5num(pick(dealCols, row, "commission")) +
          mt5num(pick(dealCols, row, "swap"))) *
          100
      ) / 100;
      out.trades.push(
        toTrade(
          ts,
          symbol,
          typeRaw === "buy" || typeRaw.includes("buy") ? "Short" : "Long", // closing side is opposite
          mt5num(pick(dealCols, row, "volume")),
          entryDeal ? entryDeal.price : mt5num(pick(dealCols, row, "price")),
          mt5num(pick(dealCols, row, "price")),
          pnl,
          pick(dealCols, row, "deal") || ""
        )
      );
    }
  }

  return out;
}

/**
 * Auto-detects the CSV flavor and parses it:
 * 1. MT5 detailed report (Positions/Deals/Results)  2. simple MT5 export
 * 3. Nexora journal CSV (date,symbol,side,...)
 * Pass `accountName` to stamp every imported trade with that account.
 */
export function parseImportFile(text: string, accountName?: string): ImportResult {
  const stamp = (list: Trade[]) => (accountName ? list.map((t) => ({ ...t, account: accountName })) : list);
  const report = parseMT5DetailedReport(text);
  if (report.trades.length) return { trades: stamp(report.trades), report };
  const mt5 = parseMT5CSV(text);
  if (mt5.length) return { trades: stamp(mt5), report: null };
  const simple = parseTradesCSV(text);
  return { trades: stamp(simple), report: null };
}

export function sampleCSV(): string {
  return [
    "date,symbol,side,strategy,account,session,qty,entry,exit,risk,r,pnl,planned",
    "2026-02-10,NQ,Long,Breakout,Main Futures,New York,2,15402.5,15468.0,250,1.8,450,true",
    "2026-02-11,ES,Short,Reversal,Prop Firm,New York,4,4776.0,4781.5,500,-1.0,-500,true",
    "2026-02-12,GC,Long,Pullback,Swing,London,1,2031.2,2044.8,150,2.2,330,true",
  ].join("\n");
}
