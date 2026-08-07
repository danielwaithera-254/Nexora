import { useMemo } from "react";
import { X, Target, TrendingDown, Lightbulb, Sparkles } from "lucide-react";
import type { Trade } from "../data/trades";
import { loadReviews, type TradeReview } from "../lib/tradetools";
import { analyzeLosses } from "../lib/risk";

export default function AnalyzeLosses({
  trades,
  open,
  onClose,
}: {
  trades: Trade[];
  open: boolean;
  onClose: () => void;
}) {
  const reviews = useMemo(() => loadReviews(), [open]);

  const { rows, top, simulated } = useMemo(
    () => analyzeLosses(trades, reviews as Record<string, TradeReview>, 50),
    [trades, reviews]
  );
  const total = rows.reduce((s, r) => s + r.count, 0);
  const maxCount = Math.max(1, ...rows.map((r) => r.count));

  const advice: Record<string, string> = {
    "Early Entry": "Wait for the exact trigger — price may still respect the level, but your average loser enters too soon. Add a confirmation candle rule to your playbook.",
    "No Confirmation": "Your losses are missing the confirmation step. Make 'displacement/engulfing confirmed' a hard gate in your entry checklist.",
    Chased: "Chasing extended moves eats your edge. If the setup is 3+ candles old, it's not your setup anymore.",
    "Moved Stop": "The stop you planned is the trade. Move it only in your direction when the structure proves you right — never away from invalidation.",
    "Held Too Long": "Your winners are being given back. Define your target zones before entry and honor them.",
    "Cut Too Early": "You're letting small noise end valid trades. Widen the invalidation or shrink size so you can hold through the pullback.",
    FOMO: "Fear of missing out is the entry signal you don't have. A skipped setup is a free breakeven.",
    Revenge: "Losses after losses — the market isn't punishing you, your size is. Close the platform after a red day.",
    Oversized: "Size turns 2R edge into ruin. Drop to half size until your last 20 trades are green.",
    "Skewed Risk": "Your RR is upside down. Set a hard 2:1 minimum before clicking.",
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto bg-black/60 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div
        className="mx-auto max-w-2xl space-y-3 rounded-2xl border border-edge bg-panel p-4 shadow-2xl sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-loss-soft text-loss">
            <Target size={15} />
          </span>
          <div>
            <h3 className="font-display text-[14px] font-bold text-ink">Your last 50 losses</h3>
            <p className="text-[10px] text-faint">
              Mistake tags from trade reviews — the patterns that actually cost you money.
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto rounded-lg p-1.5 text-faint transition-colors hover:bg-panel2 hover:text-ink"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {simulated && (
          <p className="flex items-center gap-1.5 rounded-lg bg-warn-soft px-3 py-2 text-[10px] font-bold text-warn">
            <Sparkles size={11} />
            Trades without a review are auto-tagged (simulated) so the analysis always has data. Rate trades in the Psychology tab for real pattern mining.
          </p>
        )}

        {rows.length === 0 ? (
          <div className="py-10 text-center">
            <TrendingDown size={26} className="mx-auto text-faint" />
            <p className="mt-2 text-[12px] font-bold text-mut">No losing trades found</p>
            <p className="text-[10.5px] text-faint">Import or generate trades to mine them.</p>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              {rows.map((r) => (
                <div key={r.tag} className="flex items-center gap-2.5 rounded-xl border border-edge bg-panel2 px-3 py-2">
                  <span className="w-32 shrink-0 truncate text-[11px] font-extrabold text-ink">{r.tag}</span>
                  <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-edge">
                    <div
                      className="h-full rounded-full bg-loss"
                      style={{ width: `${(r.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="tnum w-8 shrink-0 text-right text-[11px] font-bold text-ink">{r.count}</span>
                  <span className="tnum w-20 shrink-0 text-right text-[10px] font-bold text-faint">
                    {r.avgR > 0 ? "+" : ""}
                    {r.avgR.toFixed(2)}R avg
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-loss/25 bg-loss-soft/40 p-4">
              <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-loss">
                <Lightbulb size={12} /> The pattern
              </p>
              <p className="mt-1.5 text-[12.5px] font-bold leading-relaxed text-ink">
                Your biggest recurring mistake is {top || "none"} — appearing in{" "}
                {rows[0] ? `${Math.round((rows[0].count / Math.max(1, total)) * 100)}%` : "0%"} of your losses.
              </p>
              {top && advice[top] && (
                <p className="mt-1.5 text-[11px] leading-relaxed text-mut">{advice[top]}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
