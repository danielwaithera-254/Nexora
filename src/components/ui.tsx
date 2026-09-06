import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import { cn } from "../utils/cn";

export function Card({
  children,
  className,
  hover,
  glow,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl bg-surface-card border border-surface-border",
        "shadow-[var(--shadow-neon-card)] transition-[transform,box-shadow,border-color] duration-300 ease-out",
        hover && "hover:-translate-y-[3px] hover:border-neon-violet/60 hover:shadow-[var(--shadow-neon-violet)]",
        glow && "neon-border-glow",
        className
      )}
    >
      {children}
    </section>
  );
}

export function CardHead({
  title,
  info,
  right,
  icon,
  className,
}: {
  title: string;
  info?: string;
  right?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-center gap-x-2 gap-y-2 px-4 pt-4 pb-2.5 sm:px-5", className)}>
      {icon && (
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-neon-purple/20 text-neon-purple border border-neon-purple/30">
          {icon}
        </span>
      )}
      <h3 className="font-bold text-[13px] leading-none tracking-tight text-white">{title}</h3>
      {info && <InfoTip text={info} />}
      <div className="ml-auto flex flex-wrap items-center gap-2">{right}</div>
    </header>
  );
}

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <Info size={13} className="text-faint cursor-help transition-colors group-hover:text-neon-violet" />
      <span className="pointer-events-none absolute left-1/2 top-full z-40 mt-1.5 w-52 -translate-x-1/2 translate-y-0 rounded-xl border border-surface-border bg-surface-card px-3 py-2 text-[11px] font-medium leading-snug text-mut opacity-0 shadow-[var(--shadow-neon-card)] transition-all duration-200 group-hover:translate-y-1 group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}

export function useCountUp(target: number, duration = 700) {
  const [val, setVal] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    if (from === target) {
      setVal(target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(from + (target - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      fromRef.current = target;
    };
  }, [target, duration]);
  return val;
}

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ob = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          ob.disconnect();
        }
      },
      { threshold: 0.06 }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={cn("reveal", inView && "is-in", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center rounded-xl border border-surface-border bg-surface-card-hover p-1">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all duration-200",
            value === o.key
              ? "neon-button text-white shadow-[var(--shadow-neon-pill)]"
              : "text-faint hover:bg-surface-border hover:text-white"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SelectBox({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-xl border border-surface-border bg-surface-card-hover py-[7px] pl-3 pr-7 text-[11px] font-bold text-white outline-none transition-colors hover:border-neon-violet/50 hover:text-white focus:border-neon-purple"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-faint"
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
      >
        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function Delta({ value, suffix = "%" }: { value: number | null; suffix?: string }) {
  if (value == null || !isFinite(value)) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md bg-surface-card-hover px-1.5 py-0.5 text-[10px] font-bold text-faint">
        <Minus size={10} /> n/a
      </span>
    );
  }
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[10px] font-bold ring-1 tnum",
        up ? "bg-neon-success/15 text-neon-success ring-neon-success/20" : "bg-neon-danger/15 text-neon-danger ring-neon-danger/20"
      )}
    >
      {up ? <ArrowUpRight size={11} strokeWidth={2.5} /> : <ArrowDownRight size={11} strokeWidth={2.5} />}
      {Math.abs(value).toFixed(1)}
      {suffix}
    </span>
  );
}

let sparkSeq = 0;

export function Sparkline({ data, color }: { data: number[]; color: string }) {
  const gid = useMemo(() => `spark-${++sparkSeq}`, []);
  if (!data.length) return null;
  const w = 96;
  const h = 30;
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * (w - 2) + 1;
    const y = h - 3 - ((v - min) / span) * (h - 6);
    return [x, y] as const;
  });
  let line = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const mx = (px + cx) / 2;
    line += ` Q${px.toFixed(1)},${py.toFixed(1)} ${mx.toFixed(1)},${((py + cy) / 2).toFixed(1)}`;
    if (i === pts.length - 1) line += ` T${cx.toFixed(1)},${cy.toFixed(1)}`;
  }
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${h} L${pts[0][0].toFixed(1)},${h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-24 overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={2.4} fill={color} />
      <circle cx={last[0]} cy={last[1]} r={4.5} fill={color} opacity={0.2} />
    </svg>
  );
}

export function PnlText({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        "tnum font-semibold",
        value > 0 ? "text-neon-success" : value < 0 ? "text-neon-danger" : "text-faint",
        className
      )}
    >
      {value > 0 ? "+" : ""}
      {value.toLocaleString("en-US")}
    </span>
  );
}

export function ChartTip({ active, payload, label, fmt }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card/95 px-3 py-2 text-xs shadow-[var(--shadow-neon-card)] backdrop-blur-md">
      {label != null && (
        <div className="mb-1.5 font-bold text-[11.5px] text-white">{label}</div>
      )}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 tnum">
          <span
            className="h-2 w-2 shrink-0 rounded-full ring-2 ring-surface-card"
            style={{ background: p.color || p.payload?.fill || p.fill }}
          />
          <span className="text-[11px] text-faint">{p.name}</span>
          <span className="ml-auto pl-4 text-[11.5px] font-bold text-white">
            {fmt ? fmt(p.value) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
}