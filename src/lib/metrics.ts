import type { Trade } from "../data/trades";

export type RangeKey = "7D" | "30D" | "90D" | "YTD" | "ALL";
export const RANGES: { key: RangeKey; label: string }[] = [
  { key: "7D", label: "7D" },
  { key: "30D", label: "30D" },
  { key: "90D", label: "90D" },
  { key: "YTD", label: "YTD" },
  { key: "ALL", label: "All" },
];

export interface Filters {
  range: RangeKey;
  strategy: string;
  account: string;
}

export function rangeBounds(range: RangeKey, now = new Date()) {
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  let from = new Date(now);
  from.setHours(0, 0, 0, 0);
  if (range === "7D") from.setDate(from.getDate() - 6);
  else if (range === "30D") from.setDate(from.getDate() - 29);
  else if (range === "90D") from.setDate(from.getDate() - 89);
  else if (range === "YTD") from = new Date(now.getFullYear(), 0, 1);
  else from = new Date(0);

  const span = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(from.getTime() - span - 1);
  return { from, to, prevFrom, prevTo, isAll: range === "ALL" };
}

export function splitByFilters(trades: Trade[], f: Filters) {
  const b = rangeBounds(f.range);
  const match = (t: Trade) =>
    (f.strategy === "All" || t.strategy === f.strategy) &&
    (f.account === "All" || t.account === f.account);
  const current = trades.filter((t) => match(t) && t.ts >= b.from.getTime() && t.ts <= b.to.getTime());
  const previous = b.isAll
    ? []
    : trades.filter((t) => match(t) && t.ts >= b.prevFrom.getTime() && t.ts <= b.prevTo.getTime());
  return { current, previous };
}

export interface Kpis {
  net: number;
  grossProfit: number;
  grossLoss: number;
  pf: number;
  wins: number;
  losses: number;
  be: number;
  count: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  wlRatio: number;
  expectancy: number;
  streak: { type: "win" | "loss" | "none"; len: number };
  plannedRate: number;
  bestTrade: number;
  worstTrade: number;
  riskApprox?: number;
}

export function computeKpis(list: Trade[]): Kpis {
  let net = 0,
    gp = 0,
    gl = 0,
    wins = 0,
    losses = 0,
    be = 0,
    best = 0,
    worst = 0;
  for (const t of list) {
    net += t.pnl;
    if (t.pnl > 0) {
      gp += t.pnl;
      wins++;
      best = Math.max(best, t.pnl);
    } else if (t.pnl < 0) {
      gl += -t.pnl;
      losses++;
      worst = Math.min(worst, t.pnl);
    } else be++;
  }
  const count = list.length;
  const sorted = [...list].sort((a, b) => b.ts - a.ts);
  let streak: Kpis["streak"] = { type: "none", len: 0 };
  if (sorted.length) {
    const first = sorted[0].pnl > 0 ? "win" : sorted[0].pnl < 0 ? "loss" : "none";
    let len = 0;
    for (const t of sorted) {
      const s = t.pnl > 0 ? "win" : t.pnl < 0 ? "loss" : "none";
      if (first !== "none" && s === first) len++;
      else break;
    }
    streak = { type: first, len };
  }
  const avgWin = wins ? gp / wins : 0;
  const avgLoss = losses ? gl / losses : 0;
  return {
    net,
    grossProfit: gp,
    grossLoss: gl,
    pf: gl > 0 ? gp / gl : gp > 0 ? 99 : 0,
    wins,
    losses,
    be,
    count,
    winRate: count ? (wins / count) * 100 : 0,
    avgWin,
    avgLoss,
    wlRatio: avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 99 : 0,
    expectancy: count ? net / count : 0,
    streak,
    plannedRate: count ? (list.filter((t) => t.planned).length / count) * 100 : 0,
    bestTrade: best,
    worstTrade: worst,
  };
}

export const trendPct = (cur: number, prev: number): number | null => {
  if (!prev) return null;
  return ((cur - prev) / Math.abs(prev)) * 100;
};

export function radarScores(k: Kpis) {
  const clamp = (v: number) => Math.max(4, Math.min(100, Math.round(v)));
  const pf = clamp((k.pf / 3) * 100);
  const win = clamp(k.winRate);
  const risk = clamp(100 - (k.avgLoss / (k.riskApprox ?? 300)) * 55);
  const discipline = clamp(k.plannedRate);
  const consistency = clamp(55 + k.expectancy / 12);
  const overall = Math.round(pf * 0.25 + win * 0.2 + risk * 0.2 + discipline * 0.2 + consistency * 0.15);
  return {
    overall,
    axes: [
      { axis: "Profit Factor", value: pf },
      { axis: "Win Rate", value: win },
      { axis: "Risk Control", value: risk },
      { axis: "Discipline", value: discipline },
      { axis: "Consistency", value: consistency },
    ],
  };
}

export function withRisk(k: Kpis, list: Trade[]): Kpis {
  const avgRisk = list.length ? list.reduce((s, t) => s + t.risk, 0) / list.length : 250;
  return { ...k, riskApprox: avgRisk };
}

