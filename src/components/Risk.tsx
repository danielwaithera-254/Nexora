import { useMemo, useState } from "react";
import { ShieldAlert, AlertTriangle, CheckCircle2, Gauge, Flame, Briefcase, Hourglass } from "lucide-react";
import { Card, CardHead, Seg } from "./ui";
import type { Trade } from "../data/trades";
import { generateOpenPositions, riskReport, SEED_ACCOUNTS, type AccountDef } from "../lib/risk";
import { vaultGet } from "../lib/vault";
import { fmtMoney } from "../lib/format";
import { cn } from "../utils/cn";

export default function Risk({ trades }: { trades: Trade[] }) {
  const accounts = useMemo<AccountDef[]>(() => vaultGet("accounts", SEED_ACCOUNTS), []);
  const [span, setSpan] = useState<"today" | "week" | "month">("today");

  const report = useMemo(() => {
    const base = riskReport(accounts, trades, generateOpenPositions(trades));
    if (span === "today") return base;
    const days = span === "week" ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const within = trades.filter((t) => t.ts >= cutoff.getTime());
    const win = within.filter((t) => t.pnl > 0).length;
    const loss = -Math.min(0, within.reduce((s, t) => s + t.pnl, 0));
    const limit = accounts[0]?.dailyLossLimit ?? 1;
    return {
      ...base,
      todayLoss: loss,
      tradesToday: within.length,
      winsToday: win,
      riskUsed: Math.min(1, loss / limit),
      warnings: [
        loss >= limit
          ? { tone: "danger" as const, text: `Period loss (${fmtMoney(loss)}) hit the ${fmtMoney(limit)} limit.` }
          : { tone: "warn" as const, text: `You're using ${Math.round((loss / limit) * 100)}% of the ${fmtMoney(limit)} period limit.` },
      ],
    };
  }, [accounts, trades, span]);

  const riskPct = Math.round(report.riskUsed * 100);
  const limit = accounts[0];

  return (
    <div className="space-y-4">
      <Card>
        <CardHead
          title="Risk Dashboard"
          info="Live guardrails for your daily loss limit, exposure and position sizing. Warnings appear the moment a rule is in danger."
          icon={<ShieldAlert size={14} />}
          right={
            <Seg
              options={[
                { key: "today", label: "Today" },
                { key: "week", label: "7 days" },
                { key: "month", label: "30 days" },
              ]}
              value={span}
              onChange={(v) => setSpan(v as typeof span)}
            />
          }
        />

        <div className="grid grid-cols-1 gap-4 px-4 pb-4 sm:px-5 lg:grid-cols-3">
          {/* risk meter */}
          <div className="rounded-2xl border border-edge bg-panel2 p-5">
            <div className="flex items-center gap-2">
              <Gauge size={14} className="text-brand" />
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-mut">Risk used</p>
            </div>
            <div className="mt-4 flex items-end justify-between">
              <span className={cn("tnum font-display text-[34px] font-bold leading-none", riskPct >= 85 ? "text-loss" : riskPct >= 60 ? "text-warn" : "text-gain")}>
                {riskPct}%
              </span>
              <span className="tnum pb-1 text-[10px] font-bold text-faint">
                of {fmtMoney(limit?.dailyLossLimit ?? 1)} daily limit
              </span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-edge">
              <div
                className={cn("h-full rounded-full transition-all", riskPct >= 85 ? "bg-loss" : riskPct >= 60 ? "bg-warn" : "bg-gain")}
                style={{ width: `${riskPct}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-[10px] font-bold">
              <span className="text-faint">Loss today</span>
              <span className="tnum text-loss">-{fmtMoney(report.todayLoss)}</span>
            </div>
          </div>

          {/* stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatBox icon={<Flame size={13} />} label="Trades" value={String(report.tradesToday)} sub={`${report.winsToday} wins`} tone="brand" />
            <StatBox icon={<Hourglass size={13} />} label="Open exposure" value={fmtMoney(report.exposure)} sub={`${report.openCount} open`} tone={report.exposure > 0 ? "warn" : "gain"} />
            <StatBox icon={<Briefcase size={13} />} label="1% risk rule" value={fmtMoney(report.riskPerTrade)} sub="per trade max" tone="brand" />
            <StatBox
              icon={<ShieldAlert size={13} />}
              label="Daily remaining"
              value={fmtMoney(Math.max(0, (limit?.dailyLossLimit ?? 0) - report.todayLoss))}
              sub="before breach"
              tone={report.riskUsed >= 0.6 ? "loss" : "gain"}
            />
          </div>

          {/* warnings */}
          <div className="space-y-2">
            {report.warnings.map((w, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2.5 rounded-xl border p-3",
                  w.tone === "danger"
                    ? "border-loss/30 bg-loss-soft/50"
                    : w.tone === "warn"
                      ? "border-warn/30 bg-warn-soft/50"
                      : "border-gain/25 bg-gain-soft/40"
                )}
              >
                {w.tone === "danger" ? (
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-loss" />
                ) : w.tone === "warn" ? (
                  <AlertTriangle size={14} className="mt-0.5 shrink-0 text-warn" />
                ) : (
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-gain" />
                )}
                <p className={cn("text-[11px] font-bold leading-relaxed", w.tone === "danger" ? "text-loss" : w.tone === "warn" ? "text-warn" : "text-gain")}>
                  {w.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* position sizing guide */}
      <Card>
        <CardHead
          title="Position sizing guide"
          info="How much risk each trade should carry based on your primary account."
          icon={<Gauge size={14} />}
        />
        <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-3 sm:px-5">
          {[0.5, 1, 2].map((pct) => (
            <div key={pct} className="rounded-xl border border-edge bg-panel2 p-4 text-center">
              <p className="text-[9.5px] font-extrabold uppercase tracking-wider text-faint">{pct}% rule</p>
              <p className="tnum mt-1.5 font-display text-[20px] font-bold text-ink">
                {fmtMoney((limit?.balance ?? 0) * (pct / 100))}
              </p>
              <p className="mt-0.5 text-[9.5px] font-semibold text-faint">
                max risk per trade on {limit?.name ?? "primary account"}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StatBox({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: "gain" | "loss" | "warn" | "brand";
}) {
  const map = { gain: "text-gain", loss: "text-loss", warn: "text-warn", brand: "text-ink" };
  return (
    <div className="rounded-2xl border border-edge bg-panel2 p-4">
      <p className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-wider text-faint">
        {icon} {label}
      </p>
      <p className={cn("tnum mt-1.5 font-display text-[19px] font-bold leading-none", map[tone])}>{value}</p>
      <p className="mt-1 text-[9.5px] font-semibold text-faint">{sub}</p>
    </div>
  );
}
