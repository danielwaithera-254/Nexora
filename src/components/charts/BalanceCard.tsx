import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHead, ChartTip } from "../ui";
import { Wallet } from "lucide-react";
import { fmtCompact, fmtDate, fmtDateShort, fmtMoney } from "../../lib/format";

export default function BalanceCard({
  data,
}: {
  data: { date: string; balance: number }[];
}) {
  const ticks = useMemo(() => {
    if (data.length < 2) return [];
    const step = Math.max(1, Math.floor(data.length / 5));
    return data.filter((_, i) => i % step === 0).map((d) => d.date);
  }, [data]);

  const last = data.length ? data[data.length - 1] : null;

  return (
    <Card className="flex h-full flex-col">
      <CardHead
        title="Account Balance"
        info="Live equity curve synced from MT5, updated automatically as positions close."
        icon={<Wallet size={14} />}
        right={
          <div className="flex items-center gap-3 text-[10px] font-bold">
            <span className="flex items-center gap-1.5 text-mut">
              <span className="h-2 w-2 rounded-full bg-brand" /> Account Balance
            </span>
          </div>
        }
      />
      {last && (
        <p className="px-5 pb-1 font-display text-xl font-bold text-ink tnum">
          {fmtMoney(last.balance)}
          <span className="ml-2 text-[11px] font-semibold text-gain">
            Live Equity Sync Active
          </span>
        </p>
      )}
      <div className="min-h-0 flex-1 px-2 pb-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--brand)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--edge2)" vertical={false} />
            <XAxis
              dataKey="date"
              ticks={ticks}
              tickFormatter={fmtDateShort}
              tick={{ fontSize: 9.5, fill: "var(--faint)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={["dataMin - 800", "dataMax + 800"]}
              tickFormatter={(v) => fmtCompact(v)}
              tick={{ fontSize: 9.5, fill: "var(--faint)" }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip
              content={<ChartTip fmt={(v: number) => fmtMoney(v)} />}
              labelFormatter={(l) => fmtDate(String(l))}
              cursor={{ stroke: "var(--faint)", strokeDasharray: "3 3" }}
            />
            <Area
              type="monotone"
              dataKey="balance"
              name="Balance"
              stroke="var(--brand)"
              strokeWidth={2.2}
              fill="url(#balFill)"
              animationDuration={800}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
