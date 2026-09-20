import { useEffect, useMemo, useState } from "react";
import { Card, CardHead } from "./ui";
import { cn } from "../utils/cn";
import {
  CheckCircle2,
  Target,
  TrendingUp,
  Plus,
  Trash2,
  Edit2,
  Flame,
  ShieldCheck,
  BookOpen,
  CalendarCheck,
  Minus,
} from "lucide-react";
import { storeGet, storeSet } from "../lib/vault";

interface Goal {
  id: string;
  title: string;
  type: "profit" | "winrate" | "journal" | "risk" | "streak" | "trades" | "drawdown" | "custom";
  target: number;
  current: number;
  unit: string;
  description: string;
  deadline: string;
  completed: boolean;
  createdAt: number;
}

const GOAL_TYPES = [
  { value: "profit", label: "Profit Target ($)", unit: "$", icon: TrendingUp },
  { value: "winrate", label: "Win Rate (%)", unit: "%", icon: Target },
  { value: "journal", label: "Journal Entries", unit: "", icon: BookOpen },
  { value: "risk", label: "Max Risk / Trade (%)", unit: "%", icon: ShieldCheck },
  { value: "streak", label: "Green-Day Streak", unit: "d", icon: Flame },
  { value: "trades", label: "Trades Logged", unit: "", icon: Target },
  { value: "drawdown", label: "Stay Under Drawdown (%)", unit: "%", icon: ShieldCheck },
  { value: "custom", label: "Custom", unit: "", icon: Target },
] as const;

const TEMPLATES: { title: string; type: Goal["type"]; target: number; description: string }[] = [
  { title: "Monthly profit target", type: "profit", target: 1000, description: "Net P&L for the month" },
  { title: "60%+ win rate", type: "winrate", target: 60, description: "Keep win rate above target" },
  { title: "Journal every trade", type: "journal", target: 20, description: "Write up every execution" },
  { title: "10-day green streak", type: "streak", target: 10, description: "Consecutive green days" },
];

const VAULT_KEY = "nexora-goals";

const SEED_FLAG = "nexora-goals-seeded";

function loadGoals(): Goal[] {
  try {
    const raw = storeGet<any[]>(VAULT_KEY, []);
    if (!Array.isArray(raw)) return [];
    if (raw.length) return raw.map(normalizeGoal);
    try { if (localStorage.getItem(SEED_FLAG)) return []; } catch {}
    return [];
  } catch {
    return [];
  }
}

function normalizeGoal(g: any): Goal {
  return {
    id: String(g.id ?? `g-${Date.now()}`),
    title: String(g.title ?? "Goal"),
    type: (g.type ?? "custom") as Goal["type"],
    target: Number(g.target) || 0,
    current: Number(g.current) || 0,
    unit: String(g.unit ?? GOAL_TYPES.find((t) => t.value === g.type)?.unit ?? ""),
    description: String(g.description ?? ""),
    deadline: String(g.deadline ?? ""),
    completed: Boolean(g.completed ?? Number(g.current) >= Number(g.target)),
    createdAt: Number(g.createdAt) || Date.now(),
  };
}

function getDefaultGoals(): Goal[] {
  const now = Date.now();
  return [
    { id: "g-1", title: "Monthly profit target", type: "profit", target: 1000, current: 720, unit: "$", description: "Net P&L for the month", deadline: "", completed: false, createdAt: now - 86400000 * 30 },
    { id: "g-2", title: "60%+ win rate", type: "winrate", target: 60, current: 56, unit: "%", description: "Keep win rate above target", deadline: "", completed: false, createdAt: now - 86400000 * 15 },
    { id: "g-3", title: "Journal every trade", type: "journal", target: 20, current: 20, unit: "", description: "Write up every execution", deadline: "", completed: true, createdAt: now - 86400000 * 60 },
    { id: "g-4", title: "10-day green streak", type: "streak", target: 10, current: 4, unit: "d", description: "Consecutive green days", deadline: "", completed: false, createdAt: now - 86400000 * 7 },
  ];
}

