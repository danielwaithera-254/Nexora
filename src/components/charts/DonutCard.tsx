import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardHead } from "../ui";
import { PieChart as PieIcon } from "lucide-react";
import { fmtPct } from "../../lib/format";

const COLORS: Record<string, string> = {
  gain: "var(--gain)",
  loss: "var(--loss)",
  flat: "var(--faint)",
};

const Tip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const total = payload[0].payload.total || 1;
  return (
    <div className="rounded-lg border border-edge bg-panel/95 px-2.5 py-1.5 text-[11px] shadow-xl backdrop-blur">
      <span className="text-mut">{p.name}</span>{" "}
      <b className="tnum text-ink">{p.value}</b>{" "}
      <span className="tnum text-faint">({fmtPct((p.value / total) * 100)})</span>
    </div>
  );
};

export default function DonutCard({
  data,
  winRate,
}: {
  data: { name: string; value: number; tone: string }[];
  winRate: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const enriched = data.map((d) => ({ ...d, total }));
  return (
    <Card className="flex h-full flex-col">
      <CardHead
        title="Outcome Split"
        info="Distribution of closed trades by result: winners, losers and breakeven."
        icon={<PieIcon size={14} />}
      />
      <div className="relative h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<Tip />} />
            <Pie
              data={enriched}
              dataKey="value"
              nameKey="name"
              innerRadius="62%"
              outerRadius="88%"
              paddingAngle={3}
              cornerRadius={5}
              strokeWidth={0}
              animationDuration={800}
            >
              {enriched.map((d, i) => (
                <Cell key={i} fill={COLORS[d.tone]} className="transition-opacity hover:opacity-80" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="font-display text-xl font-bold text-ink tnum">{fmtPct(winRate, 0)}</p>
            <p className="text-[9.5px] font-bold uppercase tracking-wider text-faint">win rate</p>
          </div>
        </div>
      </div>
      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-edge2 px-5 py-3">
        {data.map((d) => (
          <div key={d.name} className="text-center">
            <p className="text-[10px] font-bold text-mut">{d.name}</p>
            <p className="font-display text-sm font-bold tnum" style={{ color: COLORS[d.tone] }}>
              {d.value}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
