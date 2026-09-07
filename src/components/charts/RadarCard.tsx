import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardHead } from "../ui";
import { Target } from "lucide-react";

const Tip = ({ active, payload }: any) =>
  active && payload?.length ? (
    <div className="rounded-lg border border-edge bg-panel/95 px-2.5 py-1.5 text-[11px] shadow-xl backdrop-blur">
      <span className="text-mut">{payload[0].payload.axis}</span>{" "}
      <b className="tnum text-ink">{payload[0].value}/100</b>
    </div>
  ) : null;

export default function RadarCard({ scores }: { scores: { overall: number; axes: { axis: string; value: number }[] } }) {
  const tone =
    scores.overall >= 65 ? "var(--gain)" : scores.overall >= 40 ? "var(--brand)" : "var(--loss)";
  return (
    <Card className="flex h-full flex-col" elevated>
      <CardHead title="Performance Score" info="Composite of profit factor, win rate, risk control, discipline and consistency." icon={<Target size={14} />} />
      <div className="h-52 px-2">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={scores.axes} outerRadius="72%">
            <PolarGrid stroke="var(--edge)" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 9.5, fill: "var(--mut)", fontWeight: 600 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip content={<Tip />} />
            <Radar
              dataKey="value"
              stroke="var(--brand)"
              fill="var(--brand)"
              fillOpacity={0.3}
              strokeWidth={2}
              animationDuration={800}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-auto border-t border-edge2 px-5 py-3.5">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-mut">Nexora Score</span>
          <span className="font-display text-2xl font-bold tnum" style={{ color: tone }}>
            {scores.overall}
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel2">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${scores.overall}%`, background: tone }}
          />
        </div>
      </div>
    </Card>
  );
}