export function cumSeries(list: Trade[]) {
  const byDay = new Map<string, number>();
  for (const t of list) byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.pnl);
  const days = [...byDay.keys()].sort();
  let acc = 0;
  return days.map((date) => {
    acc += byDay.get(date)!;
    return { date, daily: byDay.get(date)!, value: Math.round(acc) };
  });
}

export function balanceSeries(list: Trade[], startCapital = 25000) {
  const series = cumSeries(list);
  let bal = startCapital;
  const dep = startCapital;
  return series.map((p) => {
    bal = dep + p.value;
    return { date: p.date, balance: bal };
  });
}

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export function weekdaySeries(list: Trade[]) {
  const agg = WD.map((d) => ({ day: d, pnl: 0, count: 0 }));
  for (const t of list) {
    const dow = (new Date(t.ts).getDay() + 6) % 7;
    agg[dow].pnl += t.pnl;
    agg[dow].count++;
  }
  return agg.filter((a) => a.count > 0 || WD.indexOf(a.day) < 5);
}

export function monthlySeries(list: Trade[]) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const agg = months.map((m, i) => ({ month: m, pnl: 0, trades: 0 }));
  for (const t of list) {
    const d = new Date(t.ts);
    const m = d.getMonth();
    agg[m].pnl += t.pnl;
    agg[m].trades++;
  }
  return agg;
}

export function symbolSeries(list: Trade[]) {
  const m = new Map<string, { symbol: string; pnl: number; count: number }>();
  for (const t of list) {
    const e = m.get(t.symbol) ?? { symbol: t.symbol, pnl: 0, count: 0 };
    e.pnl += t.pnl;
    e.count++;
    m.set(t.symbol, e);
  }
  return [...m.values()].sort((a, b) => b.pnl - a.pnl).slice(0, 6);
}

export function donutData(k: Kpis) {
  return [
    { name: "Winners", value: k.wins, tone: "gain" },
    { name: "Losers", value: k.losses, tone: "loss" },
    { name: "Breakeven", value: k.be, tone: "flat" },
  ].filter((d) => d.value > 0);
}

export function dailyMap(list: Trade[]) {
  const m = new Map<string, { pnl: number; count: number; wins: number }>();
  for (const t of list) {
    const e = m.get(t.date) ?? { pnl: 0, count: 0, wins: 0 };
    e.pnl += t.pnl;
    e.count++;
    if (t.pnl > 0) e.wins++;
    m.set(t.date, e);
  }
  return m;
}

export function sparkDaily(list: Trade[], days = 16) {
  const m = dailyMap(list);
  const keys = [...m.keys()].sort().slice(-days);
  return keys.map((d) => m.get(d)!.pnl);
}

export interface Insight {
  title: string;
  detail: string;
  tone: "gain" | "loss" | "brand" | "warn";
}

export function insights(list: Trade[], k: Kpis): Insight[] {
  const out: Insight[] = [];
  if (!list.length) return out;
  const wd = weekdaySeries(list).filter((w) => w.count > 2);
  if (wd.length) {
    const best = [...wd].sort((a, b) => b.pnl - a.pnl)[0];
    const worst = [...wd].sort((a, b) => a.pnl - b.pnl)[0];
    if (best.pnl > 0)
      out.push({
        tone: "gain",
        title: `${best.day} is your edge`,
        detail: `${best.day}s average ${Math.round(best.pnl / best.count).toLocaleString()} per trade across ${best.count} executions.`,
      });
    if (worst.pnl < 0)
      out.push({
        tone: "loss",
        title: `Review ${worst.day} setups`,
        detail: `Worst weekday at ${Math.round(worst.pnl).toLocaleString()} total — consider sizing down until the stats recover.`,
      });
  }
  const sym = symbolSeries(list);
  if (sym.length && sym[0].pnl > 0)
    out.push({
      tone: "brand",
      title: `${sym[0].symbol} is carrying the book`,
      detail: `${Math.round((sym[0].pnl / Math.max(1, k.net)) * 100)}% of net P&L comes from ${sym[0].symbol} (${sym[0].count} trades).`,
    });
  if (k.avgLoss > 0 && k.wlRatio >= 1.5)
    out.push({
      tone: "gain",
      title: "Asymmetric payoffs",
      detail: `Avg winner is ${k.wlRatio.toFixed(1)}× the avg loser — your cut-loss discipline is working.`,
    });
  else if (k.avgLoss > 0 && k.wlRatio < 1)
    out.push({
      tone: "warn",
      title: "Losers outrun winners",
      detail: `Avg loss exceeds avg win (${k.wlRatio.toFixed(2)}×). Tighten stops or let runners breathe.`,
    });
  out.push({
    tone: k.plannedRate >= 80 ? "gain" : "warn",
    title: `${Math.round(k.plannedRate)}% plan adherence`,
    detail:
      k.plannedRate >= 80
        ? "Strong process discipline — keep journaling every deviation."
        : "A meaningful share of trades went off-plan. Tag the trigger next time.",
  });
  if (k.streak.type === "win" && k.streak.len >= 3)
    out.push({
      tone: "brand",
      title: `${k.streak.len}-trade win streak live`,
      detail: "Momentum is real, but so is tilt — consider a flat day after 5 in a row.",
    });
  return out.slice(0, 6);
}
