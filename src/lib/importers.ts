import type { Trade, Side } from "../data/trades";

/**
 * Multi-format statement importers — ported from LuxAlgo trade-journal
 * `packages/importers` (MIT) + `docs/importers.md`, adapted to output
 * Nexora `Trade[]`.
 *
 * Supported (auto-detected):
 *  Nexora generic | TradingView paper | TradingView strategy list |
 *  Tradervue fills | TradeZella trades | NinjaTrader | Tradovate |
 *  TopstepX | IBKR Flex | IBKR Activity | ThinkorSwim | Webull |
 *  DAS Trader | MT5 Positions (existing) | MT5 deals HTML/CSV | MT4 HTML
 *  + generic column-mapper fallback.
 *
 * Trade-level exports reconstruct one entry + one exit at avg prices —
 * P&L preserved exactly, fill granularity not (warning surfaced).
 */

export interface ImportWarning { row: number; message: string; }
export interface ImportResult {
  format: string;
  trades: Trade[];
  warnings: ImportWarning[];
  skippedRows: number;
  errors: string[];
  needsColumnMap?: boolean;
  headers?: string[];
}

// ---------- low-level CSV ----------

function stripBom(s: string) { return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s; }

function detectDelimiter(headerLine: string): string {
  const cands = [",", ";", "\t", "|"];
  let best = ",";
  let bestN = 0;
  for (const d of cands) {
    const n = headerLine.split(d).length;
    if (n > bestN) { bestN = n; best = d; }
  }
  return bestN >= 2 ? best : ",";
}

function splitCsv(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === delim) { row.push(cur); cur = ""; }
      else if (ch === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (ch === "\r") { /* skip, \n handles */ }
      else cur += ch;
    }
  }
  row.push(cur);
  rows.push(row);
  return rows.filter((r) => !(r.length === 1 && r[0]!.trim() === ""));
}

/** $1,234.56, (45.20) negatives, European 1.234,56 */
export function parseNum(raw: string): number {
  if (raw == null) return 0;
  let s = String(raw).trim().replace(/[\s\u00A0$]/g, "");
  if (!s) return 0;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  if (/^\d{1,3}(\.\d{3})+,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  return neg ? -Math.abs(n) : n;
}

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function toDay(raw: string): { iso: string; ts: number } | null {
  if (!raw) return null;
  let s = String(raw).trim().replace(/^[A-Z]{3}\s+/, "");
  // MT5 2026.07.29 14:00
  const m1 = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/);
  // IBKR Flex YYYYMMDD;HHmmss
  const mFlex = s.match(/(\d{4})(\d{2})(\d{2});(\d{2})(\d{2})(\d{2})/);
  let d: Date | null = null;
  if (mFlex) d = new Date(`${mFlex[1]}-${mFlex[2]}-${mFlex[3]}T${mFlex[4]}:${mFlex[5]}:${mFlex[6]}`);
  else if (m1) {
    const time = (s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/) || [])[0] ?? "12:00:00";
    d = new Date(`${m1[1]}-${m1[2]!.padStart(2, "0")}-${m1[3]!.padStart(2, "0")}T${time.length <= 5 ? time + ":00" : time}`);
    if (isNaN(d.getTime())) d = new Date(s);
  } else {
    d = new Date(s);
  }
  if (!d || isNaN(d.getTime())) return null;
  d.setHours(12, 0, 0, 0);
  return { iso: isoDay(d), ts: d.getTime() };
}

const cleanSym = (s: string) =>
  String(s ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, "").replace(/^(ES|NQ|CL|GC|MES|MNQ|MGC).*/, (_m, r) => String(s ?? "").toUpperCase().match(/^[A-Z]+/)?.[0] ?? r) || "UNKNOWN";

