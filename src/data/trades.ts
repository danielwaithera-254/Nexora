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
  // ---------- MT5 / Trade History Report detection ----------
  // MT5 exports have a header like "Trade History Report", "Positions" section with
  // columns: Time,Position,Symbol,Type,Volume,Price,S / L,T / P,Time,Price,Commission,Swap,Profit
  const rawLines = text.split(/\r?\n/);
  const isMT5 = /Positions/i.test(text) && /Profit/i.test(text) && /Time\s*,\s*Position/i.test(text);
  if (isMT5) {
    // try to extract account label from header like: Account: 127447 (USD, HolaPrime-Server1, demo)
    let reportAccount = "";
    for (const l of rawLines.slice(0, 15)) {
      const m = l.match(/Account:\s*,*"?\s*([^,"]+)/i);
      if (m) { reportAccount = m[1].trim().replace(/\(.*/, "").trim(); break; }
      const m2 = l.match(/Name:\s*,*([^,]+)/i);
      if (m2 && !reportAccount) reportAccount = m2[1].trim().substring(0, 30);
    }
    if (!reportAccount) reportAccount = "MT5 Import";

    // find header row index
    let headerIdx = -1;
    for (let i = 0; i < rawLines.length; i++) {
      if (/Time\s*,\s*Position\s*,\s*Symbol/i.test(rawLines[i]) && /Profit/i.test(rawLines[i])) { headerIdx = i; break; }
    }
    if (headerIdx >= 0) {
      const out: Trade[] = [];
      const cleanNum = (s: string) => {
        if (!s) return 0;
        const t = s.replace(/[\s\u00A0]/g, "").replace(/,/g, "");
        const n = parseFloat(t);
        return isNaN(n) ? 0 : n;
      };
      const toIsoDate = (raw: string) => {
        const datePart = raw.trim().split(" ")[0]; // "2026.07.29"
        if (!datePart) return "";
        const isoDate = datePart.replace(/\./g, "-");
        // validate yyyy-mm-dd
        if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "";
        return isoDate;
      };
      const toTs = (isoDate: string) => {
        const d = new Date(isoDate + "T12:00:00");
        return isNaN(d.getTime()) ? Date.now() : d.getTime();
      };
      for (let i = headerIdx + 1; i < rawLines.length; i++) {
        const line = rawLines[i];
        if (!line.trim()) continue;
        if (/^(Orders|Deals|Results|Balance|Credit|Floating|Equity)\b/i.test(line.trim())) break;
        // split by comma — Positions rows have 13 cols
        const cols = line.split(",").map(s => s.trim());
        if (cols.length < 10) continue;
        const timeRaw = cols[0];
        const symbolRaw = cols[2];
        const typeRaw = cols[3];
        const volumeRaw = cols[4];
        const priceOpenRaw = cols[5];
        const priceCloseRaw = cols[9];
        const commRaw = cols[10];
        const swapRaw = cols[11];
        const profitRaw = cols[12];
        if (!timeRaw || !symbolRaw || !typeRaw) continue;
        // skip header repeats or non-trade rows
        if (/^Time$/i.test(timeRaw) || /^Position$/i.test(cols[1])) continue;
        const isoDate = toIsoDate(timeRaw);
        if (!isoDate) continue;
        const symbol = symbolRaw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        if (!symbol || symbol.length < 2) continue;
        const side: Side = typeRaw.toLowerCase().startsWith("s") ? "Short" : "Long";
        const volume = cleanNum(volumeRaw);
        const qty = volume ? Math.max(1, Math.round(volume * 100)) : 1;
        const entry = cleanNum(priceOpenRaw);
        const exit = cleanNum(priceCloseRaw);
        const commission = cleanNum(commRaw);
        const swap = cleanNum(swapRaw);
        const profit = cleanNum(profitRaw);
        // net pnl = profit + commission + swap (commission is negative cost)
        const pnl = Math.round(profit + commission + swap);
        const risk = 250;
        const r = pnl / risk;
        out.push({
          id: `MT5-${cols[1] || i}-${Date.now() % 100000}`,
          date: isoDate,
          ts: toTs(isoDate),
          symbol,
          side,
          strategy: "Imported",
          account: reportAccount,
          session: "New York",
          qty,
          entry,
          exit: exit || entry,
          risk,
          r: Math.round(r * 100) / 100,
          pnl,
          planned: true,
        });
      }
      if (out.length) return out;
      // fall through to generic CSV if MT5 parse yielded nothing
    }
  }

  // ---------- Generic CSV (date,symbol,side,pnl ...) ----------
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

export function sampleCSV(): string {
  return [
    "date,symbol,side,strategy,account,session,qty,entry,exit,risk,r,pnl,planned",
    "2026-02-10,NQ,Long,Breakout,Main Futures,New York,2,15402.5,15468.0,250,1.8,450,true",
    "2026-02-11,ES,Short,Reversal,Prop Firm,New York,4,4776.0,4781.5,500,-1.0,-500,true",
    "2026-02-12,GC,Long,Pullback,Swing,London,1,2031.2,2044.8,150,2.2,330,true",
  ].join("\n");
}
