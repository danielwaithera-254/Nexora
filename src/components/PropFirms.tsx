import { useEffect, useMemo, useState } from "react";
import { Building2, Plus, Download, Upload, Trash2, Wallet, TrendingUp, Clock, FileText } from "lucide-react";
import { Card, CardHead } from "./ui";
import { cn } from "../utils/cn";
import { fmtMoney } from "../lib/format";
import { storeGet, storeSet } from "../lib/vault";
import {
  computePropStats, expectedNet, propCashTemplate,
  type PropAccount, type PropEntry, type PayoutRequest, type ExpenseCategory,
} from "../lib/journalPro";

const ACC_KEY = "nexora-prop-accounts";
const ENTRY_KEY = "nexora-prop-entries";
const PAYOUT_KEY = "nexora-prop-payouts";

const CATS: ExpenseCategory[] = ["evaluation", "reset", "activation", "subscription", "platform", "market_data", "transfer", "other"];

function load<T>(k: string, fb: T): T {
  const v = storeGet<T | null>(k, null);
  return (v ?? fb) as T;
}

function demoAccounts(): PropAccount[] {
  const now = Date.now();
  return [
    { id: "demo-acc-1", firm: "FundedNext", name: "FN Eval #1 (breached)", currency: "USD", phase: "evaluation", status: "breached", openedAt: "2025-06-01", nominalSize: 50000, createdAt: now },
    { id: "demo-acc-2", firm: "FundedNext", name: "FN Eval #2 → Funded", currency: "USD", phase: "funded", status: "active", openedAt: "2025-09-01", nominalSize: 50000, createdAt: now },
    { id: "demo-acc-3", firm: "Hola Prime", name: "HP 2K Live", currency: "USD", phase: "live", status: "active", openedAt: "2026-01-10", nominalSize: 2000, renewalDate: "2026-11-01", createdAt: now },
  ];
}
function demoEntries(): PropEntry[] {
  const now = Date.now();
  return [
    { id: "e1", kind: "expense", firm: "FundedNext", accountId: "demo-acc-1", currency: "USD", date: "2025-06-01", amount: 49, category: "evaluation", reference: "INV-1", createdAt: now },
    { id: "e2", kind: "expense", firm: "FundedNext", accountId: "demo-acc-2", currency: "USD", date: "2025-09-01", amount: 49, category: "evaluation", reference: "INV-2", createdAt: now },
    { id: "e3", kind: "refund", firm: "FundedNext", accountId: "demo-acc-2", currency: "USD", date: "2025-10-01", amount: 49, expenseId: "e2", notes: "Pass refund", createdAt: now },
    { id: "e4", kind: "receipt", firm: "FundedNext", accountId: "demo-acc-2", currency: "USD", date: "2026-02-15", amount: 400, reference: "BANK-1", notes: "Partial payout", createdAt: now },
    { id: "e5", kind: "receipt", firm: "FundedNext", accountId: "demo-acc-2", currency: "USD", date: "2026-03-01", amount: 490, reference: "BANK-2", createdAt: now },
    { id: "e6", kind: "expense", firm: "Hola Prime", accountId: "demo-acc-3", currency: "USD", date: "2026-01-10", amount: 29, category: "subscription", createdAt: now },
  ];
}

