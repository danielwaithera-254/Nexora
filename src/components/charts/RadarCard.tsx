import { useMemo } from "react";
import { Card } from "../ui";

const RADAR_AXES = [
  { key: "profitFactor", label: "Profit Factor", angle: -90 },
  { key: "winRate", label: "Win Rate", angle: -18 },
  { key: "risk", label: "Risk Control", angle: 54 },
  { key: "discipline", label: "Discipline", angle: 126 },
  { key: "consistency", label: "Consistency", angle: 198 },
];

export default function RadarCard({
  scores = { profitFactor: 0.65, risk: 0.8, discipline: 0.75, consistency: 0.7, winRate: 0.4 },
  elo = 57,
}: {
  scores?: Record<string, number>;
  elo: number;
}) {
  const vertices = useMemo(() => {
    const cx = 100, cy = 100, r = 70;
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
      return `${100 + 70 * s * Math.cos(angle)},${100 + 70 * s * Math.sin(angle)}`;
    }).join(" ");
    return <polygon key={s} fill="none" points={pts} stroke="#e2e8f0" strokeWidth="1" />;
  });

  return (
    <Card className="p-4 card-shadow flex flex-col justify-between lg:col-span-2">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Performance Score</h3>
          </div>
        </div>
        <div className="relative w-full h-44 flex items-center justify-center my-1">
          <svg className="w-full h-full max-h-44" viewBox="0 0 200 200">
            {gridPolygons}
            <polygon fill="rgba(168, 85, 247, 0.28)" points={polygonPoints} stroke="#9333ea" strokeLinejoin="round" strokeWidth="2.5" />
            {RADAR_AXES.map((axis) => (
              <line
                key={axis.key}
                stroke="#f1f5f9"
                strokeWidth="1"
                x1="100"
                y1="100"
                x2={100 + 70 * Math.cos(axis.angle * Math.PI / 180)}
                y2={100 + 70 * Math.sin(axis.angle * Math.PI / 180)}
              />
            ))}
            {vertices.map((v, i) => (
              <circle key={i} cx={v.x} cy={v.y} fill="#9333ea" r="4" stroke="#fff" strokeWidth="1.5" />
            ))}
            <text fill="#64748b" fontSize="8" fontWeight="600" textAnchor="middle" x="100" y="14">Profit Factor</text>
            <text fill="#64748b" fontSize="8" fontWeight="600" textAnchor="start" x="186" y="70">Win Rate</text>
            <text fill="#64748b" fontSize="8" fontWeight="600" textAnchor="middle" x="150" y="174">Risk Control</text>
            <text fill="#64748b" fontSize="8" fontWeight="600" textAnchor="middle" x="50" y="174">Discipline</text>
            <text fill="#64748b" fontSize="8" fontWeight="600" textAnchor="end" x="8" y="70">Consistency</text>
          </svg>
        </div>
      </div>
      <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold tracking-wider text-mut uppercase">Nexora Score</span>
          <span className="text-xl font-black text-purple-700 dark:text-purple-300">{elo}</span>
        </div>
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="w-[57%] h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full" />
        </div>
      </div>
    </Card>
  );
}