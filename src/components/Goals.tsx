import { useState, useEffect } from "react";
import { Card, CardHead } from "./ui";
import { cn } from "../utils/cn";
import { CheckCircle2, AlertTriangle, Target, TrendingUp, Plus, Trash2, Edit2, Save, X, ChevronDown } from "lucide-react";
import { vaultGet, vaultSet } from "../lib/vault";

interface Goal {
  id: string;
  title: string;
  type: "winrate" | "journal" | "risk" | "streak" | "trades" | "drawdown" | "custom";
  target: number;
  current: number;
  unit: "%" | "entries" | "%" | "days" | "trades" | "%" | "";
  description: string;
  completed: boolean;
  createdAt: number;
}

const GOAL_TYPES = [
  { value: "winrate", label: "Win Rate %", unit: "%", icon: Target },
  { value: "journal", label: "Journal Entries", unit: "entries", icon: TrendingUp },
  { value: "risk", label: "Max Risk Per Trade %", unit: "%", icon: AlertTriangle },
  { value: "streak", label: "Profitable Streak Days", unit: "days", icon: Target },
  { value: "trades", label: "Trades This Month", unit: "trades", icon: Target },
  { value: "drawdown", label: "Max Drawdown %", unit: "%", icon: AlertTriangle },
  { value: "custom", label: "Custom Goal", unit: "", icon: Target },
] as const;

const VAULT_KEY = "nexora-goals";

function loadGoals(): Goal[] {
  try {
    return vaultGet<Goal[]>(VAULT_KEY, []);
  } catch {
    return [];
  }
}

function saveGoals(goals: Goal[]) {
  vaultSet(VAULT_KEY, goals);
}

