import { useMemo, useState } from "react";
import { Wallet, Plus, Pencil, X, TrendingUp, ShieldAlert, Target, CalendarDays } from "lucide-react";
import { Card, CardHead } from "./ui";
import type { Trade } from "../data/trades";
import { accountStats, SEED_ACCOUNTS, type AccountDef } from "../lib/risk";
import { vaultGet, vaultSet } from "../lib/vault";
import { fmtMoney } from "../lib/format";
import { cn } from "../utils/cn";

let uid = 0;
const newId = () => `acc-${Date.now().toString(36)}-${uid++}`;

const num = (v: string) => {
  const n = parseFloat(v.replace(/[^\d.-]/g, ""));
  return isFinite(n) ? n : 0;
};

export default function Accounts({ trades }: { trades: Trade[] }) {
  const [accounts, setAccounts] = useState<AccountDef[]>(() => vaultGet("accounts", SEED_ACCOUNTS));
  const [editing, setEditing] = useState<AccountDef | null>(null);

  const persist = (next: AccountDef[]) => {
    setAccounts(next);
    vaultSet("accounts", next);
  };

  const stats = useMemo(
    () => accounts.map((a) => ({ acc: a, s: accountStats(a, trades) })),
    [accounts, trades]
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHead
          title="Accounts"
          info="Prop-firm and personal accounts. Equity, drawdown and payout progress are derived live from the trades booked to each account."
          icon={<Wallet size={14} />}
          right={
            <button
              onClick={() => setEditing({ id: newId(), name: "New Account", size: 100_000, balance: 100_000, dailyLossLimit: 5_000, maxDrawdown: 10_000, profitTarget: 10_000, tradeAccount: undefined })}
              className="brand-gradient flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-bold text-white shadow-sm transition-all hover:shadow-[var(--shadow)] active:scale-95"
            >
              <Plus size={13} strokeWidth={2.5} /> Add account
            </button>
          }
        />

        <div className="grid grid-cols-1 gap-4 px-4 pb-5 sm:px-5 lg:grid-cols-3">
          {stats.map(({ acc, s }) => {
            const dayPct = acc.dailyLossLimit ? Math.min(1, Math.max(0, -s.todayPnl / acc.dailyLossLimit)) : 0;
            const ddPct = acc.maxDrawdown ? Math.min(1, s.drawdown / acc.maxDrawdown) : 0;
            return (
              <div key={acc.id} className="sheen flex flex-col rounded-2xl border border-edge bg-panel2 p-4">
                <div className="flex items-center gap-2">
                  <span className="brand-gradient grid h-9 w-9 place-items-center rounded-xl text-white shadow-[0_6px_16px_-6px_var(--brand-ring)]">
                    <Wallet size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-display text-[13px] font-bold text-ink">{acc.name}</p>
                    <p className="tnum text-[10px] font-semibold text-faint">
                      {fmtMoney(acc.size)} · {s.tradingDays} trading days
                    </p>
                  </div>
                  <button
                    onClick={() => setEditing({ ...acc })}
                    className="ml-auto rounded-lg border border-edge bg-panel p-1.5 text-faint transition-colors hover:border-brand/40 hover:text-brand"
                    aria-label="Edit account"
                  >
                    <Pencil size={12} />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <MiniStat label="Balance" value={fmtMoney(acc.balance)} />
                  <MiniStat
                    label="Equity"
                    value={fmtMoney(s.equity, { sign: true })}
                    tone={s.equity >= acc.balance ? "gain" : "loss"}
                  />
                  <MiniStat label="Today" value={fmtMoney(s.todayPnl, { sign: true })} tone={s.todayPnl >= 0 ? "gain" : "loss"} />
                  <MiniStat label="Net P&L" value={fmtMoney(s.totalPnl, { sign: true })} tone={s.totalPnl >= 0 ? "gain" : "loss"} />
                </div>

                <div className="mt-4 space-y-3">
                  <Meter
                    icon={<ShieldAlert size={11} />}
                    label="Daily loss"
                    value={`${fmtMoney(Math.min(0, s.todayPnl))} / ${fmtMoney(acc.dailyLossLimit)}`}
                    pct={dayPct}
                    danger
                    sub={`${fmtMoney(s.dailyLossRemaining)} remaining`}
                  />
                  <Meter
                    icon={<TrendingUp size={11} />}
                    label="Drawdown used"
                    value={`${fmtMoney(s.drawdown)} / ${fmtMoney(acc.maxDrawdown)}`}
                    pct={ddPct}
                    danger
                    sub={`${fmtMoney(s.drawdownRemaining)} remaining`}
                  />
                  <Meter
                    icon={<Target size={11} />}
                    label="Profit target"
                    value={`${Math.round(s.payout * 100)}% of ${fmtMoney(acc.profitTarget)}`}
                    pct={s.payout}
                    sub={s.payout >= 1 ? "Target reached — time to request a payout" : `${fmtMoney(acc.profitTarget * (1 - s.payout))} to go`}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between rounded-lg bg-panel px-2.5 py-1.5 text-[9.5px] font-semibold text-faint">
                  <span>{s.wins}W · {s.losses}L</span>
                  <span className="flex items-center gap-1">
                    <CalendarDays size={10} /> {s.tradingDays} days
                  </span>
                  {acc.tradeAccount ? <span>→ {acc.tradeAccount}</span> : <span>no trade link</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {editing && (
        <AccountEditor
          acc={editing}
          onSave={(next) => {
            const exists = accounts.some((a) => a.id === next.id);
            persist(exists ? accounts.map((a) => (a.id === next.id ? next : a)) : [...accounts, next]);
            setEditing(null);
          }}
          onDelete={(id) => {
            if (window.confirm("Delete this account?")) persist(accounts.filter((a) => a.id !== id));
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "gain" | "loss" }) {
  return (
    <div className="rounded-lg bg-panel px-2.5 py-2">
      <p className="text-[8.5px] font-extrabold uppercase tracking-wider text-faint">{label}</p>
      <p className={cn("tnum mt-0.5 truncate font-display text-[12.5px] font-bold", tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : "text-ink")}>
        {value}
      </p>
    </div>
  );
}

function Meter({
  icon,
  label,
  value,
  pct,
  danger,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  pct: number;
  danger?: boolean;
  sub?: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[9.5px] font-extrabold uppercase tracking-wider text-mut">
        {icon} {label}
        <span className="tnum ml-auto normal-case tracking-normal text-faint">{value}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-edge">
        <div
          className={cn("h-full rounded-full transition-all", pct >= 0.85 && danger ? "bg-loss" : pct >= 0.6 && danger ? "bg-warn" : pct >= 1 ? "bg-brand" : "bg-gain")}
          style={{ width: `${Math.min(100, pct * 100)}%` }}
        />
      </div>
      {sub && <p className="mt-0.5 text-[9px] font-semibold text-faint">{sub}</p>}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-mut">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="tnum mt-1 w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-[11.5px] font-bold text-ink outline-none transition-colors placeholder:text-faint focus:border-brand"
      />
    </div>
  );
}

function AccountEditor({
  acc,
  onSave,
  onDelete,
  onCancel,
}: {
  acc: AccountDef;
  onSave: (a: AccountDef) => void;
  onDelete: (id: string) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    name: acc.name,
    size: String(acc.size),
    balance: String(acc.balance),
    dailyLossLimit: String(acc.dailyLossLimit),
    maxDrawdown: String(acc.maxDrawdown),
    profitTarget: String(acc.profitTarget),
    tradeAccount: acc.tradeAccount ?? "",
  });
  const patch = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-edge bg-panel shadow-2xl">
        <div className="flex items-center gap-2 border-b border-edge px-5 py-3.5">
          <span className="grid h-6 w-6 place-items-center rounded-lg bg-brand-soft text-brand">
            <Wallet size={12} />
          </span>
          <h3 className="font-display text-[13px] font-bold text-ink">Account</h3>
          <button onClick={onCancel} className="ml-auto rounded-md p-1.5 text-faint hover:bg-panel2 hover:text-ink" aria-label="Close">
            <X size={14} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 px-5 py-4">
          <div className="col-span-2">
            <Field label="Name" value={f.name} onChange={patch("name")} />
          </div>
          <Field label="Account size" value={f.size} onChange={patch("size")} />
          <Field label="Starting balance" value={f.balance} onChange={patch("balance")} />
          <Field label="Daily loss limit" value={f.dailyLossLimit} onChange={patch("dailyLossLimit")} />
          <Field label="Max drawdown" value={f.maxDrawdown} onChange={patch("maxDrawdown")} />
          <Field label="Profit target" value={f.profitTarget} onChange={patch("profitTarget")} />
          <div>
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-mut">Trade account link</span>
            <input
              value={f.tradeAccount}
              onChange={(e) => patch("tradeAccount")(e.target.value)}
              placeholder="e.g. Prop Firm"
              className="mt-1 w-full rounded-xl border border-edge bg-panel2 px-3 py-2 text-[11.5px] font-bold text-ink outline-none transition-colors placeholder:text-faint focus:border-brand"
            />
            <p className="mt-1 text-[9px] text-faint">Booked P&L from trades with this account name.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-edge px-5 py-3.5">
          <button
            onClick={() => onDelete(acc.id)}
            className="rounded-xl border border-loss/30 bg-loss-soft px-3.5 py-2 text-[11px] font-bold text-loss transition-all hover:bg-loss hover:text-white"
          >
            Delete
          </button>
          <button onClick={onCancel} className="rounded-xl border border-edge bg-panel2 px-3.5 py-2 text-[11px] font-bold text-mut transition-all hover:text-ink">
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                ...acc,
                name: f.name.trim() || acc.name,
                size: num(f.size) || 1,
                balance: num(f.balance) || 1,
                dailyLossLimit: num(f.dailyLossLimit) || 1,
                maxDrawdown: num(f.maxDrawdown) || 1,
                profitTarget: num(f.profitTarget) || 1,
                tradeAccount: f.tradeAccount.trim() || undefined,
              })
            }
            className="brand-gradient ml-auto rounded-xl px-4 py-2 text-[11px] font-bold text-white shadow-sm transition-all hover:shadow-[var(--shadow)] active:scale-95"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