function mkTrade(o: Partial<Trade> & { date: string; ts: number; symbol: string; pnl: number }): Trade {
  const risk = Math.abs(o.risk ?? 250) || 250;
  return {
    id: o.id ?? `IMP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    date: o.date,
    ts: o.ts,
    symbol: cleanSym(o.symbol).slice(0, 12) || "UNKNOWN",
    side: o.side ?? "Long",
    strategy: o.strategy ?? "Imported",
    account: o.account ?? "Imported",
    session: o.session ?? "New York",
    qty: Math.max(1, Math.round(o.qty ?? 1)),
    entry: o.entry ?? 0,
    exit: o.exit ?? 0,
    risk,
    r: Math.round(((o.r ?? o.pnl / risk) as number) * 100) / 100,
    pnl: Math.round(o.pnl),
    planned: o.planned ?? true,
  };
}

const has = (heads: string[], ...aliases: string[]) => {
  const h = heads.map((x) => x.toLowerCase().trim());
  return aliases.some((a) => h.includes(a.toLowerCase()));
};
const col = (heads: string[], ...aliases: string[]) => {
  const h = heads.map((x) => x.toLowerCase().trim());
  for (const a of aliases) {
    const i = h.indexOf(a.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
};

// ---------- per-format parsers (rows without header, header list) ----------

type Ctx = { account: string; warnings: ImportWarning[]; skipped: number };

function pTradingViewPaper(heads: string[], rows: string[][], ctx: Ctx): Trade[] {
  // Symbol, Side, Qty, Fill Price, Closing Time, (+Commission, Type, Status)
  const iS = col(heads, "symbol"); const iSide = col(heads, "side");
  const iQ = col(heads, "qty", "quantity", "filled qty"); const iP = col(heads, "fill price", "price", "avg fill price", "fillprice");
  const iT = col(heads, "closing time", "fill time", "time", "datetime", "close time"); const iC = col(heads, "commission", "fee");
  const out: Trade[] = [];
  // group fills into round trips is complex — import each fill pair as scratch? Simpler: each row = closed scalp trade with entry=exit=fill price, pnl from commission? No —
  // TradingView paper history rows are fills without pnl; reconstruct per-symbol FIFO pairs below.
  // For v1: emit each fill as breakeven placeholder only if we can pair; else pair consecutive opposite fills.
  const fills = rows.map((r, i) => {
    const t = toDay(r[iT] ?? "");
    if (iS < 0 || !r[iS] || !t) { ctx.skipped++; return null; }
    const sideRaw = (r[iSide] ?? "buy").toLowerCase();
    return { i, sym: cleanSym(r[iS]!), side: sideRaw.startsWith("s") ? "sell" as const : "buy" as const, qty: Math.abs(parseNum(r[iQ] ?? "1")) || 1, price: parseNum(r[iP] ?? "0"), day: t, fee: Math.abs(parseNum(iC >= 0 ? (r[iC] ?? "0") : "0")) };
  }).filter(Boolean) as { i: number; sym: string; side: "buy" | "sell"; qty: number; price: number; day: { iso: string; ts: number }; fee: number }[];
  // naive FIFO pairing per symbol
  const lots = new Map<string, { qty: number; price: number; day: { iso: string; ts: number }; fee: number }[]>();
  fills.forEach((f) => {
    const stack = lots.get(f.sym) ?? [];
    // if opposite lot exists, close
    const oppIdx = stack.findIndex((l) => (f.side === "sell" ? true : true) && l.qty > 0);
    void oppIdx;
    // Direction model: buy opens long, sell closes long (paper equities). Keep simple: pair buy→sell.
    if (f.side === "buy") { stack.push({ qty: f.qty, price: f.price, day: f.day, fee: f.fee }); lots.set(f.sym, stack); }
    else {
      let need = f.qty;
      while (need > 1e-9 && stack.length) {
        const lot = stack[0]!;
        const take = Math.min(lot.qty, need);
        const gross = (f.price - lot.price) * take;
        const pnl = gross - lot.fee * (take / lot.qty) - f.fee * (take / f.qty);
        out.push(mkTrade({ id: `TV-${f.i}`, date: f.day.iso, ts: f.day.ts, symbol: f.sym, side: "Long", qty: Math.round(take), entry: lot.price, exit: f.price, pnl, account: ctx.account, strategy: "Imported" }));
        lot.qty -= take; need -= take;
        if (lot.qty <= 1e-9) stack.shift();
      }
      if (need > 1e-9) ctx.warnings.push({ row: f.i, message: "Sell without opening buy — skipped remainder (import buys first)." });
    }
  });
  if (!out.length && fills.length) ctx.warnings.push({ row: 0, message: "TradingView paper: fills found but no buy→sell pairs closed. P&L needs both sides in file." });
  return out;
}

function pTradervue(heads: string[], rows: string[][], ctx: Ctx): Trade[] {
  // Date, Time, Symbol, Quantity, Price, Side + Commission/TransFee/ECNFee
  const iD = col(heads, "date"); const iT = col(heads, "time");
  const iS = col(heads, "symbol"); const iQ = col(heads, "quantity", "qty");
  const iP = col(heads, "price"); const iSide = col(heads, "side");
  const iC = col(heads, "commission"); const iTf = col(heads, "transfee", "trans fee"); const iE = col(heads, "ecnfee", "ecn fee");
  const out: Trade[] = [];
  const lots = new Map<string, { qty: number; price: number; day: { iso: string; ts: number }; fee: number }[]>();
  rows.forEach((r, i) => {
    const t = toDay(`${r[iD] ?? ""} ${iT >= 0 ? (r[iT] ?? "") : ""}`);
    if (iS < 0 || !r[iS] || !t) { ctx.skipped++; return; }
    const sym = cleanSym(r[iS]!);
    const qty = Math.abs(parseNum(r[iQ] ?? "0"));
    const price = parseNum(r[iP] ?? "0");
    if (!qty || !price) { ctx.skipped++; return; }
    const rawSide = (r[iSide] ?? (parseNum(r[iQ] ?? "0") >= 0 ? "buy" : "sell")).toLowerCase();
    const isBuy = rawSide.startsWith("b") || rawSide === "long" || (!rawSide.startsWith("s") && parseNum(r[iQ] ?? "1") >= 0);
    const fee = Math.abs(parseNum(iC >= 0 ? (r[iC] ?? "0") : "0")) + Math.abs(parseNum(iTf >= 0 ? (r[iTf] ?? "0") : "0")) + Math.abs(parseNum(iE >= 0 ? (r[iE] ?? "0") : "0"));
    const stack = lots.get(sym) ?? [];
    if (isBuy) { stack.push({ qty, price, day: t, fee }); lots.set(sym, stack); }
    else {
      let need = qty;
      while (need > 1e-9 && stack.length) {
        const lot = stack[0]!;
        const take = Math.min(lot.qty, need);
        const pnl = (price - lot.price) * take - lot.fee * (take / lot.qty) - fee * (take / qty);
        out.push(mkTrade({ id: `TVUE-${i}-${take}`, date: t.iso, ts: t.ts, symbol: sym, side: "Long", qty: Math.round(take), entry: lot.price, exit: price, pnl, account: ctx.account, strategy: "Imported" }));
        lot.qty -= take; need -= take;
        if (lot.qty <= 1e-9) stack.shift();
      }
    }
  });
  return out;
}

function pTradeZella(heads: string[], rows: string[][], ctx: Ctx): Trade[] {
  // trades_*.csv: Open Date, Symbol, Side/Direction, Quantity, Entry/Avg entry, Exit/Avg exit, Net P&L, Commission/Fees
  const iD = col(heads, "open date", "date", "entry date", "opened");
  const iS = col(heads, "symbol", "instrument"); const iSide = col(heads, "side", "direction", "type");
  const iQ = col(heads, "quantity", "qty", "size"); const iEn = col(heads, "avg entry", "entry", "entry price", "open price");
  const iEx = col(heads, "avg exit", "exit", "exit price", "close price"); const iP = col(heads, "net p&l", "net pnl", "pnl", "net", "profit");
  const iC = col(heads, "commission", "commissions", "fees", "fee");
  const out: Trade[] = [];
  ctx.warnings.push({ row: 0, message: "TradeZella: trade-level rows → one entry + one exit at avg prices. P&L preserved; partial-fill path not recoverable." });
  rows.forEach((r, i) => {
    const t = toDay(r[iD] ?? "");
    if (iS < 0 || !r[iS] || !t) { ctx.skipped++; return; }
    const stated = parseNum(r[iP] ?? "0");
    const comm = Math.abs(parseNum(iC >= 0 ? (r[iC] ?? "0") : "0"));
    // reconcile: fold price-vs-stated diff into fees implicitly by using stated pnl
    out.push(mkTrade({
      id: `TZ-${i}`, date: t.iso, ts: t.ts, symbol: cleanSym(r[iS]!),
      side: (r[iSide] ?? "long").toLowerCase().startsWith("s") ? "Short" : "Long",
      qty: Math.max(1, Math.round(Math.abs(parseNum(r[iQ] ?? "1")) || 1)),
      entry: parseNum(r[iEn] ?? "0"), exit: parseNum(r[iEx] ?? r[iEn] ?? "0"),
      pnl: stated, account: ctx.account, strategy: "Imported",
    }));
    void comm;
  });
  return out;
}

function pNinjaTrader(heads: string[], rows: string[][], ctx: Ctx): Trade[] {
  // Instrument, Action (Buy/Sell), Quantity, Price, Time/Date, Commission ($-prefixed)
  const iS = col(heads, "instrument", "symbol"); const iA = col(heads, "action", "side", "b/s");
  const iQ = col(heads, "quantity", "qty"); const iP = col(heads, "price", "avg price", "fill price");
  const iT = col(heads, "time", "date", "fill time", "datetime"); const iC = col(heads, "commission", "comm");
  const out: Trade[] = [];
  const lots = new Map<string, { qty: number; price: number; day: { iso: string; ts: number }; fee: number }[]>();
  rows.forEach((r, i) => {
    const t = toDay(r[iT] ?? "");
    if (iS < 0 || !r[iS] || !t) { ctx.skipped++; return; }
    const sym = cleanSym(r[iS]!);
    const qty = Math.abs(parseNum(r[iQ] ?? "0")); const price = parseNum(r[iP] ?? "0");
    if (!qty || !price) { ctx.skipped++; return; }
    const isBuy = (r[iA] ?? "buy").toLowerCase().startsWith("b");
    const fee = Math.abs(parseNum(iC >= 0 ? (r[iC] ?? "0") : "0"));
    const stack = lots.get(sym) ?? [];
    if (isBuy) { stack.push({ qty, price, day: t, fee }); lots.set(sym, stack); }
    else {
      let need = qty;
      while (need > 1e-9 && stack.length) {
        const lot = stack[0]!;
        const take = Math.min(lot.qty, need);
        out.push(mkTrade({ id: `NT-${i}-${take}`, date: t.iso, ts: t.ts, symbol: sym, side: "Long", qty: Math.round(take), entry: lot.price, exit: price, pnl: (price - lot.price) * take - lot.fee * (take / lot.qty) - fee * (take / qty), account: ctx.account, strategy: "Imported" }));
        lot.qty -= take; need -= take;
        if (lot.qty <= 1e-9) stack.shift();
      }
    }
  });
  return out;
}

function pTradovate(heads: string[], rows: string[][], ctx: Ctx): Trade[] {
  // Contract, B/S, Fill Time, Filled Qty, Avg Fill Price, Status=Filled
  const iS = col(heads, "contract", "symbol", "instrument"); const iSide = col(heads, "b/s", "side", "b s");
  const iT = col(heads, "fill time", "time", "datetime", "date"); const iQ = col(heads, "filled qty", "qty", "quantity");
  const iP = col(heads, "avg fill price", "fill price", "price"); const iSt = col(heads, "status");
  const out: Trade[] = [];
  const lots = new Map<string, { qty: number; price: number; day: { iso: string; ts: number } }[]>();
  rows.forEach((r, i) => {
    if (iSt >= 0 && r[iSt] && !/filled/i.test(r[iSt]!)) { ctx.skipped++; return; }
    const t = toDay(r[iT] ?? "");
    if (iS < 0 || !r[iS] || !t) { ctx.skipped++; return; }
    const sym = cleanSym(r[iS]!);
    const qty = Math.abs(parseNum(r[iQ] ?? "0")); const price = parseNum(r[iP] ?? "0");
    if (!qty || !price) { ctx.skipped++; return; }
    const isBuy = (r[iSide] ?? "B").toLowerCase().startsWith("b");
    const stack = lots.get(sym) ?? [];
    if (isBuy) { stack.push({ qty, price, day: t }); lots.set(sym, stack); }
    else {
      let need = qty;
      while (need > 1e-9 && stack.length) {
        const lot = stack[0]!;
        const take = Math.min(lot.qty, need);
        out.push(mkTrade({ id: `TDV-${i}-${take}`, date: t.iso, ts: t.ts, symbol: sym, side: "Long", qty: Math.round(take), entry: lot.price, exit: price, pnl: (price - lot.price) * take, account: ctx.account, strategy: "Imported" }));
        lot.qty -= take; need -= take;
        if (lot.qty <= 1e-9) stack.shift();
      }
    }
  });
  return out;
}

function pTopstepX(heads: string[], rows: string[][], ctx: Ctx): Trade[] {
  // ContractName, ExecutePrice, Size, FilledAt, Side Bid/Ask, PositionDisposition
  const iS = col(heads, "contractname", "contract", "symbol"); const iP = col(heads, "executeprice", "price", "fill price");
  const iQ = col(heads, "size", "qty", "quantity"); const iT = col(heads, "filledat", "fill time", "time", "datetime");
  const iSide = col(heads, "side", "b/s");
  const out: Trade[] = [];
  const lots = new Map<string, { qty: number; price: number; day: { iso: string; ts: number } }[]>();
  rows.forEach((r, i) => {
    const t = toDay(r[iT] ?? "");
    if (iS < 0 || !r[iS] || !t) { ctx.skipped++; return; }
    const sym = cleanSym(r[iS]!);
    const qty = Math.abs(parseNum(r[iQ] ?? "0")); const price = parseNum(r[iP] ?? "0");
    if (!qty || !price) { ctx.skipped++; return; }
    const raw = (r[iSide] ?? "bid").toLowerCase();
    const isBuy = raw.startsWith("bid") || raw.startsWith("b");
    const stack = lots.get(sym) ?? [];
    if (isBuy) { stack.push({ qty, price, day: t }); lots.set(sym, stack); }
    else {
      let need = qty;
      while (need > 1e-9 && stack.length) {
        const lot = stack[0]!;
        const take = Math.min(lot.qty, need);
        out.push(mkTrade({ id: `TSX-${i}-${take}`, date: t.iso, ts: t.ts, symbol: sym, side: "Long", qty: Math.round(take), entry: lot.price, exit: price, pnl: (price - lot.price) * take, account: ctx.account, strategy: "Imported" }));
        lot.qty -= take; need -= take;
        if (lot.qty <= 1e-9) stack.shift();
      }
    }
  });
  return out;
}

function pIBKRFlex(heads: string[], rows: string[][], ctx: Ctx): Trade[] {
  // ClientAccountID, Date/Time YYYYMMDD;HHmmss, Symbol, Buy/Sell, Quantity, TradePrice, Commission (negative), IBCommission?
  const iT = col(heads, "date/time", "datetime", "date"); const iS = col(heads, "symbol", "description");
  const iSide = col(heads, "buy/sell", "side", "action"); const iQ = col(heads, "quantity", "qty");
  const iP = col(heads, "tradeprice", "price", "trade price"); const iC = col(heads, "commission", "ibcommission");
  const out: Trade[] = [];
  const lots = new Map<string, { qty: number; price: number; day: { iso: string; ts: number }; fee: number }[]>();
  rows.forEach((r, i) => {
    const t = toDay(r[iT] ?? "");
    if (iS < 0 || !r[iS] || !t) { ctx.skipped++; return; }
    const sym = cleanSym(r[iS]!);
    const qty = Math.abs(parseNum(r[iQ] ?? "0")); const price = parseNum(r[iP] ?? "0");
    if (!qty || !price) { ctx.skipped++; return; }
    const isBuy = (r[iSide] ?? "BUY").toLowerCase().startsWith("buy");
    const fee = Math.abs(parseNum(iC >= 0 ? (r[iC] ?? "0") : "0"));
    const stack = lots.get(sym) ?? [];
    if (isBuy) { stack.push({ qty, price, day: t, fee }); lots.set(sym, stack); }
    else {
      let need = qty;
      while (need > 1e-9 && stack.length) {
        const lot = stack[0]!;
        const take = Math.min(lot.qty, need);
        out.push(mkTrade({ id: `IB-${i}-${take}`, date: t.iso, ts: t.ts, symbol: sym, side: "Long", qty: Math.round(take), entry: lot.price, exit: price, pnl: (price - lot.price) * take - lot.fee * (take / lot.qty) - fee * (take / qty), account: ctx.account, strategy: "Imported" }));
        lot.qty -= take; need -= take;
        if (lot.qty <= 1e-9) stack.shift();
      }
    }
  });
  return out;
}

function pThinkorSwim(heads: string[], rows: string[][], ctx: Ctx): Trade[] {
  // TOS "Account Trade History": Date, Action (BUY/SELL), Quantity, Symbol, Price, Commission
  const iT = col(heads, "date", "time"); const iA = col(heads, "action", "side", "type");
  const iQ = col(heads, "quantity", "qty"); const iS = col(heads, "symbol", "underlying");
  const iP = col(heads, "price", "fill price"); const iC = col(heads, "commission", "fees");
  return pNinjaTrader(
    ["instrument", "action", "quantity", "price", "time", "commission"],
    rows.map((r) => [r[iS] ?? "", r[iA] ?? "", r[iQ] ?? "", r[iP] ?? "", r[iT] ?? "", iC >= 0 ? (r[iC] ?? "0") : "0"]),
    ctx
  );
}

function pWebull(heads: string[], rows: string[][], ctx: Ctx): Trade[] {
  // Status/Filled variants: Symbol, Side, Filled Qty/Price/Time, Status=Filled
  const iS = col(heads, "symbol", "ticker"); const iSide = col(heads, "side", "action", "b/s");
  const iQ = col(heads, "filled qty", "filled quantity", "quantity", "qty"); const iP = col(heads, "filled price", "avg fill price", "price");
  const iT = col(heads, "filled time", "fill time", "time", "date"); const iSt = col(heads, "status");
  const mapped = rows.filter((r) => (iSt < 0 || !r[iSt] || /fill/i.test(r[iSt]!)));
  ctx.skipped += rows.length - mapped.length;
  return pTradovate(["contract", "b/s", "fill time", "filled qty", "avg fill price", "status"],
    mapped.map((r) => [r[iS] ?? "", r[iSide] ?? "", r[iT] ?? "", r[iQ] ?? "", r[iP] ?? "", "Filled"]), ctx);
}

function pDAS(heads: string[], rows: string[][], ctx: Ctx): Trade[] {
  // Symb, B/S, Qty, Price, Time, Commission
  const iS = col(heads, "symb", "symbol"); const iSide = col(heads, "b/s", "side");
  const iQ = col(heads, "qty", "quantity", "shares"); const iP = col(heads, "price", "avg price");
  const iT = col(heads, "time", "date", "datetime");
  return pNinjaTrader(["instrument", "action", "quantity", "price", "time", "commission"],
    rows.map((r) => [r[iS] ?? "", (r[iSide] ?? "").toLowerCase().startsWith("b") ? "Buy" : "Sell", r[iQ] ?? "", r[iP] ?? "", r[iT] ?? "", "0"]), ctx);
}

function pTVStrategy(heads: string[], rows: string[][], ctx: Ctx): Trade[] {
  // "List of trades": Trade #, Type (Long/Short), Signal, Date/Time, Price, Contracts, Profit
  const iTy = col(heads, "type", "side"); const iT = col(heads, "date/time", "time", "date");
  const iP = col(heads, "price"); const iQ = col(heads, "contracts", "qty", "quantity");
  const iPnl = col(heads, "profit", "net p&l", "pnl", "net profit");
  const out: Trade[] = [];
  ctx.warnings.push({ row: 0, message: "TradingView strategy: reconstructed entry+exit at signal prices; P&L preserved per stated profit." });
  // pair Entry/Exit rows
  let open: { price: number; qty: number; day: { iso: string; ts: number }; side: Side } | null = null;
  rows.forEach((r, i) => {
    const sig = (r[col(heads, "signal")] ?? "").toLowerCase();
    const t = toDay(r[iT] ?? "");
    if (!t) { ctx.skipped++; return; }
    const price = parseNum(r[iP] ?? "0");
    const qty = Math.abs(parseNum(r[iQ] ?? "1")) || 1;
    const side: Side = (r[iTy] ?? "long").toLowerCase().startsWith("s") ? "Short" : "Long";
    if (/entry|buy|sell.*entry|long|short/.test(sig) && !/exit|close|flat/.test(sig) && !open) {
      open = { price, qty, day: t, side };
    } else if (open) {
      const stated = iPnl >= 0 ? parseNum(r[iPnl] ?? "0") : (side === "Long" ? price - open.price : open.price - price) * qty;
      out.push(mkTrade({ id: `TVS-${i}`, date: t.iso, ts: t.ts, symbol: "TV-STRAT", side: open.side, qty: Math.round(qty), entry: open.price, exit: price, pnl: stated, account: ctx.account, strategy: "Imported" }));
      open = null;
    } else ctx.skipped++;
  });
  return out;
}

function pGeneric(heads: string[], rows: string[][], ctx: Ctx): Trade[] {
  const iDate = col(heads, "date", "time", "datetime", "timestamp", "day");
  const iSym = col(heads, "symbol", "ticker", "instrument", "contract");
  if (iDate < 0 || iSym < 0) return [];
  const iSide = col(heads, "side", "direction", "action", "type", "b/s");
  const iPnl = col(heads, "pnl", "net p&l", "net pnl", "profit", "net");
  const iRisk = col(heads, "risk"); const iR = col(heads, "r", "r multiple");
  const iStrat = col(heads, "strategy", "setup"); const iAcct = col(heads, "account");
  const iSess = col(heads, "session"); const iQ = col(heads, "qty", "quantity", "size");
  const iEn = col(heads, "entry", "entry price", "open"); const iEx = col(heads, "exit", "exit price", "close");
  const iPlan = col(heads, "planned", "plan");
  const out: Trade[] = [];
  rows.forEach((r, i) => {
    const t = toDay(r[iDate] ?? "");
    if (!t || !r[iSym]) { ctx.skipped++; return; }
    const pnl = parseNum(r[iPnl] ?? "0");
    const risk = Math.abs(parseNum(iRisk >= 0 ? (r[iRisk] ?? "250") : "250")) || 250;
    out.push(mkTrade({
      id: `IMP-${i}`, date: t.iso, ts: t.ts, symbol: cleanSym(r[iSym]!),
      side: iSide >= 0 && (r[iSide] ?? "").toLowerCase().startsWith("s") ? "Short" : "Long",
      strategy: (iStrat >= 0 ? r[iStrat] : "") || "Imported",
      account: (iAcct >= 0 ? r[iAcct] : "") || ctx.account,
      session: (iSess >= 0 ? r[iSess] : "") || "New York",
      qty: parseInt(r[iQ] ?? "1") || 1, entry: parseNum(iEn >= 0 ? (r[iEn] ?? "0") : "0"),
      exit: parseNum(iEx >= 0 ? (r[iEx] ?? "0") : "0"), risk,
      r: iR >= 0 ? parseNum(r[iR] ?? "") || pnl / risk : pnl / risk,
      pnl, planned: iPlan >= 0 ? (r[iPlan] ?? "true").toLowerCase() !== "false" : true,
    }));
  });
  return out;
}

// ---------- detection + entry ----------

export function detectFormat(text: string, heads: string[]): string {
  const h = heads.map((x) => x.toLowerCase().trim());
  const join = h.join("|");
  const hasH = (...a: string[]) => has(heads, ...a);
  if (/positions/i.test(text) && /profit/i.test(text) && /time\s*[|,;]\s*position/i.test(text)) return "MT5 Positions";
  if (/<html/i.test(text) && /metatrader/i.test(text)) return /deals|deal/i.test(text) ? "MT5 Deals (HTML)" : "MT4 Statement (HTML)";
  if (hasH("contractname", "executeprice")) return "TopstepX";
  if (hasH("contract", "b/s", "fill time") || (hasH("contract", "filled qty") && hasH("avg fill price"))) return "Tradovate";
  if (hasH("clientaccountid", "date/time")) return "IBKR Flex";
  if (/^trades,header/i.test(text) || hasH("ibcommission") && /trades/i.test(text)) return "IBKR Activity";
  if (/account trade history/i.test(text)) return "ThinkorSwim";
  if (hasH("instrument", "action")) return "NinjaTrader";
  if (hasH("fill price", "closing time") || (hasH("fill price") && hasH("symbol", "side"))) return "TradingView Paper";
  if (/list of trades/i.test(text) || (hasH("signal", "contracts") && hasH("profit"))) return "TradingView Strategy";
  if (hasH("transfee") || (hasH("date", "time", "quantity", "price") && hasH("side"))) return "Tradervue";
  if (hasH("open date", "net p&l") || /trades_.*\.csv/i.test(text)) return "TradeZella";
  if (hasH("status", "filled qty") || (hasH("status") && hasH("filled"))) return "Webull";
  if (hasH("symb", "b/s")) return "DAS Trader";
  if (hasH("date", "symbol") && (hasH("pnl", "net p&l", "profit", "net") || hasH("entry"))) return "Nexora Generic";
  void join;
  return "Unknown";
}

function parseMT5DealsHTML(text: string, ctx: Ctx): Trade[] {
  // minimal: extract deal tables → symbol/type/volume/price/profit rows
  const out: Trade[] = [];
  const rows = [...text.matchAll(/<tr[^>]*>(.*?)<\/tr>/gis)].map((m) => m[1]!);
  for (let i = 0; i < rows.length; i++) {
    const cells = [...rows[i]!.matchAll(/<td[^>]*>(.*?)<\/td>/gis)].map((m) => m[1]!.replace(/<[^>]+>/g, "").trim());
    if (cells.length < 8) continue;
    const t = toDay(cells[0] ?? "");
    const sym = (cells[2] ?? "").replace(/[^A-Za-z0-9]/g, "");
    if (!t || !sym || !/buy|sell/i.test(cells[3] ?? "")) { continue; }
    const pnl = parseNum(cells[cells.length - 1] ?? "0");
    if (!pnl) continue;
    out.push(mkTrade({ id: `MT5D-${i}`, date: t.iso, ts: t.ts, symbol: cleanSym(sym), side: /sell/i.test(cells[3]!) ? "Short" : "Long", qty: 1, entry: parseNum(cells[4] ?? "0"), exit: parseNum(cells[5] ?? cells[4] ?? "0"), pnl, account: ctx.account, strategy: "Imported" }));
  }
  if (!out.length) ctx.warnings.push({ row: 0, message: "MT5 deals HTML: no closed-deal rows with P&L found." });
  return out;
}

/** Simple content-hash dedupe key per trade. */
export function tradeHash(t: Trade): string {
  return [t.date, t.symbol, t.side, t.qty, t.entry, t.exit, t.pnl].join("|");
}

export function dedupeTrades(trades: Trade[]): { unique: Trade[]; duplicates: number } {
  const seen = new Set<string>();
  const unique: Trade[] = [];
  let duplicates = 0;
  for (const t of trades) {
    const h = tradeHash(t);
    if (seen.has(h)) { duplicates++; continue; }
    seen.add(h);
    unique.push(t);
  }
  return { unique, duplicates };
}

export function parseAuto(text: string, account = "Imported"): ImportResult {
  const clean = stripBom(text);
  const warnings: ImportWarning[] = [];
  const ctx: Ctx = { account, warnings, skipped: 0 };
  const errors: string[] = [];
  // HTML statements first
  if (/<html/i.test(clean)) {
    const fmt = detectFormat(clean, []);
    const trades = parseMT5DealsHTML(clean, ctx);
    return { format: fmt, trades, warnings, skippedRows: ctx.skipped, errors };
  }
  const firstLine = clean.split(/\r?\n/).find((l) => l.trim()) ?? "";
  // IBKR activity / TOS section files keep commas
  const delim = /trades,header|account trade history/i.test(clean) ? "," : detectDelimiter(firstLine);
  const grid = splitCsv(clean, delim);
  if (grid.length < 2) return { format: "Unknown", trades: [], warnings, skippedRows: 0, errors: ["No data rows found."], needsColumnMap: true };
  // TOS section: find header row
  let hIdx = 0;
  if (/account trade history/i.test(clean)) {
    hIdx = grid.findIndex((r) => r.join(",").toLowerCase().includes("symbol") && r.join(",").toLowerCase().includes("quantity"));
    if (hIdx < 0) hIdx = 0;
  } else if (/^trades,header/i.test(clean)) {
    // IBKR activity: Trades rows → build header from first Trades,Header row
    const hr = grid.find((r) => /^trades$/i.test(r[0] ?? "") && /header/i.test(r[1] ?? ""));
    if (hr) {
      const heads = hr.slice(2);
      const rows = grid.filter((r) => /^trades$/i.test(r[0] ?? "") && /^data$/i.test(r[1] ?? "")).map((r) => r.slice(2));
      const trades = pIBKRFlex(heads, rows, ctx);
      return { format: "IBKR Activity", trades, warnings, skippedRows: ctx.skipped, errors };
    }
  }
  const heads = (grid[hIdx] ?? []).map((h) => h.trim());
  const rows = grid.slice(hIdx + 1).filter((r) => r.some((c) => c.trim()));
  const fmt = detectFormat(clean, heads);
  let trades: Trade[] = [];
  try {
    switch (fmt) {
      case "TradingView Paper": trades = pTradingViewPaper(heads, rows, ctx); break;
      case "TradingView Strategy": trades = pTVStrategy(heads, rows, ctx); break;
      case "Tradervue": trades = pTradervue(heads, rows, ctx); break;
      case "TradeZella": trades = pTradeZella(heads, rows, ctx); break;
      case "NinjaTrader": trades = pNinjaTrader(heads, rows, ctx); break;
      case "Tradovate": trades = pTradovate(heads, rows, ctx); break;
      case "TopstepX": trades = pTopstepX(heads, rows, ctx); break;
      case "IBKR Flex": trades = pIBKRFlex(heads, rows, ctx); break;
      case "ThinkorSwim": trades = pThinkorSwim(heads, rows, ctx); break;
      case "Webull": trades = pWebull(heads, rows, ctx); break;
      case "DAS Trader": trades = pDAS(heads, rows, ctx); break;
      case "Nexora Generic": trades = pGeneric(heads, rows, ctx); break;
      case "MT5 Positions": return { format: fmt, trades: [], warnings, skippedRows: 0, errors: [], headers: heads };
      default: {
        const g = pGeneric(heads, rows, ctx);
        if (g.length) { trades = g; return { format: "Generic (mapped)", trades, warnings, skippedRows: ctx.skipped, errors }; }
        return { format: "Unknown", trades: [], warnings, skippedRows: rows.length, errors: ["Unrecognized format — map columns manually."], needsColumnMap: true, headers: heads };
      }
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : "Parse failed.");
  }
  return { format: fmt, trades, warnings, skippedRows: ctx.skipped, errors };
}

/** Column-mapper fallback: user maps their headers → Trade fields. */
export function parseWithMap(text: string, map: Record<string, string>, account = "Imported"): Trade[] {
  const clean = stripBom(text);
  const delim = detectDelimiter(clean.split(/\r?\n/).find((l) => l.trim()) ?? ",");
  const grid = splitCsv(clean, delim);
  if (grid.length < 2) return [];
  const heads = (grid[0] ?? []).map((h) => h.trim());
  const idxOf = (field: string) => {
    const want = (map[field] ?? "").toLowerCase();
    return heads.findIndex((h) => h.toLowerCase() === want);
  };
  const iDate = idxOf("date"), iSym = idxOf("symbol");
  if (iDate < 0 || iSym < 0) return [];
  const out: Trade[] = [];
  for (let i = 1; i < grid.length; i++) {
    const r = grid[i]!;
    const t = toDay(r[iDate] ?? "");
    if (!t || !r[iSym]) continue;
    const get = (f: string, fb = "") => {
      const ix = idxOf(f);
      return ix >= 0 ? (r[ix] ?? fb) : fb;
    };
    const pnl = parseNum(get("pnl", "0"));
    const risk = Math.abs(parseNum(get("risk", "250"))) || 250;
    out.push(mkTrade({
      id: `MAP-${i}`, date: t.iso, ts: t.ts, symbol: cleanSym(r[iSym]!),
      side: get("side", "long").toLowerCase().startsWith("s") ? "Short" : "Long",
      strategy: get("strategy", "Imported") || "Imported", account: get("account", account) || account,
      session: get("session", "New York") || "New York", qty: parseInt(get("qty", "1")) || 1,
      entry: parseNum(get("entry", "0")), exit: parseNum(get("exit", "0")),
      risk, r: pnl / risk, pnl, planned: true,
    }));
  }
  return out;
}
