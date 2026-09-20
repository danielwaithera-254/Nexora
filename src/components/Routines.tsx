import { useEffect, useMemo, useState } from "react";
import { ListChecks, Plus, Trash2, EyeOff } from "lucide-react";
import { Card, CardHead } from "./ui";
import { cn } from "../utils/cn";
import { storeGet, storeSet } from "../lib/vault";

type Phase = "pre" | "during" | "post";
interface Routine {
  id: string;
  phase: Phase;
  label: string;
  weekdays: number[]; // 0=Sun
  active: boolean;
  createdAt: number;
}
interface Check { [dateRoutine: string]: boolean; }
interface Miss {
  id: string;
  date: string;
  symbol: string;
  reason: string;
  lesson: string;
  createdAt: number;
}

const R_KEY = "nexora-routines";
const C_KEY = "nexora-routine-checks";
const M_KEY = "nexora-misses";

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function defaults(): Routine[] {
  const now = Date.now();
  return [
    { id: "r-pre-1", phase: "pre", label: "Mark HTF levels + session plan", weekdays: [1, 2, 3, 4, 5], active: true, createdAt: now },
    { id: "r-pre-2", phase: "pre", label: "Check news blackout + size calc", weekdays: [1, 2, 3, 4, 5], active: true, createdAt: now },
    { id: "r-dur-1", phase: "during", label: "One setup, max 3 trades before review", weekdays: [1, 2, 3, 4, 5], active: true, createdAt: now },
    { id: "r-post-1", phase: "post", label: "Journal every trade + tag mistakes", weekdays: [1, 2, 3, 4, 5], active: true, createdAt: now },
  ];
}

