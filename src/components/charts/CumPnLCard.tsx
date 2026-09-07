import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHead, ChartTip } from "../ui";
import { Activity } from "lucide-react";
import { fmtCompact, fmtDate, fmtDateShort, fmtMoney } from "../../lib/format";

export default function CumPnLCard({ data }: { data: { date: string; value: number; daily: number }[] }) {
  const { max, min, zeroFrac } = useMemo(() => {
    const vals = data.map((d) => d.value);
    const mx = Math.max(0, ...vals);
    const mn = Math.min(0, ...vals);
    const span = mx - mn || 1;
    return { max: mx, min: mn, zeroFrac: mx / span };
  }, [data]);

  const ticks = useMemo(() => {
    if (data.length < 2) return [];
    const step = Math.max(1, Math.floor(data.length / 5));
    return data.filter((_, i) => i % step === 0).map((d) => d.date);
  }, [data]);

  return (
    <Card className="flex h-full flex-col" elevated>
      <CardHead
        title="Daily Net Cumulative P&L"
        info="Running total of realized P&L per trading day for the selected view."
        icon={<Activity size={14} />}
        right={
          <span className="rounded-md bg-panel2 px-2 py-1 text-[10px] font-bold text-mut tnum">
            {data.length ? fmtMoney(data[data.length - 1].value, { sign: true }) : "$0"}
          </span>
        }
      />
      <div className="min-h-0 flex-1 px-2 pb-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 8, left: -14, bottom: 0 }}>
            <defs>
              <linearGradient id="cumFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gain)" stopOpacity={0.32} />
                <stop offset={`${zeroFrac * 100}%`} stopColor="var(--gain)" stopOpacity={0.02} />
                <stop offset={`${zeroFrac * 100}%`} stopColor="var(--loss)" stopOpacity={0.02} />
                <stop offset="100%" stopColor="var(--loss)" stopOpacity={0.3} />
              </linearGradient>
              <linearGradient id="cumStroke" x1="0" y1="0" x2="0" y2="1">
                <stop offset={`${Math.max(0, zeroFrac * 100 - 0.5)}%`} stopColor="var(--gain)" />
                <stop offset={`${Math.min(100, zeroFrac * 100 + 0.5)}%`} stopColor="var(--loss)" />
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
              domain={[min - Math.abs(max - min) * 0.05, max + Math.abs(max - min) * 0.08]}
              tickFormatter={(v) => fmtCompact(v)}
              tick={{ fontSize: 9.5, fill: "var(--faint)" }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip
              content={<ChartTip fmt={(v: number) => fmtMoney(v, { sign: true })} />}
              labelFormatter={(l) => fmtDate(String(l))}
              cursor={{ stroke: "var(--faint)", strokeDasharray: "3 3" }}
            />
            <ReferenceLine y={0} stroke="var(--faint)" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="value"
              name="Cumulative P&L"
              stroke="url(#cumStroke)"
              strokeWidth={2.2}
              fill="url(#cumFill)"
              activeDot={{ r: 4, strokeWidth: 0 }}
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
