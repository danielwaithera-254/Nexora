import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardHead, ChartTip } from "../ui";
import { BarChart3 } from "lucide-react";
import { fmtCompact, fmtMoney } from "../../lib/format";

export default function WeekdayBarCard({
  data,
}: {
  data: { day: string; pnl: number; count: number }[];
}) {
  return (
    <Card className="flex h-full flex-col">
      <CardHead
        title="P&L by Weekday"
        info="Which days of the week actually make you money. Size your best days, skip your worst."
        icon={<BarChart3 size={14} />}
      />
      <div className="min-h-0 flex-1 px-2 pb-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 12, right: 8, left: -14, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid stroke="var(--edge2)" vertical={false} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: "var(--mut)", fontWeight: 700 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => fmtCompact(v)}
              tick={{ fontSize: 9.5, fill: "var(--faint)" }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip
              cursor={{ fill: "var(--edge2)", opacity: 0.5 }}
              content={
                <ChartTip
                  fmt={(v: number) => `${fmtMoney(v, { sign: true })}`}
                />
              }
            />
            <Bar dataKey="pnl" name="Net P&L" radius={[6, 6, 0, 0]} animationDuration={800}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.pnl >= 0 ? "var(--gain)" : "var(--loss)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-around border-t border-edge2 px-4 py-2.5">
        {data.map((d) => (
          <div key={d.day} className="text-center">
            <p className="text-[9px] font-bold uppercase text-faint">{d.day}</p>
            <p className="text-[10px] font-bold text-mut tnum">{d.count}t</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