const pct = (g: Goal) => Math.min(100, Math.round((g.current / Math.max(1, g.target)) * 100));

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>(() => {
    const loaded = loadGoals();
    return loaded.length ? loaded : getDefaultGoals();
  });
  const [tab, setTab] = useState<"all" | "active" | "done">("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Goal>>({ title: "", type: "custom", target: 0, current: 0, description: "", deadline: "" });

  useEffect(() => {
    storeSet(VAULT_KEY, goals);
    try { localStorage.setItem(SEED_FLAG, "1"); } catch {}
  }, [goals]);

  const done = goals.filter((g) => g.completed).length;
  const overall = goals.length ? Math.round(goals.reduce((s, g) => s + pct(g), 0) / goals.length) : 0;
  const visible = goals.filter((g) => (tab === "active" ? !g.completed : tab === "done" ? g.completed : true));

  const save = (patch: Partial<Goal>, id?: string) => {
    if (id) {
      setGoals((prev) => prev.map((g) => {
        if (g.id !== id) return g;
        const next = { ...g, ...patch };
        next.completed = next.current >= next.target && next.target > 0;
        return next;
      }));
    }
  };

  const submit = () => {
    const type = (form.type ?? "custom") as Goal["type"];
    const target = Math.max(0, Number(form.target) || 0);
    const current = Math.max(0, Number(form.current) || 0);
    if (editingId) {
      setGoals((prev) => prev.map((g) => g.id === editingId ? {
        ...g, ...form, type, target, current,
        unit: GOAL_TYPES.find((t) => t.value === type)?.unit ?? "",
        completed: target > 0 && current >= target,
      } : g));
      setEditingId(null);
    } else {
      setGoals((prev) => [...prev, {
        id: `g-${Date.now()}`, title: (form.title ?? "").trim() || "New Goal", type, target, current,
        unit: GOAL_TYPES.find((t) => t.value === type)?.unit ?? "",
        description: (form.description ?? "").trim(), deadline: (form.deadline ?? "").trim(),
        completed: target > 0 && current >= target, createdAt: Date.now(),
      }]);
    }
    setShowForm(false);
    setForm({ title: "", type: "custom", target: 0, current: 0, description: "", deadline: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold leading-tight text-ink">Goals</h1>
          <p className="text-xs text-mut">{done} of {goals.length} complete · {overall}% overall</p>
        </div>
        <button onClick={() => { setEditingId(null); setForm({ title: "", type: "custom", target: 0, current: 0, description: "", deadline: "" }); setShowForm(true); }} className="flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-deep">
          <Plus size={14} /> New Goal
        </button>
      </div>

      {/* TradeZella-style summary strip */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative grid h-16 w-16 shrink-0 place-items-center">
            <svg viewBox="0 0 44 44" className="h-16 w-16 -rotate-90">
              <circle cx="22" cy="22" r="18" fill="none" stroke="var(--edge2)" strokeWidth="5" />
              <circle cx="22" cy="22" r="18" fill="none" stroke="var(--brand)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${(overall / 100) * 113} 113`} className="transition-all duration-500" />
            </svg>
            <span className="absolute font-display text-sm font-bold text-ink">{overall}%</span>
          </div>
          <div className="min-w-[180px] flex-1">
            <p className="text-sm font-bold text-ink">Overall progress</p>
            <p className="text-xs text-mut">{done} completed · {goals.length - done} in progress</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel2">
              <div className="h-full rounded-full bg-gradient-to-r from-brand to-gain transition-all" style={{ width: `${overall}%` }} />
            </div>
          </div>
          <div className="flex gap-1 rounded-xl bg-panel2 p-1">
            {(["all", "active", "done"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn("rounded-lg px-3 py-1.5 text-xs font-bold", tab === t ? "bg-brand text-white" : "text-mut hover:text-ink")}>
                {t === "all" ? `All (${goals.length})` : t === "active" ? `Active (${goals.length - done})` : `Done (${done})`}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Quick-add templates */}
      {!showForm && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-faint">Quick add:</span>
          {TEMPLATES.map((t) => (
            <button
              key={t.title}
              onClick={() => setGoals((prev) => [...prev, { id: `g-${Date.now()}`, title: t.title, type: t.type, target: t.target, current: 0, unit: GOAL_TYPES.find((x) => x.value === t.type)?.unit ?? "", description: t.description, deadline: "", completed: false, createdAt: Date.now() }])}
              className="rounded-full border border-edge bg-panel px-2.5 py-1 text-xs font-semibold text-mut transition-colors hover:border-brand hover:text-brand"
            >
              + {t.title}
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-ink">{editingId ? "Edit goal" : "New goal"}</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-bold text-mut">Title</span>
              <input value={form.title ?? ""} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Monthly profit target" className="w-full rounded-lg border border-edge bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-brand" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-mut">Type</span>
              <select value={form.type ?? "custom"} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Goal["type"], unit: GOAL_TYPES.find((t) => t.value === e.target.value)?.unit ?? "" }))} className="w-full rounded-lg border border-edge bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-brand">
                {GOAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-mut">Deadline (optional)</span>
              <input type="date" value={form.deadline ?? ""} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} className="w-full rounded-lg border border-edge bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-brand" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-mut">Target</span>
              <input type="number" min={0} step="any" value={form.target ?? 0} onChange={(e) => setForm((f) => ({ ...f, target: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-edge bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-brand" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-mut">Current</span>
              <input type="number" min={0} step="any" value={form.current ?? 0} onChange={(e) => setForm((f) => ({ ...f, current: Number(e.target.value) || 0 }))} className="w-full rounded-lg border border-edge bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-brand" />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-bold text-mut">Notes</span>
              <input value={form.description ?? ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Why this goal matters…" className="w-full rounded-lg border border-edge bg-panel2 px-3 py-2 text-sm text-ink outline-none focus:border-brand" />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={submit} className="flex-1 rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-deep">{editingId ? "Save changes" : "Create goal"}</button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }} className="flex-1 rounded-lg border border-edge px-4 py-2 text-sm font-semibold text-mut hover:bg-panel2">Cancel</button>
          </div>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((g) => {
          const p = pct(g);
          const Icon = GOAL_TYPES.find((t) => t.value === g.type)?.icon ?? Target;
          return (
            <Card key={g.id} className={cn("relative flex flex-col overflow-hidden p-4", g.completed && "ring-1 ring-gain/40")}>
              <span className={cn("absolute inset-x-0 top-0 h-1", g.completed ? "bg-gain" : "bg-gradient-to-r from-brand to-brand-deep")} />
              <div className="flex items-start gap-2.5">
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", g.completed ? "bg-gain-soft text-gain" : "bg-brand-soft text-brand")}>
                  {g.completed ? <CheckCircle2 size={16} /> : <Icon size={16} />}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-bold text-ink">{g.title}</h3>
                  <p className="truncate text-[11px] text-faint">{g.description || GOAL_TYPES.find((t) => t.value === g.type)?.label}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => { setEditingId(g.id); setForm({ ...g }); setShowForm(true); }} className="rounded-md p-1.5 text-faint hover:bg-panel2 hover:text-ink" title="Edit"><Edit2 size={13} /></button>
                  <button onClick={() => { if (confirm("Delete this goal?")) setGoals((prev) => prev.filter((x) => x.id !== g.id)); }} className="rounded-md p-1.5 text-faint hover:bg-loss-soft hover:text-loss" title="Delete"><Trash2 size={13} /></button>
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between">
                <p className="font-display text-xl font-bold tnum text-ink">
                  {g.unit === "$" ? "$" : ""}{g.current.toLocaleString()}<span className="text-xs font-semibold text-faint"> / {g.unit === "$" ? "$" : ""}{g.target.toLocaleString()}{g.unit && g.unit !== "$" ? g.unit : ""}</span>
                </p>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", g.completed ? "bg-gain-soft text-gain" : p >= 70 ? "bg-brand-soft text-brand" : "bg-panel2 text-mut")}>
                  {g.completed ? "Complete" : `${p}%`}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel2">
                <div className={cn("h-full rounded-full transition-all", g.completed ? "bg-gain" : "bg-gradient-to-r from-brand to-brand-deep")} style={{ width: `${p}%` }} />
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-edge pt-3">
                <button onClick={() => save({ current: Math.max(0, g.current - 1) }, g.id)} disabled={g.current <= 0} className="grid h-7 w-7 place-items-center rounded-lg border border-edge text-mut hover:bg-panel2 disabled:opacity-30"><Minus size={13} /></button>
                <button onClick={() => save({ current: Math.min(g.target, g.current + 1) }, g.id)} disabled={g.current >= g.target} className="grid h-7 w-7 place-items-center rounded-lg bg-brand text-white hover:bg-brand-deep disabled:opacity-30"><Plus size={13} /></button>
                <input type="range" min={0} max={Math.max(1, g.target)} value={Math.min(g.current, g.target)} onChange={(e) => save({ current: Number(e.target.value) }, g.id)} className="flex-1" aria-label="Goal progress" />
                {g.deadline && <span className="shrink-0 text-[11px] font-semibold text-faint">{g.deadline.slice(5)}</span>}
              </div>
            </Card>
          );
        })}
      </div>

      {!visible.length && (
        <div className="py-10 text-center">
          <Target className="mx-auto h-10 w-10 text-faint" />
          <p className="mt-2 text-sm text-mut">{tab === "done" ? "No completed goals yet — keep pushing." : "No goals here. Create one above."}</p>
        </div>
      )}
    </div>
  );
}
