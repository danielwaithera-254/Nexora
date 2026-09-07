import { Card, CardHead } from "../ui";
import { Sparkles, CheckSquare, ChevronRight } from "lucide-react";

export default function HeatmapCard({
  year = new Date().getFullYear(),
}: { year?: number }) {
  // Generate sample heatmap data (5 weeks x 7 days)
  const weeks = Array.from({ length: 5 }, (_, w) => 
    Array.from({ length: 7 }, (_, d) => Math.random() > 0.5 ? Math.floor(Math.random() * 4) : 0)
  );

  const intensityColors = [
    "bg-canvas/50 border border-surface-border/30",        // 0 - dormant
    "bg-purple-950/60 border border-purple-500/20",        // 1 - light
    "bg-purple-600",                                        // 2 - medium
    "bg-purple-400 shadow-sm shadow-purple-500/30",        // 3 - strong
    "bg-purple-300 shadow-[0_0_8px_rgba(192,132,252,0.5)]", // 4 - flourishing
  ];

  return (
    <Card className="p-5 flex flex-col justify-between" glow>
      <CardHead
        title="Trading Frequency Grid"
        right={
          <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 px-1.5 py-0.5 rounded text-[9px] font-bold">Beta</span>
        }
        icon={<CheckSquare className="w-4 h-4 text-neon-purple" />}
      />

      <div className="flex flex-col">
        <div className="flex justify-between text-[10px] text-faint font-medium mb-1.5 px-6">
          <span>Oct</span>
          <span>Nov</span>
          <span>Dec</span>
        </div>
        <div className="flex gap-1.5 justify-center">
          {/* Weekday Labels */}
          <div className="flex flex-col justify-between text-[9px] text-faint/70 py-0.5">
            <span>M</span>
            <span>W</span>
            <span>F</span>
          </div>
          {/* Matrix */}
          <div className="grid grid-flow-col grid-rows-5 gap-1.5 flex-1">
            {weeks[0].map((intensity, d) => (
              <div key={`0-${d}`} className={`w-full aspect-square rounded-sm ${intensityColors[intensity]}`} />
            ))}
            {weeks[1].map((intensity, d) => (
              <div key={`1-${d}`} className={`w-full aspect-square rounded-sm ${intensityColors[intensity]}`} />
            ))}
            {weeks[2].map((intensity, d) => (
              <div key={`2-${d}`} className={`w-full aspect-square rounded-sm ${intensityColors[intensity]}`} />
            ))}
            {weeks[3].map((intensity, d) => (
              <div key={`3-${d}`} className={`w-full aspect-square rounded-sm ${intensityColors[intensity]}`} />
            ))}
            {weeks[4].map((intensity, d) => (
              <div key={`4-${d}`} className={`w-full aspect-square rounded-sm ${intensityColors[intensity]}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Legend & Today Score */}
      <div className="mt-4 pt-3 flex items-center justify-between border-t border-surface-border">
        <div className="flex items-center gap-1.5 font-mono text-[9px] text-faint">
          <span>Dormant</span>
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-sm bg-canvas/50 border border-surface-border/30" />
            <div className="w-2.5 h-2.5 rounded-sm bg-purple-950/60 border border-purple-500/20" />
            <div className="w-2.5 h-2.5 rounded-sm bg-purple-600" />
            <div className="w-2.5 h-2.5 rounded-sm bg-purple-400" />
            <div className="w-2.5 h-2.5 rounded-sm bg-purple-300" />
          </div>
          <span>Flourishing</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[9px] font-mono text-faint uppercase">Today's Score</div>
            <div className="text-xs font-bold text-neon-violet">4 / 6 Rules</div>
          </div>
          <button className="border border-neon-violet/40 hover:border-neon-violet px-2.5 py-1 rounded text-[10px] font-mono font-medium text-neon-violet hover:bg-neon-purple/10 transition-colors">
            <ChevronRight className="w-3 h-3 ml-1" /> Details
          </button>
        </div>
      </div>
    </Card>
  );
}