import { Card } from "../ui";
import { ChevronRight } from "lucide-react";

const HEATMAP_DATA = [
  [1, 2, 1, 0, 2, 3, 2],
  [0, 2, 1, 2, 0, 2, 2],
  [1, 2, 2, 0, 2, 3, 2],
  [2, 1, 2, 1, 2, 0, 3],
  [0, 2, 3, 2, 1, 0, 2],
  [2, 3, 1, 2, 2, 1, 2],
  [1, 1, 2, 2, 3, 1, 2],
];

const intensityColors = [
  "bg-slate-100 dark:bg-slate-800",   // 0 - dormant
  "bg-emerald-200 dark:bg-emerald-900/30",  // 1 - light
  "bg-rose-200 dark:bg-rose-900/30",        // 2 - loss
  "bg-emerald-300 dark:bg-emerald-600",     // 3 - strong
  "bg-emerald-400 dark:bg-emerald-500",     // 4 - flourishing
];

const MONTHS = ["Jul", "Aug", "Sep"];

export default function HeatmapCard({
  year = new Date().getFullYear(),
}: { year?: number }) {
  return (
    <Card className="p-4 card-shadow flex flex-col justify-between lg:col-span-2">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect height="7" width="7" x="3" y="3" /><rect height="7" width="7" x="14" y="3" /><rect height="7" width="7" x="14" y="14" /><rect height="7" width="7" x="3" y="14" /></svg>
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Progress Tracker</h3>
          </div>
          <span className="text-xs font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">+$6,342</span>
        </div>
        <div className="my-2 overflow-x-auto">
          <div className="flex space-x-1 items-start text-xs min-w-[200px]">
            <div className="flex flex-col space-y-2 text-[10px] text-mut font-medium pr-1 pt-0.5">
              <span>Mon</span>
              <span>&nbsp;</span>
              <span>Wed</span>
              <span>&nbsp;</span>
              <span>Fri</span>
              <span>&nbsp;</span>
              <span>Sun</span>
            </div>
            <div className="grid grid-flow-col grid-rows-7 gap-1 flex-1">
              {HEATMAP_DATA.flatMap((row, rowIdx) =>
                row.map((val, colIdx) => (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    className={`w-3.5 h-3.5 rounded-sm ${intensityColors[Math.min(val, intensityColors.length - 1)]}`}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-mut pt-2 border-t border-slate-100 dark:border-slate-700">
        <span>12w ago</span>
        <div className="flex items-center space-x-1">
          <span>Less</span>
          <span className="w-2 h-2 rounded-sm bg-slate-200 dark:bg-slate-700" />
          <span className="w-2 h-2 rounded-sm bg-emerald-200 dark:bg-emerald-900/30" />
          <span className="w-2 h-2 rounded-sm bg-emerald-400 dark:bg-emerald-600" />
          <span className="w-2 h-2 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
          <span>More</span>
        </div>
        <span className="font-medium text-slate-500 dark:text-slate-400">Today</span>
      </div>
      <div className="flex items-center justify-between text-[10px] text-mut pt-2 border-t border-slate-100 dark:border-slate-700">
        <span>Today's score <span className="inline-block ml-1 w-2 h-2 rounded-full bg-mut" /></span>
        <div className="text-center">
          <div className="text-sm font-bold text-ink dark:text-white">4/6</div>
          <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-1">
            <div className="bg-purple-600 h-full rounded-full" style={{ width: "66%" }} />
          </div>
        </div>
        <button className="border border-slate-200 dark:border-slate-700 px-3 py-1 rounded text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800">Button</button>
      </div>
    </Card>
  );
}