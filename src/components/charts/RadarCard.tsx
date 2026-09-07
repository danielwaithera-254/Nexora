import { useMemo } from "react";
import { Card, CardHead } from "../ui";
import { Sparkles, RotateCw } from "lucide-react";

const RADAR_AXES = [
  { key: "profitFactor", label: "Profit Factor", angle: -90 },
  { key: "risk", label: "Risk Mgmt", angle: -18 },
  { key: "discipline", label: "Discipline", angle: 54 },
  { key: "resilience", label: "Resilience", angle: 126 },
  { key: "winRate", label: "Win Rate", angle: 198 },
];

export default function RadarCard({
  scores = { profitFactor: 0.65, risk: 0.8, discipline: 0.75, resilience: 0.7, winRate: 0.4 },
  elo = 81,
}: {
  scores?: Record<string, number>;
  elo: number;
}) {
  const vertices = useMemo(() => {
    const cx = 140, cy = 115, r = 95;
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
      return `${140 + 95 * s * Math.cos(angle * Math.PI / 180)},${115 + 95 * s * Math.sin(angle * Math.PI / 180)}`;
    }).join(" ");
    return <polygon key={s} fill="none" points={pts} stroke="var(--surface-border)" strokeWidth="1" />;
  });

  return (
    <Card className="p-5 flex flex-col justify-between" glow>
      <CardHead
        title="Trader Diagnostic Radar"
        right={
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-purple/10 text-neon-violet border border-neon-purple/30">Zella 2.0</span>
        }
        icon={<Sparkles className="w-4 h-4 text-neon-purple animate-pulse" />}
      />
      <div className="relative py-2 flex items-center justify-center my-3">
        <svg className="w-full max-w-[280px] drop-shadow-[0_0_12px_rgba(192,132,252,0.3)]" viewBox="0 0 280 230">
          {/* Grid polygons */}
          {gridPolygons}
          {/* Axis spokes */}
          {RADAR_AXES.map((axis) => (
            <line key={axis.key} stroke="var(--surface-border)" strokeWidth="1" x1="140" y1="115"
              x2={140 + 95 * Math.cos(axis.angle * Math.PI / 180)}
              y2={115 + 95 * Math.sin(axis.angle * Math.PI / 180)} />
          ))}
          {/* Data shape */}
          <polygon
            fill="rgba(192, 132, 252, 0.28)"
            points={polygonPoints}
            stroke="#C084FC"
            strokeLinejoin="round"
            strokeWidth="2.5"
          />
          {/* Vertex dots */}
          {vertices.map((v, i) => (
            <circle key={i} cx={v.x} cy={v.y} fill="#E879F9" r="4" stroke="#0D0E12" strokeWidth="1.5" />
          ))}
          {/* Labels */}
          {vertices.map((v) => (
            <text key={v.label} fill="#9CA3AF" fontSize="10" fontWeight="600"
              x={v.x + (v.angle === -90 ? 0 : v.angle === -18 ? 20 : v.angle === 54 ? 20 : v.angle === 126 ? -20 : -20)}
              y={v.y + (v.angle === -90 ? -10 : v.angle === -18 ? 5 : v.angle === 54 ? 20 : v.angle === 126 ? 20 : 5)}
              textAnchor={v.angle === -90 ? "middle" : v.angle === -18 ? "start" : v.angle === 54 ? "start" : v.angle === 126 ? "middle" : "end"}
            >
              {v.label}
            </text>
          ))}
        </svg>
      </div>

      {/* Score summary */}
      <div className="mt-2 pt-3 border-t border-surface-border">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-faint font-medium">Trader Discipline Score</span>
          <span className="text-base font-extrabold text-white">{elo} <span className="text-xs font-normal text-neon-violet">/ 100</span></span>
        </div>
        <div className="w-full h-2 rounded-full bg-surface-border relative overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 via-neon-purple to-neon-pink rounded-full" style={{ width: `${elo}%` }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-neon-violet border-2 border-canvas rounded-full shadow-[0_0_8px_rgba(192,132,252,0.5)]" style={{ left: `${elo}%` }} />
        </div>
        <div className="flex justify-between text-[9px] text-faint mt-1">
          <span>0 (Novice)</span><span>50 (Consistent)</span><span>100 (Master)</span>
        </div>
      </div>
    </Card>
  );
}