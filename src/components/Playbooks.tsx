import { useMemo, useState } from "react";
import { Layers, Plus, Pencil, Trash2, X, CheckCircle2, ShieldCheck } from "lucide-react";
import { Card, CardHead } from "./ui";
import type { Trade } from "../data/trades";
import {
  adherencePercent,
  loadPlaybooks,
  loadReviews,
  PLAYBOOK_COLORS,
  savePlaybooks,
  type Playbook,
  type PlaybookColor,
} from "../lib/tradetools";
import { cn } from "../utils/cn";

let uid = 0;
const newId = (p: string) => `${p}-${Date.now().toString(36)}-${uid++}`;

export default function Playbooks({ trades }: { trades: Trade[] }) {
  const [playbooks, setPlaybooks] = useState<Playbook[]>(() => loadPlaybooks());
  const [selectedId, setSelectedId] = useState<string>(() => loadPlaybooks()[0]?.id ?? "");
  const [editing, setEditing] = useState<Playbook | null>(null);
  const reviews = useMemo(() => loadReviews(), []);

  const selected = playbooks.find((p) => p.id === selectedId) ?? playbooks[0];

  const persist = (next: Playbook[]) => {
    setPlaybooks(next);
    savePlaybooks(next);
  };

  const statsFor = useMemo(() => {
    const byId = new Map<string, { count: number; passed: number; total: number; wins: number; losses: number; pnl: number }>();
    for (const t of trades) {
      const r = reviews[t.id];
      if (!r?.playbookId) continue;
      const e = byId.get(r.playbookId) ?? { count: 0, passed: 0, total: 0, wins: 0, losses: 0, pnl: 0 };
      const pb = playbooks.find((p) => p.id === r.playbookId);
      const total = pb?.rules.length ?? 0;
      e.count++;
      e.total += total;
      e.passed += pb ? Math.round((adherencePercent(pb.rules, r.checks) / 100) * total) : 0;
      e.pnl += t.pnl;
      if (t.pnl > 0) e.wins++;
      else if (t.pnl < 0) e.losses++;
      byId.set(r.playbookId, e);
    }
    return byId;
  }, [trades, reviews, playbooks]);

  const addPlaybook = () => {
    const pb: Playbook = { id: newId("pb"), name: "New Strategy", color: "purple", rules: [{ id: newId("r"), text: "Rule 1" }] };
    const next = [...playbooks, pb];
    persist(next);
    setSelectedId(pb.id);
    setEditing({ ...pb });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHead
          title="Strategies & Playbooks"
          info="Define your trading systems as rule checklists. Check trades against them from the trade page — then see which rules your losers keep breaking."
          icon={<Layers size={14} />}
          right={
            <button
              onClick={addPlaybook}
              className="brand-gradient flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-bold text-white shadow-sm transition-all hover:shadow-[var(--shadow)] active:scale-95"
            >
              <Plus size={13} strokeWidth={2.5} />
              New Playbook
            </button>
          }
        />

        <div className="grid grid-cols-1 gap-4 px-4 pb-5 pt-1 lg:grid-cols-12 sm:px-5">
          {/* playbook list */}
          <div className="space-y-1.5 lg:col-span-4">
            {playbooks.map((pb) => {
              const s = statsFor.get(pb.id);
              const active = selected?.id === pb.id;
              return (
                <button
                  key={pb.id}
                  onClick={() => setSelectedId(pb.id)}
                  className={cn(
                    "w-full rounded-xl border px-3.5 py-3 text-left transition-all",
                    active ? "border-brand/50 bg-brand-soft/60" : "border-edge bg-panel2 hover:border-brand/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", PLAYBOOK_COLORS[pb.color ?? "purple"].dot)} />
                    <p className="min-w-0 flex-1 truncate text-[12px] font-extrabold text-ink">{pb.name}</p>
                    <span className="rounded-md bg-panel px-1.5 py-0.5 text-[8.5px] font-extrabold uppercase tracking-wide text-faint">
                      {pb.rules.length} rules
                    </span>
                  </div>
                  {s ? (
                    <p className="mt-1.5 text-[9.5px] text-mut">
                      {s.count} checked trades · {s.count ? Math.round((s.passed / s.total) * 100) : 0}% avg adherence ·{" "}
                      <span className={s.pnl >= 0 ? "text-gain" : "text-loss"}>
                        {s.pnl >= 0 ? "+" : "-"}${Math.abs(s.pnl).toLocaleString()}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1.5 text-[9.5px] text-faint">No trades checked against this playbook yet.</p>
                  )}
                </button>
              );
            })}
            {playbooks.length === 0 && (
              <p className="rounded-xl border border-dashed border-edge py-8 text-center text-[11px] font-bold text-faint">
                No playbooks yet — create your first strategy.
              </p>
            )}
          </div>

          {/* selected playbook details */}
          {selected ? (
            <div className="lg:col-span-8">
              <div className={cn("rounded-xl border bg-panel2 p-4", PLAYBOOK_COLORS[selected.color ?? "purple"].ring)}>
                <div className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", PLAYBOOK_COLORS[selected.color ?? "purple"].dot)} />
                  <h4 className="font-display text-[14px] font-bold text-ink">{selected.name}</h4>
                  <button
                    onClick={() => setEditing({ ...selected, rules: selected.rules.map((r) => ({ ...r })) })}
                    className="ml-auto flex items-center gap-1.5 rounded-lg border border-edge bg-panel px-2.5 py-1.5 text-[10px] font-bold text-mut transition-colors hover:border-brand/40 hover:text-brand"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${selected.name}"?`)) {
                        const next = playbooks.filter((p) => p.id !== selected.id);
                        persist(next);
                        setSelectedId(next[0]?.id ?? "");
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-edge bg-panel px-2.5 py-1.5 text-[10px] font-bold text-faint transition-colors hover:border-loss/40 hover:text-loss"
                  >
                    <Trash2 size={11} /> Delete
                  </button>
                </div>

                <div className="mt-3 space-y-1.5">
                  {selected.rules.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-2.5 rounded-lg border border-edge bg-panel px-3 py-2">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-brand-soft text-[10px] font-extrabold text-brand">
                        {i + 1}
                      </span>
                      <p className="min-w-0 flex-1 text-[11.5px] font-semibold text-ink">{r.text}</p>
                      <CheckCircle2 size={13} className="shrink-0 text-faint" />
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-[9.5px] leading-relaxed text-faint">
                  Open any trade from the Trade Log and use the <b className="text-mut">Playbook</b> tab to check its rules
                  — pass/fail per rule, why-it-was-missed notes and mistake tags. Adherence feeds back here.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid place-items-center rounded-xl border border-dashed border-edge py-14 text-center lg:col-span-8">
              <ShieldCheck size={26} className="text-faint" />
              <p className="mt-2 text-[11.5px] font-bold text-mut">Select or create a playbook</p>
            </div>
          )}
        </div>
      </Card>

      {editing && (
        <PlaybookEditor
          pb={editing}
          onSave={(next) => {
            persist(playbooks.map((p) => (p.id === next.id ? next : p)));
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

/* ---------------- edit modal ---------------- */

export function PlaybookEditor({
  pb,
  onSave,
  onCancel,
}: {
  pb: Playbook;
  onSave: (pb: Playbook) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(pb.name);
  const [color, setColor] = useState<PlaybookColor>(pb.color ?? "purple");
  const [rules, setRules] = useState(pb.rules.map((r) => ({ ...r })));

  const patchRule = (id: string, text: string) =>
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, text } : r)));

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-edge bg-panel shadow-2xl">
        <div className="flex items-center gap-2 border-b border-edge px-5 py-3.5">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand-soft text-brand">
            <Pencil size={12} />
          </span>
          <h3 className="font-display text-[13px] font-bold text-ink">Edit Playbook</h3>
          <button onClick={onCancel} className="ml-auto rounded-md p-1.5 text-faint hover:bg-panel2 hover:text-ink" aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <div>
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-mut">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Asian Range Breakout"
              className="mt-1 w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-[11.5px] font-bold text-ink outline-none transition-colors placeholder:text-faint focus:border-brand"
            />
          </div>

          <div>
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-mut">Color</span>
            <div className="mt-1.5 flex gap-2">
              {(Object.keys(PLAYBOOK_COLORS) as PlaybookColor[]).map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-xl ring-2 transition-all",
                    PLAYBOOK_COLORS[c].dot,
                    color === c ? "scale-105 ring-brand" : "opacity-45 ring-transparent hover:opacity-80"
                  )}
                >
                  {color === c && <CheckCircle2 size={13} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-mut">Rules</span>
              <button
                onClick={() => setRules((rs) => [...rs, { id: newId("r"), text: "" }])}
                className="flex items-center gap-1 rounded-lg border border-edge bg-panel2 px-2 py-1 text-[10px] font-bold text-brand transition-colors hover:border-brand/40"
              >
                <Plus size={11} /> Add rule
              </button>
            </div>
            <div className="mt-1.5 space-y-1.5">
              {rules.map((r) => (
                <div key={r.id} className="flex items-center gap-2">
                  <input
                    value={r.text}
                    onChange={(e) => patchRule(r.id, e.target.value)}
                    placeholder="e.g. Wait for displacement confirmation"
                    className="w-full rounded-lg border border-edge bg-panel2 px-3 py-1.5 text-[11px] font-semibold text-ink outline-none transition-colors placeholder:text-faint focus:border-brand"
                  />
                  <button
                    onClick={() => setRules((rs) => rs.filter((x) => x.id !== r.id))}
                    className="rounded-lg p-1.5 text-faint transition-colors hover:bg-loss-soft hover:text-loss"
                    aria-label="Remove rule"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {rules.length === 0 && <p className="text-[10px] text-faint">Add at least one rule.</p>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-edge px-5 py-3.5">
          <button onClick={onCancel} className="rounded-xl border border-edge bg-panel2 px-3.5 py-2 text-[11px] font-bold text-mut transition-all hover:text-ink">
            Cancel
          </button>
          <button
            onClick={() => onSave({ ...pb, name: name.trim() || pb.name, color, rules: rules.filter((r) => r.text.trim()) })}
            className="brand-gradient ml-auto rounded-xl px-4 py-2 text-[11px] font-bold text-white shadow-sm transition-all hover:shadow-[var(--shadow)] active:scale-95"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
