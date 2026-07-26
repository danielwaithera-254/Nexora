import { Sparkles, X, TrendingUp, TrendingDown, Lightbulb, AlertTriangle } from "lucide-react";
import type { Insight } from "../lib/metrics";
import { cn } from "../utils/cn";

const TONE = {
  gain: { icon: TrendingUp, cls: "bg-gain-soft text-gain" },
  loss: { icon: TrendingDown, cls: "bg-loss-soft text-loss" },
  brand: { icon: Sparkles, cls: "bg-brand-soft text-brand" },
  warn: { icon: AlertTriangle, cls: "bg-brand-soft text-brand" },
} as const;

export default function InsightsDrawer({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: Insight[];
}) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "themed fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-edge bg-panel shadow-[var(--shadow-lg)]",
          open ? "drawer-in" : "translate-x-full"
        )}
      >
        <header className="flex items-center gap-2.5 border-b border-edge px-5 py-4">
          <span className="brand-gradient grid h-8 w-8 place-items-center rounded-xl text-white shadow-[0_6px_16px_-6px_var(--brand-ring)]">
            <Lightbulb size={15} />
          </span>
          <div>
            <h2 className="font-display text-sm font-bold text-ink">AI Insights</h2>
            <p className="text-[10.5px] text-mut">Generated live from your current view</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto rounded-md p-1.5 text-mut transition-colors hover:bg-panel2 hover:text-ink"
          >
            <X size={15} />
          </button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {items.length === 0 && (
            <p className="pt-8 text-center text-sm text-mut">
              Not enough data in this view yet — widen the date range.
            </p>
          )}
          {items.map((ins, i) => {
            const t = TONE[ins.tone];
            const Icon = t.icon;
            return (
              <div
                key={i}
                className="toast-in group rounded-2xl border border-edge bg-panel2 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[var(--shadow)]"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="flex items-start gap-3">
                  <span className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg", t.cls)}>
                    <Icon size={13} />
                  </span>
                  <div>
                    <p className="text-[12.5px] font-bold text-ink">{ins.title}</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-mut">{ins.detail}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <footer className="border-t border-edge px-5 py-3 text-[10px] text-faint">
          Insights recompute instantly when you change filters, ranges or segments.
        </footer>
      </aside>
    </>
  );
}
