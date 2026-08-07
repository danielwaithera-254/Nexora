import { useEffect, useMemo, useState } from "react";
import { PlayCircle, PauseCircle, RotateCcw, SkipBack, SkipForward, Clock, EyeOff } from "lucide-react";
import { Card, CardHead, Seg, SelectBox } from "./ui";
import type { Trade } from "../data/trades";
import { fmtDate } from "../lib/format";
import { generatePricePath, maxRunUpDown, pathToCandles, pnlFromPath } from "../lib/tradetools";
import { cn } from "../utils/cn";

const fmtMoney = (v: number) => `${v >= 0 ? "+" : "-"}$${Math.abs(v).toLocaleString()}`;

export default function Replay({ trades }: { trades: Trade[] }) {
  const sorted = useMemo(() => [...trades].sort((a, b) => a.ts - b.ts), [trades]);
  const [tradeId, setTradeId] = useState<string>(sorted[sorted.length - 1]?.id ?? "");
  const trade = sorted.find((t) => t.id === tradeId) ?? sorted[sorted.length - 1];

  const path = useMemo(() => (trade ? generatePricePath(trade) : []), [trade]);
  const candles = useMemo(() => pathToCandles(path), [path]);
  const pnls = useMemo(() => (trade ? pnlFromPath(trade, path) : []), [trade, path]);
  const run = useMemo(() => maxRunUpDown(pnls), [pnls]);

  const [pct, setPct] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<"0.5x" | "1x" | "2x" | "4x">("1x");

  useEffect(() => {
    setPct(0);
    setPlaying(false);
  }, [tradeId]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setPct((p) => {
        const step = { "0.5x": 0.4, "1x": 0.8, "2x": 1.6, "4x": 3.2 }[speed];
        const next = p + step;
        if (next >= 100) {
          setPlaying(false);
          return 100;
        }
        return next;
      });
    }, 100);
    return () => window.clearInterval(id);
  }, [playing, speed]);

  const reveal = Math.round((pct / 100) * candles.length);
  const revealedPnl = pnls.slice(0, reveal + 1);
  const lastPnl = revealedPnl[revealedPnl.length - 1] ?? 0;
  const entryVisible = reveal >= 1;
  const exitVisible = reveal >= candles.length;

  if (!trade) {
    return (
      <Card>
        <CardHead title="Trade Replay" icon={<PlayCircle size={14} />} />
        <p className="px-5 pb-8 pt-2 text-center text-[11px] font-bold text-faint">No trades to replay — import or generate some first.</p>
      </Card>
    );
  }

  return (
    <Card>
      <CardHead
        title="Trade Replay"
        info="Revisit a trade dynamically — future candles are hidden so you only see what you knew at the time."
        icon={<PlayCircle size={14} />}
        right={
          <div className="flex items-center gap-2">
            <SelectBox
              value={trade.id}
              onChange={setTradeId}
              options={sorted.slice(-60).map((t) => ({
                value: t.id,
                label: `${t.symbol} · ${fmtDate(t.date)} · ${t.pnl >= 0 ? "+" : "-"}$${Math.abs(t.pnl)}`,
              }))}
              className="w-52"
            />
            <Seg
              options={[
                { key: "0.5x", label: "0.5×" },
                { key: "1x", label: "1×" },
                { key: "2x", label: "2×" },
                { key: "4x", label: "4×" },
              ]}
              value={speed}
              onChange={setSpeed}
            />
          </div>
        }
      />

      <div className="space-y-3 px-4 pb-4 sm:px-5">
        {/* header strip */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              if (playing) setPlaying(false);
              setPct((p) => Math.max(0, p - 10));
            }}
            className="rounded-xl border border-edge bg-panel2 px-3 py-2 text-[11px] font-bold text-mut transition-all hover:border-brand/40 hover:text-brand"
            aria-label="Step back"
          >
            <SkipBack size={12} />
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-bold text-white shadow-sm transition-all active:scale-95",
              playing ? "bg-loss hover:brightness-110" : "brand-gradient hover:shadow-[var(--shadow)]"
            )}
          >
            {playing ? <PauseCircle size={13} /> : <PlayCircle size={13} />}
            {playing ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => setPct((p) => Math.min(100, p + 10))}
            className="rounded-xl border border-edge bg-panel2 px-3 py-2 text-[11px] font-bold text-mut transition-all hover:border-brand/40 hover:text-brand"
            aria-label="Step forward"
          >
            <SkipForward size={12} />
          </button>
          <button
            onClick={() => {
              setPlaying(false);
              setPct(0);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-edge bg-panel2 px-3 py-2 text-[11px] font-bold text-mut transition-all hover:border-brand/40 hover:text-brand"
          >
            <RotateCcw size={12} /> Reset
          </button>

          <span className="ml-auto flex items-center gap-1.5 rounded-lg border border-edge bg-panel2 px-2.5 py-1.5 text-[9.5px] font-extrabold uppercase tracking-wider text-mut">
            <Clock size={11} className="text-brand" />
            {trade.symbol} · {trade.side} · {pct.toFixed(0)}% replayed
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          onChange={(e) => {
            setPlaying(false);
            setPct(parseInt(e.target.value, 10));
          }}
          className="w-full accent-[var(--brand)]"
        />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          {/* chart */}
          <div className="rounded-xl border border-edge bg-panel2 p-3 lg:col-span-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-faint">
                {reveal}/{candles.length} bars revealed
              </span>
              <span className="flex items-center gap-1 text-[9px] font-bold text-faint">
                <EyeOff size={10} /> future candles hidden
              </span>
            </div>
            <ReplayChart candles={candles} reveal={reveal} entryVisible={entryVisible} exitVisible={exitVisible} />
          </div>

          {/* running pnl */}
          <div className="rounded-xl border border-edge bg-panel2 p-3 lg:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-faint">Unrealized P&L</span>
              <span className={cn("tnum font-display text-[15px] font-extrabold", lastPnl >= 0 ? "text-gain" : "text-loss")}>
                {fmtMoney(lastPnl)}
              </span>
            </div>
            <ReplayPnl pnls={revealedPnl} />
            <div className="mt-2 grid grid-cols-2 gap-2 text-[9.5px] font-bold">
              <div className="rounded-lg bg-panel px-2.5 py-1.5">
                <span className="text-faint">Max unrealized </span>
                <span className="text-gain">+{run.up.toLocaleString()}</span>
              </div>
              <div className="rounded-lg bg-panel px-2.5 py-1.5">
                <span className="text-faint">Worst </span>
                <span className="text-loss">-{Math.abs(run.down).toLocaleString()}</span>
              </div>
            </div>
            <p className="mt-2 text-[9.5px] text-faint">
              Final result at 100%: {fmtMoney(trade.pnl)} ({trade.r > 0 ? "+" : ""}{trade.r.toFixed(1)}R)
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ReplayChart({
  candles,
  reveal,
  entryVisible,
  exitVisible,
}: {
  candles: { o: number; h: number; l: number; c: number }[];
  reveal: number;
  entryVisible: boolean;
  exitVisible: boolean;
}) {
  const W = 620;
  const H = 260;
  const PAD = 10;
  const lo = Math.min(...candles.map((c) => c.l));
  const hi = Math.max(...candles.map((c) => c.h));
  const span = hi - lo || 1;
  const y = (p: number) => PAD + (1 - (p - lo) / span) * (H - PAD * 2);
  const bw = W / candles.length;
  const nowX = Math.min(W, reveal * bw);
  const exitIdx = candles.length - 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {candles.slice(0, reveal).map((c, i) => {
        const x = i * bw + bw / 2;
        const up = c.c >= c.o;
        const col = up ? "var(--gain)" : "var(--loss)";
        const bodyY = y(Math.max(c.o, c.c));
        const bodyH = Math.max(1.5, Math.abs(y(c.o) - y(c.c)));
        return (
          <g key={i}>
            <line x1={x} y1={y(c.h)} x2={x} y2={y(c.l)} stroke={col} strokeWidth={1} opacity={0.75} />
            <rect x={x - bw * 0.28} y={bodyY} width={bw * 0.56} height={bodyH} rx={1} fill={col} />
          </g>
        );
      })}
      {reveal < candles.length && (
        <g>
          <line x1={nowX} x2={nowX} y1={0} y2={H} stroke="var(--brand)" strokeWidth={1.5} strokeDasharray="5 4" opacity={0.8} />
          <text x={Math.min(W - 40, nowX + 4)} y={14} fontSize={10} fontWeight={800} fill="var(--brand)">
            NOW
          </text>
        </g>
      )}
      {entryVisible && (
        <g>
          <circle cx={bw / 2} cy={y(candles[0].o)} r={4.5} fill="var(--panel)" stroke="var(--brand)" strokeWidth={2} />
          <text x={bw / 2 + 6} y={y(candles[0].o) - 8} fontSize={10} fontWeight={800} fill="var(--brand)">
            ENTRY
          </text>
        </g>
      )}
      {exitVisible && (
        <g>
          <circle cx={exitIdx * bw + bw / 2} cy={y(candles[exitIdx].c)} r={4.5} fill="var(--panel)" stroke="var(--warn)" strokeWidth={2} />
          <text x={exitIdx * bw + bw / 2 - 6} y={y(candles[exitIdx].c) - 8} textAnchor="end" fontSize={10} fontWeight={800} fill="var(--warn)">
            EXIT
          </text>
        </g>
      )}
    </svg>
  );
}

function ReplayPnl({ pnls }: { pnls: number[] }) {
  const W = 420;
  const H = 200;
  const PAD = 10;
  if (pnls.length < 2) {
    return (
      <div className="grid h-[200px] place-items-center text-[10px] font-bold text-faint">
        Press play to build the P&L curve…
      </div>
    );
  }
  const lo = Math.min(...pnls, 0);
  const hi = Math.max(...pnls, 0);
  const span = hi - lo || 1;
  const y = (v: number) => PAD + (1 - (v - lo) / span) * (H - PAD * 2);
  const step = Math.max(1, Math.floor(pnls.length / W));
  const pts = pnls
    .map((v, i) => (i % step === 0 || i === pnls.length - 1 ? `${(i / Math.max(1, pnls.length - 1)) * W},${y(v)}` : null))
    .filter(Boolean)
    .join(" ");
  const last = pnls[pnls.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="rpGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.3} />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
        </linearGradient>
      </defs>
      <line x1={0} x2={W} y1={y(0)} y2={y(0)} stroke="var(--edge)" strokeWidth={1} strokeDasharray="4 4" />
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#rpGrad)" />
      <polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinejoin="round" />
      <circle cx={W} cy={y(last)} r={3.5} fill={last >= 0 ? "var(--gain)" : "var(--loss)"} />
    </svg>
  );
}
