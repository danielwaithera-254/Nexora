import { useMemo } from "react";
import { Card, CardHead } from "../ui";
import { Sparkles } from "lucide-react";

const RADAR_AXES = [
  { key: "profitFactor", label: "Profit factor", angle: -90 },
  { key: "risk", label: "Risk", angle: -18 },
  { key: "discipline", label: "Discipline", angle: 54 },
  { key: "resilience", label: "Resilience", angle: 126 },
  { key: "winRate", label: "Win", angle: 198 },
];

export default function RadarCard({
  scores = { profitFactor: 0.65, risk: 0.8, discipline: 0.75, resilience: 0.7, winRate: 0.4 },
  elo = 81,
}: {
  scores?: Record<string, number>;
  elo: number;
}) {
  const vertices = useMemo(() => {
    const cx = 100, cy = 115, r = 80;
    return RADAR_AXES.map((axis, i) => {
      const angle = (axis.angle * Math.PI) / 180;
      const value = scores[axis.key] || 0;
      return {
        x: cx + r * value * Math.cos(angle),
        y: cy + r * value * Math.sin(angle),
        label: axis.label,
        angle: axis.angle,
      };
    });
  }, [scores]);

  const polygonPoints = vertices.map((v) => `${v.x},${v.y}`).join(" ");
  const gridPolygons = [0.25, 0.5, 0.75, 1].map((s) => {
    const pts = RADAR_AXES.map((axis) => {
      const angle = (axis.angle * Math.PI) / 180;
      return `${100 + 80 * s * Math.cos(angle)},${115 + 80 * s * Math.sin(angle)}`;
    }).join(" ");
    return <polygon key={s} fill="none" points={pts} stroke="var(--surface-border)" strokeWidth="1" />;
  });

  return (
    <Card className="p-6 card-shadow flex flex-col">
      <div className="flex items-center gap-2 mb-6">
        <h3 className="font-bold text-ink">Zella Score</h3>
        <span className="bg-yellow-100 text-yellow-700 text-[10px] px-1.5 py-0.5 rounded font-bold">Beta</span>
      </div>
      <div className="flex justify-center mb-8 relative">
        <svg className="w-48 h-48" viewBox="0 0 200 230">
          {gridPolygons}
          <polygon fill="rgba(139, 92, 246, 0.2)" points={polygonPoints} stroke="#8b5cf6" strokeWidth="2" />
          {RADAR_AXES.map((axis) => (
            <line
              key={axis.key}
              stroke="var(--surface-border)"
              strokeWidth="1"
              x1="100"
              y1="115"
              x2={100 + 80 * Math.cos(axis.angle * Math.PI / 180)}
              y2={115 + 80 * Math.sin(axis.angle * Math.PI / 180)}
            />
          ))}
          {vertices.map((v, i) => (
            <circle
              key={i}
              cx={v.x}
              cy={v.y}
              fill="#8b5cf6"
              r="4"
              stroke="#fff"
              strokeWidth="1.5"
            />
          ))}
          <text fill="#6b7280" fontSize="10" fontWeight="600" textAnchor="middle" x="100" y="20">Profit factor</text>
          <text fill="#6b7280" fontSize="10" fontWeight="600" textAnchor="start" x="190" y="85">Risk</text>
          <text fill="#6b7280" fontSize="10" fontWeight="600" textAnchor="middle" x="160" y="180">Discipline</text>
          <text fill="#6b7280" fontSize="10" fontWeight="600" textAnchor="middle" x="40" y="180">Resilience</text>
          <text fill="#6b7280" fontSize="10" fontWeight="600" textAnchor="end" x="10" y="85">Win</text>
        </svg>
      </div>
      <div className="flex items-center justify-between border-t border-surface-border pt-4">
        <div>
          <div className="text-[10px] text-mut uppercase font-semibold">Your Zella Score</div>
          <div className="text-2xl font-bold text-ink">{elo}</div>
        </div>
        <div className="w-48">
          <div className="flex justify-between text-[10px] text-mut mb-1">
            <span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span>
          </div>
          <div className="h-2 w-full bg-surface-border rounded-full relative">
            <div className="absolute left-0 h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-full" style={{ width: `${elo}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-purple-600 rounded-full shadow-md" style={{ left: `${elo}%` }} />
          </div>
        </div>
      </div>
    </Card>
  );
}