function getDefaultGoals(): Goal[] {
  return [
    { id: "g-1", title: "Maintain 60%+ Win Rate", type: "winrate", target: 60, current: 72, unit: "%", description: "Keep win rate above 60% across all strategies", completed: false, createdAt: Date.now() - 86400000 * 30 },
    { id: "g-2", title: "Complete 20 Journal Entries", type: "journal", target: 20, current: 17, unit: "entries", description: "Write detailed journal entries for each trading day", completed: false, createdAt: Date.now() - 86400000 * 15 },
    { id: "g-3", title: "Max Risk Per Trade: 1%", type: "risk", target: 1, current: 1, unit: "%", description: "Never risk more than 1% on a single trade", completed: true, createdAt: Date.now() - 86400000 * 60 },
    { id: "g-4", title: "30-Day Profitable Streak", type: "streak", target: 30, current: 13, unit: "days", description: "Maintain consecutive profitable trading days", completed: false, createdAt: Date.now() - 86400000 * 7 },
  ];
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>(() => {
    const loaded = loadGoals();
    return loaded.length > 0 ? loaded : getDefaultGoals();
  });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Goal>>({
    title: "",
    type: "custom",
    target: 0,
    current: 0,
    description: "",
  });

  useEffect(() => {
    saveGoals(goals);
  }, [goals]);

  const addGoal = () => {
    const newGoal: Goal = {
      id: `g-${Date.now()}`,
      title: form.title || "New Goal",
      type: form.type || "custom",
      target: form.target || 0,
      current: form.current || 0,
      unit: GOAL_TYPES.find(t => t.value === form.type)?.unit || "",
      description: form.description || "",
      completed: false,
      createdAt: Date.now(),
    };
    setGoals(prev => [...prev, newGoal]);
    setShowForm(false);
    setForm({ title: "", type: "custom", target: 0, current: 0, description: "" });
  };

  const startEdit = (goal: Goal) => {
    setEditingId(goal.id);
    setForm({ ...goal });
    setShowForm(true);
  };

  const saveEdit = (id: string) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...form, completed: form.current >= form.target } : g));
    setEditingId(null);
    setShowForm(false);
    setForm({ title: "", type: "custom", target: 0, current: 0, description: "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setForm({ title: "", type: "custom", target: 0, current: 0, description: "" });
  };

  const deleteGoal = (id: string) => {
    if (confirm("Delete this goal?")) {
      setGoals(prev => prev.filter(g => g.id !== id));
    }
  };

  const updateProgress = (id: string, delta: number) => {
    setGoals(prev => prev.map(g => {
      if (g.id === id) {
        const next = Math.max(0, Math.min(g.target, g.current + delta));
        return { ...g, current: next, completed: next >= g.target };
      }
      return g;
    }));
  };

  const progress = (g: Goal) => Math.min(100, Math.round((g.current / Math.max(1, g.target)) * 100));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Goals</h1>
          <p className="text-mut mt-0.5">Track your trading objectives and habits</p>
        </div>
        <button onClick={() => { setForm({ title: "", type: "custom", target: 0, current: 0, description: "" }); setShowForm(true); }} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand text-white font-semibold hover:bg-brand-deep transition-colors">
          <Plus size={16} />
          <span>Add Goal</span>
        </button>
      </div>

      {/* Add/Edit Form */}
      {(showForm || editingId) && (
        <Card className="p-4">
          <h3 className="font-bold text-ink mb-4">{editingId ? "Edit Goal" : "Create New Goal"}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-mut mb-1">Goal Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Maintain 60%+ Win Rate" className="w-full px-3 py-2 rounded-lg border border-edge bg-panel text-ink focus:border-brand focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-mut mb-1">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as any, unit: GOAL_TYPES.find(t => t.value === e.target.value)?.unit || "" }))} className="w-full px-3 py-2 rounded-lg border border-edge bg-panel text-ink focus:border-brand focus:outline-none">
                {GOAL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-mut mb-1">Target Value</label>
              <input type="number" step="0.1" value={form.target} onChange={e => setForm(f => ({ ...f, target: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 rounded-lg border border-edge bg-panel text-ink focus:border-brand focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-mut mb-1">Current Progress</label>
              <input type="number" step="0.1" value={form.current} onChange={e => setForm(f => ({ ...f, current: parseFloat(e.target.value) || 0 }))} className="w-full px-3 py-2 rounded-lg border border-edge bg-panel text-ink focus:border-brand focus:outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-mut mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Optional description..." className="w-full px-3 py-2 rounded-lg border border-edge bg-panel text-ink focus:border-brand focus:outline-none" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={editingId ? () => saveEdit(editingId) : addGoal} className="flex-1 px-4 py-2 rounded-lg bg-brand text-white font-semibold hover:bg-brand-deep transition-colors">
              {editingId ? "Save Changes" : "Create Goal"}
            </button>
            <button onClick={cancelEdit} className="flex-1 px-4 py-2 rounded-lg border border-edge bg-panel text-mut hover:bg-panel2 transition-colors">Cancel</button>
          </div>
        </Card>
      )}

      {/* Goals Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {goals.map((g) => {
          const pct = progress(g);
          const Icon = GOAL_TYPES.find(t => t.value === g.type)?.icon || Target;
          return (
            <Card key={g.id} className="p-4 relative overflow-hidden">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="p-2 rounded-lg bg-brand/10">
                  <Icon className="w-5 h-5 text-brand" />
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(g)} className="p-1.5 rounded-lg hover:bg-brand-soft transition-colors" title="Edit">
                    <Edit2 className="w-4 h-4 text-mut" />
                  </button>
                  <button onClick={() => deleteGoal(g.id)} className="p-1.5 rounded-lg hover:bg-loss-soft transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4 text-loss" />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-ink mb-1 truncate">{g.title}</h3>
              <p className="text-sm text-mut mb-3">{g.description}</p>

              <div className="mb-3">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-mut">Progress</span>
                  <span className="font-bold text-ink">{progress(g)}%</span>
                </div>
                <div className="h-2 bg-surface border border-edge rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-brand to-brand-deep rounded-full transition-all duration-500" style={{ width: `${progress(g)}%` }} />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-mut">{g.current.toLocaleString()}{g.unit}</span>
                <span className="font-bold text-ink">/ {g.target.toLocaleString()}{g.unit}</span>
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-edge">
                <button onClick={() => updateProgress(g.id, -1)} disabled={g.current <= 0} className="flex-1 px-3 py-2 rounded-lg border border-edge bg-panel text-mut hover:bg-panel2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium">−</button>
                <button onClick={() => updateProgress(g.id, 1)} disabled={g.current >= g.target} className="flex-1 px-3 py-2 rounded-lg bg-brand text-white font-semibold hover:bg-brand-deep transition-colors text-sm">+</button>
                {g.completed && <span className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gain/10 text-gain text-sm font-semibold"><CheckCircle2 className="w-4 h-4" /> Complete</span>}
              </div>

              <p className="text-[10px] text-faint mt-2">Created {new Date(g.createdAt).toLocaleDateString()}</p>
            </Card>
          );
        })}
      </div>

      {goals.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-12 h-12 text-mut mx-auto mb-4" />
          <p className="text-mut">No goals yet. Create your first trading goal!</p>
        </div>
      )}
    </div>
  );
}