export default function PropFirms() {
  const [accounts, setAccounts] = useState<PropAccount[]>(() => load(ACC_KEY, []));
  const [entries, setEntries] = useState<PropEntry[]>(() => load(ENTRY_KEY, []));
  const [payouts, setPayouts] = useState<PayoutRequest[]>(() => load(PAYOUT_KEY, []));
  const [demo, setDemo] = useState(false);
  const [view, setView] = useState<"overview" | "accounts" | "payouts" | "ledger">("overview");
  const [firmFilter, setFirmFilter] = useState("All");
  const [showAcc, setShowAcc] = useState(false);
  const [showEntry, setShowEntry] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  const [accForm, setAccForm] = useState<Partial<PropAccount>>({ firm: "", name: "", currency: "USD", phase: "evaluation", openedAt: new Date().toISOString().slice(0, 10) });
  const [entryForm, setEntryForm] = useState<Partial<PropEntry>>({ kind: "expense", currency: "USD", date: new Date().toISOString().slice(0, 10), amount: 0, category: "evaluation" });
  const [payoutForm, setPayoutForm] = useState<Partial<PayoutRequest>>({ currency: "USD", requestedAt: new Date().toISOString().slice(0, 10), requestedGross: 1000, traderShareBps: 9000, expectedFees: 0, status: "requested" });
  const [notice, setNotice] = useState<string | null>(null);

  const accs = demo ? demoAccounts() : accounts;
  const ents = demo ? demoEntries() : entries;

  useEffect(() => { if (!demo) storeSet(ACC_KEY, accounts); }, [accounts, demo]);
  useEffect(() => { if (!demo) storeSet(ENTRY_KEY, entries); }, [entries, demo]);
  useEffect(() => { if (!demo) storeSet(PAYOUT_KEY, payouts); }, [payouts, demo]);

  const firms = useMemo(() => ["All", ...Array.from(new Set(accs.map((a) => a.firm).filter(Boolean)))], [accs]);
  const fEnts = useMemo(() => ents.filter((e) => firmFilter === "All" || e.firm === firmFilter), [ents, firmFilter]);
  const fPayouts = useMemo(() => payouts.filter((p) => firmFilter === "All" || p.firm === firmFilter), [payouts, firmFilter]);
  const stats = useMemo(() => computePropStats(fEnts, fPayouts), [fEnts, fPayouts]);

  const monthly = useMemo(() => {
    const m = new Map<string, { spent: number; got: number }>();
    for (const e of fEnts) {
      if (e.void) continue;
      const k = e.date.slice(0, 7);
      const r = m.get(k) ?? { spent: 0, got: 0 };
      if (e.kind === "expense") r.spent += e.amount;
      if (e.kind === "receipt") r.got += e.amount;
      if (e.kind === "reversal") r.got -= e.amount;
      if (e.kind === "refund") r.got += e.amount;
      m.set(k, r);
    }
    return [...m.entries()].sort().slice(-12);
  }, [fEnts]);

  const addAccount = () => {
    if (!accForm.firm?.trim() || !accForm.name?.trim()) { setNotice("Firm + account name required."); return; }
    setAccounts((p) => [...p, { id: `pa-${Date.now()}`, firm: accForm.firm!.trim(), name: accForm.name!.trim(), currency: accForm.currency ?? "USD", phase: (accForm.phase as PropAccount["phase"]) ?? "evaluation", status: "active", openedAt: accForm.openedAt ?? new Date().toISOString().slice(0, 10), nominalSize: accForm.nominalSize, renewalDate: accForm.renewalDate, notes: accForm.notes, createdAt: Date.now() }]);
    setShowAcc(false); setAccForm({ firm: "", name: "", currency: "USD", phase: "evaluation", openedAt: new Date().toISOString().slice(0, 10) });
  };

  const addEntry = () => {
    const amt = Number(entryForm.amount) || 0;
    if (amt < 0 || (entryForm.kind === "expense" && amt === 0 && false)) { /* zero expense allowed */ }
    if (!entryForm.firm?.trim() && !entryForm.accountId) { setNotice("Pick an account or enter a firm for shared costs."); return; }
    const acc = accs.find((a) => a.id === entryForm.accountId);
    if (entryForm.kind === "refund" && !entryForm.expenseId) { setNotice("Refund needs the original expense ID."); return; }
    if (entryForm.kind === "refund") {
      const orig = ents.find((e) => e.id === entryForm.expenseId);
      if (!orig || orig.kind !== "expense") { setNotice("Original expense not found."); return; }
      const already = ents.filter((e) => e.kind === "refund" && e.expenseId === orig.id && !e.void).reduce((s, e) => s + e.amount, 0);
      if (already + amt > orig.amount + 1e-9) { setNotice(`Refund cap exceeded — $${(orig.amount - already).toFixed(2)} left on that expense.`); return; }
    }
    setEntries((p) => [...p, {
      id: `pe-${Date.now()}`, kind: (entryForm.kind as PropEntry["kind"]) ?? "expense",
      firm: acc?.firm ?? entryForm.firm!.trim(), accountId: entryForm.accountId,
      currency: acc?.currency ?? entryForm.currency ?? "USD", date: entryForm.date ?? new Date().toISOString().slice(0, 10),
      amount: amt, category: entryForm.category as ExpenseCategory, expenseId: entryForm.expenseId,
      reference: entryForm.reference, notes: entryForm.notes, createdAt: Date.now(),
    }]);
    setShowEntry(false);
  };

  const addPayout = () => {
    if (!payoutForm.accountId) { setNotice("Select a funded/live account."); return; }
    const acc = accs.find((a) => a.id === payoutForm.accountId);
    if (!acc || !["funded", "instant", "live"].includes(acc.phase)) { setNotice("Payouts need a funded, instant or live account."); return; }
    setPayouts((p) => [...p, {
      id: `po-${Date.now()}`, accountId: acc.id, firm: acc.firm, currency: acc.currency,
      requestedAt: payoutForm.requestedAt ?? new Date().toISOString().slice(0, 10),
      requestedGross: Number(payoutForm.requestedGross) || 0, traderShareBps: Number(payoutForm.traderShareBps) || 9000,
      expectedFees: Number(payoutForm.expectedFees) || 0, expectedAt: payoutForm.expectedAt,
      status: (payoutForm.status as PayoutRequest["status"]) ?? "requested", createdAt: Date.now(),
    }]);
    setShowPayout(false);
  };

  const exportCSV = () => {
    const rows = ["id,kind,firm,account_id,currency,date,amount,category,expense_id,reference,notes",
      ...fEnts.map((e) => [e.id, e.kind, e.firm, e.accountId ?? "", e.currency, e.date, e.amount, e.category ?? "", e.expenseId ?? "", e.reference ?? "", (e.notes ?? "").replace(/,/g, ";")].join(","))];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `nexora-prop-cash-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Prop Firms</h1>
          <p className="text-xs text-mut">Cash economics — spent, refunded, received. {demo ? "Demo preview (read-only, in-memory)." : "Separate from trade P&L."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={firmFilter} onChange={(e) => setFirmFilter(e.target.value)} className="rounded-xl border border-edge bg-panel px-2.5 py-2 text-xs text-ink">
            {firms.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <button onClick={() => setDemo((d) => !d)} className="rounded-xl border border-edge px-3 py-2 text-xs font-bold text-mut hover:text-brand">{demo ? "Exit demo" : "Load demo data"}</button>
          <button onClick={() => { const b = new Blob([propCashTemplate()], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "prop-cash-template.csv"; a.click(); }} className="flex items-center gap-1 rounded-xl border border-edge px-3 py-2 text-xs font-semibold text-mut hover:text-brand"><FileText size={12} /> Template</button>
          <button onClick={exportCSV} className="flex items-center gap-1 rounded-xl border border-edge px-3 py-2 text-xs font-semibold text-mut hover:text-brand"><Download size={12} /> Export</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Money spent", value: fmtMoney(stats.spent), tone: "text-loss", sub: `refunds ${fmtMoney(stats.refunds)} · net ${fmtMoney(stats.netSpend)}` },
          { label: "Payouts received", value: fmtMoney(stats.received), tone: "text-gain", sub: "actual receipts − reversals" },
          { label: "Net after costs", value: `${stats.netCash >= 0 ? "+" : ""}${fmtMoney(stats.netCash)}`, tone: stats.netCash >= 0 ? "text-gain" : "text-loss", sub: stats.cashRoi != null ? `cash ROI ${stats.cashRoi.toFixed(0)}%` : "ROI n/a (no net spend)" },
          { label: "Awaiting payout", value: fmtMoney(stats.awaiting), tone: "text-brand", sub: "open requests, not income yet" },
        ].map((m) => (
          <Card key={m.label} className="p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-mut">{m.label}</p>
            <p className={cn("mt-1 font-display text-base font-bold tnum", m.tone)}>{m.value}</p>
            <p className="mt-0.5 text-[11px] text-faint">{m.sub}</p>
          </Card>
        ))}
      </div>

      <div className="flex gap-1 rounded-xl bg-panel2 p-1">
        {(["overview", "accounts", "payouts", "ledger"] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={cn("flex-1 rounded-lg px-3 py-1.5 text-xs font-bold capitalize", view === v ? "bg-brand text-white" : "text-mut hover:text-ink")}>{v}</button>
        ))}
      </div>

      {notice && <div className="rounded-xl border border-warn/30 bg-warn-soft px-3 py-2 text-xs font-semibold text-ink">{notice}</div>}

      {view === "overview" && (
        <Card className="p-4">
          <CardHead title="Spending vs payouts" info="Monthly actuals — refunds count toward receipts month" icon={<TrendingUp size={14} />} />
          <div className="mt-3 space-y-2">
            {monthly.map(([m, r]) => {
              const max = Math.max(r.spent, r.got, 1);
              return (
                <div key={m} className="grid grid-cols-[52px_1fr_1fr] items-center gap-2 text-xs">
                  <span className="font-bold text-mut">{m.slice(2)}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-panel2"><div className="h-full rounded-full bg-loss" style={{ width: `${(r.spent / max) * 100}%` }} /></div>
                  <div className="h-2 overflow-hidden rounded-full bg-panel2"><div className="h-full rounded-full bg-gain" style={{ width: `${(r.got / max) * 100}%` }} /></div>
                </div>
              );
            })}
            {!monthly.length && <p className="py-6 text-center text-xs text-mut">No cash movements yet — add an expense or load demo data.</p>}
          </div>
          <p className="mt-3 text-[11px] text-faint">Cash ROI = net cash / net spend × 100 — return on fees, never on nominal funded size. Currencies stay separate; no FX invented.</p>
        </Card>
      )}

      {view === "accounts" && (
        <Card className="p-4">
          <CardHead title={`Accounts · ${accs.length}`} info="Evaluation → funded lifecycle; resets are new linked records" icon={<Building2 size={14} />} right={<button onClick={() => setShowAcc(!showAcc)} disabled={demo} className="flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-40"><Plus size={12} /> Track account</button>} />
          <div className="mt-3 space-y-2">
            {accs.filter((a) => firmFilter === "All" || a.firm === firmFilter).map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-edge bg-panel2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{a.firm} · {a.name}</p>
                  <p className="text-[11px] text-mut">{a.phase} · {a.status} · {a.currency}{a.nominalSize ? ` · $${a.nominalSize.toLocaleString()} nominal` : ""} · opened {a.openedAt}{a.renewalDate ? ` · renews ${a.renewalDate}` : ""}</p>
                </div>
                {!demo && <button onClick={() => setAccounts((p) => p.filter((x) => x.id !== a.id))} className="rounded-lg p-1.5 text-faint hover:text-loss"><Trash2 size={13} /></button>}
              </div>
            ))}
            {!accs.length && <p className="py-6 text-center text-xs text-mut">No prop accounts yet.</p>}
          </div>
          {showAcc && (
            <div className="mt-3 grid gap-2 rounded-xl border border-edge bg-panel p-3 sm:grid-cols-2">
              <input value={accForm.firm ?? ""} onChange={(e) => setAccForm((f) => ({ ...f, firm: e.target.value }))} placeholder="Firm (e.g. FundedNext)" className="rounded-lg border border-edge bg-panel2 px-3 py-2 text-xs text-ink" />
              <input value={accForm.name ?? ""} onChange={(e) => setAccForm((f) => ({ ...f, name: e.target.value }))} placeholder="Account / attempt name" className="rounded-lg border border-edge bg-panel2 px-3 py-2 text-xs text-ink" />
              <select value={accForm.phase} onChange={(e) => setAccForm((f) => ({ ...f, phase: e.target.value as PropAccount["phase"] }))} className="rounded-lg border border-edge bg-panel2 px-3 py-2 text-xs text-ink">
                {(["evaluation", "verification", "funded", "instant", "live"] as const).map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <input value={accForm.openedAt ?? ""} type="date" onChange={(e) => setAccForm((f) => ({ ...f, openedAt: e.target.value }))} className="rounded-lg border border-edge bg-panel2 px-3 py-2 text-xs text-ink" />
              <button onClick={addAccount} className="rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white sm:col-span-2">Save account</button>
            </div>
          )}
        </Card>
      )}

      {view === "payouts" && (
        <Card className="p-4">
          <CardHead title={`Payouts · ${fPayouts.length}`} info="Requests ≠ receipts — cash counts on settlement date" icon={<Wallet size={14} />} right={<button onClick={() => setShowPayout(!showPayout)} disabled={demo} className="flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-40"><Plus size={12} /> Track payout</button>} />
          <div className="mt-3 space-y-2">
            {fPayouts.map((p) => (
              <div key={p.id} className="rounded-xl border border-edge bg-panel2 p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-ink">{p.firm} · {fmtMoney(p.requestedGross)} requested {p.requestedAt}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", p.status === "completed" ? "bg-gain-soft text-gain" : p.status === "rejected" || p.status === "cancelled" ? "bg-loss-soft text-loss" : "bg-brand-soft text-brand")}>{p.status}</span>
                </div>
                <p className="mt-1 text-mut">Expected net {fmtMoney(expectedNet(p))} (share {(p.traderShareBps / 100).toFixed(0)}% − {fmtMoney(p.expectedFees)} fees){p.expectedAt ? ` · expected ${p.expectedAt}` : ""}</p>
                {!demo && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(["approved", "completed", "rejected", "cancelled"] as const).map((s) => (
                      <button key={s} onClick={() => setPayouts((prev) => prev.map((x) => x.id === p.id ? { ...x, status: s } : x))} className="rounded-lg border border-edge px-2 py-1 text-[11px] font-semibold text-mut hover:text-ink">{s}</button>
                    ))}
                    <button onClick={() => setEntries((prev) => [...prev, { id: `pe-${Date.now()}`, kind: "receipt", firm: p.firm, accountId: p.accountId, currency: p.currency, date: new Date().toISOString().slice(0, 10), amount: expectedNet(p), reference: p.id, notes: "Recorded from payout", createdAt: Date.now() }])} className="rounded-lg bg-brand px-2 py-1 text-[11px] font-bold text-white">+ Record receipt</button>
                  </div>
                )}
              </div>
            ))}
            {!fPayouts.length && <p className="py-6 text-center text-xs text-mut">No payouts yet.</p>}
          </div>
          {showPayout && (
            <div className="mt-3 grid gap-2 rounded-xl border border-edge bg-panel p-3 sm:grid-cols-2">
              <select value={payoutForm.accountId ?? ""} onChange={(e) => setPayoutForm((f) => ({ ...f, accountId: e.target.value }))} className="rounded-lg border border-edge bg-panel2 px-3 py-2 text-xs text-ink sm:col-span-2">
                <option value="">Select funded/live account…</option>
                {accs.filter((a) => ["funded", "instant", "live"].includes(a.phase)).map((a) => <option key={a.id} value={a.id}>{a.firm} · {a.name}</option>)}
              </select>
              <input type="number" value={payoutForm.requestedGross ?? 0} onChange={(e) => setPayoutForm((f) => ({ ...f, requestedGross: Number(e.target.value) }))} placeholder="Requested gross" className="rounded-lg border border-edge bg-panel2 px-3 py-2 text-xs text-ink" />
              <input type="number" value={payoutForm.traderShareBps ?? 9000} onChange={(e) => setPayoutForm((f) => ({ ...f, traderShareBps: Number(e.target.value) }))} placeholder="Trader share bps (9000=90%)" className="rounded-lg border border-edge bg-panel2 px-3 py-2 text-xs text-ink" />
              <button onClick={addPayout} className="rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white sm:col-span-2">Save payout request</button>
            </div>
          )}
        </Card>
      )}

      {view === "ledger" && (
        <Card className="p-4">
          <CardHead title={`Transactions · ${fEnts.length}`} info="Expenses, refunds, receipts, reversals — void, never delete" icon={<Clock size={14} />} right={<button onClick={() => setShowEntry(!showEntry)} disabled={demo} className="flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-40"><Plus size={12} /><Upload size={12} /> Add entry</button>} />
          <div className="mt-3 space-y-1.5">
            {[...fEnts].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60).map((e) => (
              <div key={e.id} className={cn("flex items-center gap-2 rounded-xl border border-edge bg-panel2 px-3 py-2 text-xs", e.void && "opacity-50 line-through")}>
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", e.kind === "expense" ? "bg-loss-soft text-loss" : e.kind === "refund" ? "bg-brand-soft text-brand" : e.kind === "reversal" ? "bg-warn-soft text-warn" : "bg-gain-soft text-gain")}>{e.kind}</span>
                <span className="min-w-0 flex-1 truncate text-mut">{e.date} · {e.firm}{e.category ? ` · ${e.category}` : ""}{e.reference ? ` · ${e.reference}` : ""}</span>
                <span className="font-bold tnum text-ink">{e.kind === "expense" ? "−" : "+"}{fmtMoney(e.amount)}</span>
                {!demo && !e.void && <button onClick={() => setEntries((p) => p.map((x) => x.id === e.id ? { ...x, void: true } : x))} className="text-faint hover:text-loss">Void</button>}
              </div>
            ))}
            {!fEnts.length && <p className="py-6 text-center text-xs text-mut">Empty ledger.</p>}
          </div>
          {showEntry && (
            <div className="mt-3 grid gap-2 rounded-xl border border-edge bg-panel p-3 sm:grid-cols-2">
              <select value={entryForm.kind} onChange={(e) => setEntryForm((f) => ({ ...f, kind: e.target.value as PropEntry["kind"] }))} className="rounded-lg border border-edge bg-panel2 px-3 py-2 text-xs text-ink">
                {(["expense", "refund", "receipt", "reversal"] as const).map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
              <select value={entryForm.accountId ?? ""} onChange={(e) => setEntryForm((f) => ({ ...f, accountId: e.target.value || undefined }))} className="rounded-lg border border-edge bg-panel2 px-3 py-2 text-xs text-ink">
                <option value="">Shared firm cost / pick account…</option>
                {accs.map((a) => <option key={a.id} value={a.id}>{a.firm} · {a.name}</option>)}
              </select>
              <input type="number" step="0.01" value={entryForm.amount ?? 0} onChange={(e) => setEntryForm((f) => ({ ...f, amount: Number(e.target.value) }))} placeholder="Amount" className="rounded-lg border border-edge bg-panel2 px-3 py-2 text-xs text-ink" />
              <input type="date" value={entryForm.date ?? ""} onChange={(e) => setEntryForm((f) => ({ ...f, date: e.target.value }))} className="rounded-lg border border-edge bg-panel2 px-3 py-2 text-xs text-ink" />
              {entryForm.kind === "expense" && (
                <select value={entryForm.category} onChange={(e) => setEntryForm((f) => ({ ...f, category: e.target.value as ExpenseCategory }))} className="rounded-lg border border-edge bg-panel2 px-3 py-2 text-xs text-ink">
                  {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              )}
              {entryForm.kind === "refund" && (
                <input value={entryForm.expenseId ?? ""} onChange={(e) => setEntryForm((f) => ({ ...f, expenseId: e.target.value }))} placeholder="Original expense ID" className="rounded-lg border border-edge bg-panel2 px-3 py-2 text-xs text-ink" />
              )}
              <button onClick={addEntry} className="rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white sm:col-span-2">Save entry</button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