export default function Routines() {
  const [routines, setRoutines] = useState<Routine[]>(() => {
    const v = storeGet<Routine[]>(R_KEY, []);
    if (v.length) return v;
    try { if (localStorage.getItem("nexora-routines-seeded")) return []; } catch {}
    return defaults();
  });
  const [checks, setChecks] = useState<Check>(() => storeGet<Check>(C_KEY, {}));
  const [misses, setMisses] = useState<Miss[]>(() => storeGet<Miss[]>(M_KEY, []));
  const [tab, setTab] = useState<Phase | "misses">("pre");
  const [label, setLabel] = useState("");
  const [missForm, setMissForm] = useState({ date: iso(new Date()), symbol: "", reason: "", lesson: "" });

  useEffect(() => { storeSet(R_KEY, routines); try { localStorage.setItem("nexora-routines-seeded", "1"); } catch {} }, [routines]);
  useEffect(() => { storeSet(C_KEY, checks); }, [checks]);
  useEffect(() => { storeSet(M_KEY, misses); }, [misses]);

  // last 13 weeks grid
  const weeks = useMemo(() => {
    const out: { start: Date; days: Date[] }[] = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    for (let w = 12; w >= 0; w--) {
      const s = new Date(monday); s.setDate(monday.getDate() - w * 7);
      const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d; });
      out.push({ start: s, days });
    }
    return out;
  }, []);

  const todayIso = iso(new Date());
  const todayWd = new Date().getDay();
  const todays = routines.filter((r) => r.active && r.weekdays.includes(todayWd) && (tab === "misses" ? false : r.phase === tab));
  const toggle = (rid: string) => {
    const k = `${todayIso}:${rid}`;
    setChecks((p) => ({ ...p, [k]: !p[k] }));
  };

  const addRoutine = () => {
    if (!label.trim() || tab === "misses") return;
    setRoutines((p) => [...p, { id: `r-${Date.now()}`, phase: tab, label: label.trim(), weekdays: [1, 2, 3, 4, 5], active: true, createdAt: Date.now() }]);
    setLabel("");
  };

  const adherence13 = useMemo(() => {
    let need = 0;
    let done = 0;
    for (const w of weeks) for (const d of w.days) {
      if (d > new Date()) continue;
      const k = iso(d);
      for (const r of routines.filter((x) => x.active && x.weekdays.includes(d.getDay()))) {
        need++;
        if (checks[`${k}:${r.id}`]) done++;
      }
    }
    return need ? Math.round((done / need) * 100) : 0;
  }, [weeks, routines, checks]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Routines & Misses</h1>
          <p className="text-xs text-mut">Pre / during / post checklists + missed-opportunity log (kept out of trading metrics) · 13-week adherence {adherence13}%</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-panel2 p-1">
          {(["pre", "during", "post", "misses"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("rounded-lg px-3 py-1.5 text-xs font-bold capitalize", tab === t ? "bg-brand text-white" : "text-mut hover:text-ink")}>{t}</button>
          ))}
        </div>
      </div>

      {tab !== "misses" ? (
        <>
          <Card className="p-4">
            <CardHead title={`${tab === "pre" ? "Pre" : tab === "during" ? "During" : "Post"}-session · today`} info="Weekday schedules; check off as you go" icon={<ListChecks size={14} />} />
            <div className="mt-3 space-y-2">
              {todays.map((r) => {
                const on = !!checks[`${todayIso}:${r.id}`];
                return (
                  <div key={r.id} className={cn("flex items-center gap-2.5 rounded-xl border p-3", on ? "border-gain/40 bg-gain-soft" : "border-edge bg-panel2")}>
                    <button onClick={() => toggle(r.id)} className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-md border text-[11px] font-bold", on ? "border-gain bg-gain text-white" : "border-edge bg-panel text-transparent")}>✓</button>
                    <span className={cn("flex-1 text-sm font-medium", on ? "text-mut line-through" : "text-ink")}>{r.label}</span>
                    <span className="text-[10px] font-bold text-faint">{r.weekdays.map((w) => WD[w]![0]).join("")}</span>
                    <button onClick={() => setRoutines((p) => p.filter((x) => x.id !== r.id))} className="text-faint hover:text-loss"><Trash2 size={13} /></button>
                  </div>
                );
              })}
              {!todays.length && <p className="py-4 text-center text-xs text-mut">No {tab}-session routines scheduled today.</p>}
            </div>
            <div className="mt-3 flex gap-2">
              <input value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addRoutine()} placeholder={`Add ${tab}-session step + Enter…`} className="flex-1 rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs text-ink outline-none focus:border-brand" />
              <button onClick={addRoutine} className="rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white"><Plus size={13} /></button>
            </div>
          </Card>

          <Card className="p-4">
            <CardHead title="13-week history" info="Green = all scheduled steps checked that day" />
            <div className="mt-3 space-y-1.5 overflow-x-auto">
              {weeks.map((w, wi) => (
                <div key={wi} className="flex items-center gap-1.5">
                  <span className="w-10 shrink-0 text-[10px] font-bold text-faint">{w.start.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}</span>
                  {w.days.map((d, di) => {
                    const k = iso(d);
                    const due = routines.filter((r) => r.active && r.weekdays.includes(d.getDay()));
                    const doneN = due.filter((r) => checks[`${k}:${r.id}`]).length;
                    const pct = due.length ? doneN / due.length : -1;
                    return (
                      <span key={di} title={`${k} — ${doneN}/${due.length} steps`} className="h-5 w-5 rounded-md border"
                        style={{ background: pct < 0 ? "var(--panel2)" : pct >= 1 ? "var(--gain)" : pct >= 0.5 ? "color-mix(in srgb, var(--gain) 55%, var(--panel))" : pct > 0 ? "color-mix(in srgb, var(--warn) 60%, var(--panel))" : "var(--edge2)", borderColor: "var(--edge)" }} />
                    );
                  })}
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <Card className="p-4">
          <CardHead title={`Missed opportunities · ${misses.length}`} info="A miss is a lesson, not a trade — excluded from P&L, win rate and Edge Score" icon={<EyeOff size={14} />} />
          <div className="mt-3 grid gap-2 rounded-xl border border-edge bg-panel2 p-3 sm:grid-cols-2">
            <input type="date" value={missForm.date} onChange={(e) => setMissForm((f) => ({ ...f, date: e.target.value }))} className="rounded-lg border border-edge bg-panel px-3 py-2 text-xs text-ink" />
            <input value={missForm.symbol} onChange={(e) => setMissForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))} placeholder="Symbol (e.g. NQ)" className="rounded-lg border border-edge bg-panel px-3 py-2 text-xs text-ink" />
            <input value={missForm.reason} onChange={(e) => setMissForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Why missed? (late, no fill, hesitation…)" className="rounded-lg border border-edge bg-panel px-3 py-2 text-xs text-ink sm:col-span-2" />
            <input value={missForm.lesson} onChange={(e) => setMissForm((f) => ({ ...f, lesson: e.target.value }))} placeholder="Lesson / rule for next time…" className="rounded-lg border border-edge bg-panel px-3 py-2 text-xs text-ink sm:col-span-2" />
            <button onClick={() => { if (!missForm.symbol.trim()) return; setMisses((p) => [{ id: `m-${Date.now()}`, date: missForm.date, symbol: missForm.symbol.trim(), reason: missForm.reason.trim(), lesson: missForm.lesson.trim(), createdAt: Date.now() }, ...p]); setMissForm({ date: iso(new Date()), symbol: "", reason: "", lesson: "" }); }} className="rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white sm:col-span-2">Log miss</button>
          </div>
          <div className="mt-3 space-y-1.5">
            {misses.map((m) => (
              <div key={m.id} className="flex items-start gap-2 rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs">
                <span className="rounded bg-brand-soft px-1.5 py-0.5 font-bold text-brand">{m.symbol}</span>
                <div className="min-w-0 flex-1"><p className="font-semibold text-ink">{m.date} — {m.reason || "No reason logged"}</p>{m.lesson && <p className="text-mut">→ {m.lesson}</p>}</div>
                <button onClick={() => setMisses((p) => p.filter((x) => x.id !== m.id))} className="text-faint hover:text-loss"><Trash2 size={13} /></button>
              </div>
            ))}
            {!misses.length && <p className="py-4 text-center text-xs text-mut">No misses logged — misses stay out of your metrics by design.</p>}
          </div>
        </Card>
      )}
    </div>
  );
}
