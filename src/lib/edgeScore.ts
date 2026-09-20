import type { Trade } from "../data/trades";

/**
 * Edge Score v2 — open, versioned composite (0-100).
 * Ported from LuxAlgo trade-journal `packages/core/src/edge-score.ts` (MIT)
 * + `docs/edge-score.md`, adapted to Nexora's Trade shape.
 *
 * Components (full-marks thresholds + weights):
 * - winRate:      60% win rate                          (w 15)
 * - profitFactor: 3.0                                   (w 25)
 * - avgWinLoss:   2.5 : 1                               (w 20)
 * - drawdown:     0% of (startCapital + peak); 0 at ≥25% (w 15)
 * - recovery:     net P&L = 3x max drawdown             (w 10)
 * - consistency:  largest winning day ≤15% of day profits (w 15)
 *
 * Score withheld (<5 closed trades) → null, components still computed.
 */

export const EDGE_SCORE_VERSION = 2;

export interface EdgeScoreComponents {
  winRate: number;
  profitFactor: number;
  avgWinLoss: number;
  drawdown: number;
  recovery: number;
  consistency: number;
}

export interface EdgeScore {
  version: number;
  score: number | null;
  components: EdgeScoreComponents;
  closedTrades: number;
}

export const EDGE_SCORE_WEIGHTS: Record<keyof EdgeScoreComponents, number> = {
  winRate: 15,
  profitFactor: 25,
  avgWinLoss: 20,
  drawdown: 15,
  recovery: 10,
  consistency: 15,
};

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

export interface EdgeScoreInputs {
  trades: Trade[];
  /** Anchors drawdown % — pass account size sum like LuxAlgo initialBalance. */
  initialBalance?: number;
  /** P&L within ±tolerance counts as breakeven for win/loss splits. */
  breakevenTolerance?: number;
}

export function computeEdgeScoreV2({ trades, initialBalance, breakevenTolerance = 0 }: EdgeScoreInputs): EdgeScore {
  const closed = trades;
  const tol = Math.max(0, breakevenTolerance || 0);
  const wins = closed.filter((t) => t.pnl > tol);
  const losses = closed.filter((t) => t.pnl < -tol);

  const grossProfit = closed.reduce((s, t) => s + Math.max(0, t.pnl), 0);
  const grossLoss = closed.reduce((s, t) => s - Math.min(0, t.pnl), 0);

  const winRate = closed.length ? wins.length / closed.length : null;
  const avgWin = wins.length ? grossProfit / wins.length : null;
  const avgLoss = losses.length ? grossLoss / losses.length : null;
  const avgWinLoss = avgWin !== null && avgLoss !== null && avgLoss > 0 ? avgWin / avgLoss : null;

  const pfInfinite = closed.length > 0 && grossLoss === 0 && grossProfit > 0;
  const pf = closed.length === 0 ? null : grossLoss > 0 ? grossProfit / grossLoss : null;

  // equity curve → max drawdown (absolute + % of start+peak like LuxAlgo equity.ts)
  const byDay = new Map<string, number>();
  for (const t of [...closed].sort((a, b) => a.ts - b.ts)) byDay.set(t.date, (byDay.get(t.date) ?? 0) + t.pnl);
  const days = [...byDay.keys()].sort();
  let acc = 0;
  let peak = initialBalance ?? 0;
  let maxDd = 0;
  let maxDdPct: number | null = initialBalance == null ? null : 0;
  for (const d of days) {
    acc += byDay.get(d)!;
    const equity = (initialBalance ?? 0) + acc;
    peak = Math.max(peak, equity);
    const dd = peak - equity;
    maxDd = Math.max(maxDd, dd);
    if (initialBalance != null && peak > 0) maxDdPct = Math.max(maxDdPct ?? 0, dd / peak);
  }
  const netPnl = closed.reduce((s, t) => s + t.pnl, 0);
  const recovery = maxDd > 0 ? netPnl / maxDd : null;

  // consistency: largest winning day share of total day profits
  const dayProfits = [...byDay.values()].filter((v) => v > 0);
  const totalDayProfit = dayProfits.reduce((s, v) => s + v, 0);
  const concentration = totalDayProfit > 0 ? Math.max(...dayProfits) / totalDayProfit : null;

  const winRateScore = clamp01((winRate ?? 0) / 0.6) * 100;
  const profitFactorScore = clamp01((pfInfinite ? 3 : (pf ?? 0)) / 3) * 100;
  const avgWinLossScore = clamp01((avgWinLoss ?? 0) / 2.5) * 100;
  const drawdownScore = maxDdPct === null ? 50 : (1 - clamp01(maxDdPct / 0.25)) * 100;
  const recoveryScore = maxDd > 0 ? clamp01((recovery ?? 0) / 3) * 100 : netPnl > 0 ? 100 : 0;
  const consistencyScore =
    concentration === null ? 0 : concentration <= 0.15 ? 100 : (1 - clamp01((concentration - 0.15) / 0.85)) * 100;

  const components: EdgeScoreComponents = {
    winRate: Math.round(winRateScore * 100) / 100,
    profitFactor: Math.round(profitFactorScore * 100) / 100,
    avgWinLoss: Math.round(avgWinLossScore * 100) / 100,
    drawdown: Math.round(drawdownScore * 100) / 100,
    recovery: Math.round(recoveryScore * 100) / 100,
    consistency: Math.round(consistencyScore * 100) / 100,
  };
  const totalW = Object.values(EDGE_SCORE_WEIGHTS).reduce((s, w) => s + w, 0);
  const weighted =
    Object.entries(components).reduce((s, [k, v]) => s + v * EDGE_SCORE_WEIGHTS[k as keyof EdgeScoreComponents], 0) /
    totalW;

  return {
    version: EDGE_SCORE_VERSION,
    score: closed.length >= 5 ? Math.round(weighted * 100) / 100 : null,
    components,
    closedTrades: closed.length,
  };
}

/** Radar-friendly shape for existing RadarCard. */
export function edgeScoreToRadar(e: EdgeScore) {
  const overall = e.score ?? Math.round(
    (e.components.winRate * 0.15 +
      e.components.profitFactor * 0.25 +
      e.components.avgWinLoss * 0.2 +
      e.components.drawdown * 0.15 +
      e.components.recovery * 0.1 +
      e.components.consistency * 0.15) * 100
  ) / 100;
  return {
    overall: Math.round(overall),
    axes: [
      { axis: "Win Rate", value: Math.round(e.components.winRate) },
      { axis: "Profit Factor", value: Math.round(e.components.profitFactor) },
      { axis: "Payoff", value: Math.round(e.components.avgWinLoss) },
      { axis: "Drawdown", value: Math.round(e.components.drawdown) },
      { axis: "Recovery", value: Math.round(e.components.recovery) },
      { axis: "Consistency", value: Math.round(e.components.consistency) },
    ],
  };
}
