$p="C:\Users\HP 840\Nexora\src\components\Performance.tsx"
$c=Get-Content $p -Raw -Encoding UTF8
$old=@'
function MetricCard({ metric, dailyData, onHover, hoveredDate }: MetricCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isActive = hoveredDate !== null;
  const pos = metric.pos;

  return (
    <div 
      className={cn(
        "p-3 rounded-xl bg-panel border border-edge transition-all duration-200",
        "hover:border-brand/40 hover:shadow-[0_8px_24px_-16px_rgba(124,58,237,0.35)] hover:-translate-y-0.5",
        "relative overflow-hidden cursor-pointer"
      )}
      onMouseEnter={() => { setIsHovered(true); onHover(null); }}
      onMouseLeave={() => { setIsHovered(false); if (!hoveredDate) onHover(null); }}
    >
      <p className="text-[9px] font-bold uppercase tracking-wider text-mut leading-none">{metric.label}</p>
      <p className="mt-1 font-display text-lg font-bold leading-tight tnum truncate" style={{ color: `var(--${pos ? "gain" : "loss"})` }}>
        {metric.value}
      </p>
      
      {isHovered && !hoveredDate && daily.size>0 && (
        <MiniSparkline dailyData={daily} color={pos ? "gain" : "loss"} />
      )}
    </div>
  );
}
'@
$new=@'
function MetricCard({ metric, dailyData, onHover, hoveredDate }: MetricCardProps) {
  const [open, setOpen] = useState(false);
  const isActive = hoveredDate !== null;
  const pos = metric.pos;
  const days = useMemo(()=> [...dailyData.keys()].slice(-12), [dailyData]);
  return (
    <div 
      className={cn(
        "group relative overflow-hidden p-3 rounded-xl bg-panel border transition-all duration-200 cursor-pointer",
        open ? "border-brand/40 shadow-[0_8px_24px_-16px_rgba(124,58,237,0.35)] -translate-y-0.5" : "border-edge",
      )}
      onMouseEnter={() => { setOpen(true); onHover(null); }}
      onMouseLeave={() => { setOpen(false); if (!hoveredDate) onHover(null); }}
    >
      <p className="text-[9px] font-bold uppercase tracking-wider text-mut leading-none">{metric.label}</p>
      <p className="mt-1 font-display text-base font-bold leading-tight tnum truncate" style={{ color: `var(--${pos ? "gain" : "loss"})` }}>
        {metric.value}
      </p>
      <div className="mt-1 h-6"><MiniSpark dailyData={dailyData} color={pos ? "gain" : "loss"} /></div>
      {open && days.length>0 && (
        <div className="absolute inset-x-0 top-full z-10 mt-2 hidden group-hover:block">
          <div className="rounded-xl border border-edge bg-panel p-2 shadow-xl">
            <p className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-mut">Hover a day</p>
            <div className="grid grid-cols-3 gap-1">
              {days.map(d=>{
                const rec=dailyData.get(d)!;
                const active=hoveredDate===d;
                return (
                  <button key={d} onMouseEnter={()=>onHover(d)} className={cn("rounded-lg px-2 py-1 text-left text-xs", active?"bg-brand text-white":"bg-panel2 text-mut hover:bg-brand-soft hover:text-ink")}>
                    <span className="block font-bold">{d.slice(5)}</span>
                    <span className={cn("tnum text-[11px]", active?"text-white/90": rec.pnl>=0?"text-gain":"text-loss")}>{rec.pnl>=0?"+":""}{rec.pnl}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
'@
$c=$c -replace [regex]::Escape($old), $new
[IO.File]::WriteAllText($p, $c, [System.Text.Encoding]::UTF8)