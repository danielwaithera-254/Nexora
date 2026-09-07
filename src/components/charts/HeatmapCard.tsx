import { Card, CardHead } from "../ui";
import { ChevronRight } from "lucide-react";

const HEATMAP_DATA = [
  [1, 2, 1, 0, 2, 3, 2, 1, 0, 2, 3, 1],
  [0, 2, 1, 2, 0, 2, 2, 1, 2, 2, 2, 1],
  [1, 2, 2, 0, 2, 3, 2, 1, 0, 2, 2, 1],
  [2, 1, 2, 1, 2, 0, 3, 2, 1, 2, 1, 2],
  [0, 2, 3, 2, 1, 0, 2, 2, 1, 2, 1, 2],
  [2, 3, 1, 2, 2, 1, 2, 1, 3, 1, 2, 0],
  [1, 1, 2, 2, 3, 1, 2, 1, 2, 1, 2, 1],
];

const intensityColors = [
  "bg-surface-border",        // 0 - dormant
  "bg-purple-100",            // 1 - light
  "bg-purple-300",            // 2 - medium
  "bg-purple-500",            // 3 - strong
  "bg-purple-700",            // 4 - flourishing
];

const MONTHS = ["Jul", "Aug", "Sep"];

export default function HeatmapCard({
  year = new Date().getFullYear(),
}: { year?: number }) {
  return (
    <Card className="p-6 card-shadow flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-ink">Progress tracker</h3>
          <span className="bg-yellow-100 text-yellow-700 text-[10px] px-1.5 py-0.5 rounded font-bold">Beta</span>
        </div>
        <button className="text-blue-500 text-xs font-semibold hover:underline flex items-center gap-1">
          View more <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <div className="flex gap-16 mb-2 text-xs text-mut ml-8">
          {MONTHS.map((m) => <span key={m}>{m}</span>)}
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col gap-1.5 text-[9px] text-mut pt-1">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>
          <div className="grid grid-cols-12 grid-rows-7 gap-1">
            {HEATMAP_DATA.flatMap((row, rowIdx) =>
              row.map((val, colIdx) => (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  className={`heatmap-cell ${intensityColors[Math.min(val, intensityColors.length - 1)]}`}
                />
              ))
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-mut">Less</span>
          <div className="flex gap-0.5">
            {intensityColors.map((c, i) => (
              <div key={i} className={`heatmap-cell ${c}`} />
            ))}
          </div>
          <span className="text-[9px] text-mut">More</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-[9px] text-mut uppercase">Today's score <span className="inline-block ml-1" style={{ width: 12, height: 12, borderRadius: "50%", background: "#6b7280" }} /></div>
            <div className="text-sm font-bold text-ink">4/6</div>
            <div className="w-16 h-1 bg-surface-border rounded-full mt-1">
              <div className="bg-purple-600 h-full rounded-full" style={{ width: "66%" }} />
            </div>
          </div>
          <button className="border border-surface-border px-3 py-1 rounded text-[10px] font-bold hover:bg-surface-hover">Button</button>
        </div>
      </div>
    </Card>
  );
}