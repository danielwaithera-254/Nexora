import { useState, useEffect } from "react";
import { Upload, Download, Trash2, FileText, Plus, BarChart3, Link2, Unlink2, Save, X, Edit2, Trash, RotateCcw, ExternalLink, Settings, Wifi, WifiOff, Eye, EyeOff } from "lucide-react";
import { Card, CardHead } from "./ui";
import { parseTradesCSV, sampleCSV, tradesToCSV, type Trade } from "../data/trades";
import { computeKpis, balanceSeries, dailyMap, type Kpis } from "../lib/metrics";
import { fmtMoney, fmtPct, fmtNum } from "../lib/format";
import { Card as CardComp } from "./ui";
import { cn } from "../utils/cn";
import { vaultGet, vaultSet } from "../lib/vault";

interface AccountConfig {
  id: string;
  name: string;
  broker: string;
  accountNumber: string;
  type: "Funded" | "Personal" | "Prop" | "Demo";
  size: number;
  balance: number;
  equity: number;
  pnl: number;
  drawdown: number;
  maxDrawdown: number;
  status: "Connected" | "Disconnected" | "Error";
  platform: string;
  trades: Trade[];
  createdAt: number;
  updatedAt: number;
}

interface AccountSummary {
  name: string;
  trades: number;
  netPnl: number;
  winRate: number;
  profitFactor: number;
  avgR: number;
}

function parseFile(file: File): Promise<Trade[]> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseTradesCSV(String(reader.result ?? ""));
      resolve(parsed);
    };
    reader.readAsText(file);
  });
}

function computeAccountMetrics(trades: Trade[]): { kpis: Kpis; accounts: AccountSummary[] } {
  const kpis = computeKpis(trades);
  
  const accountMap = new Map<string, Trade[]>();
  for (const t of trades) {
    const arr = accountMap.get(t.account) || [];
    arr.push(t);
    accountMap.set(t.account, arr);
  }

  const accounts: AccountSummary[] = [];
  for (const [name, trades] of accountMap) {
    const k = computeKpis(trades);
    accounts.push({
      name,
      trades: trades.length,
      netPnl: k.net,
      winRate: k.winRate,
      profitFactor: k.pf,
      avgR: k.wlRatio,
    });
  }
  accounts.sort((a, b) => b.netPnl - a.netPnl);
  
  return { kpis: computeKpis(trades), accounts };
}

const VAULT_KEY = "nexora-accounts";

function loadAccounts(): AccountConfig[] {
  try {
    const stored = vaultGet<AccountConfig[]>(VAULT_KEY, []);
    return stored.filter(a => a.trades && a.trades.length > 0);
  } catch {
    return [];
  }
}

function saveAccounts(accounts: AccountConfig[]) {
  vaultSet(VAULT_KEY, accounts);
}

function getDefaultAccounts(): AccountConfig[] {
  return [
    {
      id: "acc-1",
      name: "FundedNext 5K",
      broker: "FundedNext",
      accountNumber: "FN-847291",
      type: "Prop",
      size: 5000,
      balance: 5284.30,
      equity: 5271.80,
      pnl: 284.30,
      drawdown: 2.4,
      maxDrawdown: 5,
      status: "Connected",
      platform: "FundedNext CFD",
      trades: [],
      createdAt: Date.now() - 86400000 * 30,
      updatedAt: Date.now(),
    },
    {
      id: "acc-2",
      name: "Hola Prime 2K",
      broker: "Hola Prime",
      accountNumber: "HP-339102",
      type: "Prop",
      size: 2000,
      balance: 2146.80,
      equity: 2139.40,
      pnl: 146.80,
      drawdown: 3.1,
      maxDrawdown: 5,
      status: "Connected",
      platform: "Hola Prime DX",
      trades: [],
      createdAt: Date.now() - 86400000 * 15,
      updatedAt: Date.now(),
    },
    {
      id: "acc-3",
      name: "Personal Swing",
      broker: "Interactive Brokers",
      accountNumber: "IB-U982341",
      type: "Personal",
      size: 25000,
      balance: 26340.50,
      equity: 26410.20,
      pnl: 1340.50,
      drawdown: 1.2,
      maxDrawdown: 10,
      status: "Connected",
      platform: "IBKR TWS",
      trades: [],
      createdAt: Date.now() - 86400000 * 90,
      updatedAt: Date.now(),
    },
  ];
}

export default function Accounts() {
  const [accounts, setAccounts] = useState<AccountConfig[]>(() => {
    const loaded = loadAccounts();
    return loaded.length > 0 ? loaded : getDefaultAccounts();
  });
  const [filter, setFilter] = useState<"all" | "connected" | "disconnected">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AccountConfig>>({});

  useEffect(() => {
    saveAccounts(accounts);
  }, [accounts]);

  const filteredAccounts = accounts.filter(acc => {
    if (filter === "connected") return acc.status === "Connected";
    if (filter === "disconnected") return acc.status !== "Connected";
    return true;
  });

  const allTrades = accounts.flatMap(a => a.trades.map(t => ({ ...t, account: a.name })));
  const { kpis } = computeAccountMetrics(allTrades);

  const addAccount = () => {
    const newAccount: AccountConfig = {
      id: `acc-${Date.now()}`,
      name: `New Account ${accounts.length + 1}`,
      broker: "",
      accountNumber: "",
      type: "Personal",
      size: 10000,
      balance: 0,
      equity: 0,
      pnl: 0,
      drawdown: 0,
      maxDrawdown: 10,
      status: "Disconnected",
      platform: "",
      trades: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setAccounts(prev => [...prev, newAccount]);
  };

  const startEdit = (acc: AccountConfig) => {
    setEditingId(acc.id);
    setEditForm({ ...acc });
  };

  const saveEdit = (id: string) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...editForm, updatedAt: Date.now() } : a));
    setEditingId(null);
    setEditForm({});
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const deleteAccount = (id: string) => {
    if (confirm("Delete this account and all its trade data? This cannot be undone.")) {
      setAccounts(prev => prev.filter(a => a.id !== id));
    }
  };

  const toggleStatus = (id: string) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: a.status === "Connected" ? "Disconnected" : "Connected", updatedAt: Date.now() } : a));
  };

  const pnlColor = (pnl: number) => pnl >= 0 ? "var(--gain)" : "var(--loss)";
  const drawdownColor = (dd: number) => dd > 5 ? "var(--loss)" : dd > 2 ? "var(--warn)" : "var(--gain)";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Accounts</h1>
          <p className="text-mut mt-0.5">Manage and monitor your connected trading accounts</p>
        </div>
        <button onClick={addAccount} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand text-white font-semibold hover:bg-brand-deep transition-colors">
          <Plus size={16} />
          <span>Add Account</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-panel2 rounded-xl p-1">
          {["all", "connected", "disconnected"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors",
                filter === f ? "bg-brand text-white" : "text-mut hover:text-ink"
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-sm text-mut ml-auto">
          {filteredAccounts.length} of {accounts.length} accounts
        </span>
      </div>

      {/* Account Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAccounts.map((acc) => (
          <Card key={acc.id} elevated className="p-5">
            {/* Header Row */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", acc.status === "Connected" ? "bg-gain" : "var(--loss)")} />
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-bold text-ink truncate pr-4">{acc.name}</h3>
                  <p className="text-xs text-mut truncate">{acc.broker}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  acc.status === "Connected" ? "bg-gain/15 text-gain" : "bg-loss/15 text-loss"
                )}>
                  {acc.status === "Connected" ? <Wifi size={10} className="inline mr-0.5" /> : <WifiOff size={10} className="inline mr-0.5" />}
                  {acc.status}
                </span>
              </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-panel2 border border-edge">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mut">Balance</p>
                <p className="font-display text-xl font-bold text-ink tnum mt-0.5">{fmtMoney(acc.balance)}</p>
              </div>
              <div className="p-3 rounded-lg bg-panel2 border border-edge">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mut">Equity</p>
                <p className="font-display text-xl font-bold text-ink tnum mt-0.5">{fmtMoney(acc.equity)}</p>
              </div>
              <div className="p-3 rounded-lg bg-panel2 border border-edge">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mut">P&L</p>
                <p className="font-display text-xl font-bold tnum mt-0.5" style={{ color: pnlColor(acc.pnl) }}>
                  {acc.pnl >= 0 ? "+" : ""}{fmtMoney(acc.pnl)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-panel2 border border-edge">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mut">Drawdown</p>
                <p className="font-display text-xl font-bold tnum mt-0.5" style={{ color: drawdownColor(acc.drawdown) }}>
                  {acc.drawdown.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-panel2 border border-edge">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mut">Account Size</p>
                <p className="font-display text-xl font-bold text-ink tnum mt-0.5">{fmtMoney(acc.size)}</p>
              </div>
              <div className="p-3 rounded-lg bg-panel2 border border-edge">
                <p className="text-[10px] font-bold uppercase tracking-wider text-mut">Max DD</p>
                <p className="font-display text-xl font-bold text-mut tnum mt-0.5">{acc.maxDrawdown}%</p>
              </div>
            </div>

            {/* Info Row */}
            <div className="mb-4 p-3 rounded-lg bg-panel2 border border-edge space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-mut">Broker</span>
                <span className="text-ink font-medium">{acc.broker || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mut">Account #</span>
                <span className="text-ink font-mono tnum">{acc.accountNumber || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mut">Type</span>
                <span className="text-ink font-medium capitalize">{acc.type.toLowerCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mut">Platform</span>
                <span className="text-ink font-medium">{acc.platform || "—"}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-edge">
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-edge bg-panel text-sm font-medium text-mut hover:bg-brand-soft hover:text-brand hover:border-brand transition-colors">
                <Eye size={14} />
                <span>View Details</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-brand text-white font-semibold hover:bg-brand-deep transition-colors">
                <Settings size={14} />
                <span>Manage</span>
              </button>
            </div>
          </Card>
        ))}

        {/* Add New Account Card */}
        <Card elevated className="p-5 border-2 border-dashed border-edge2 flex flex-col items-center justify-center min-h-[320px]">
          <button onClick={addAccount} className="w-full flex flex-col items-center justify-center gap-3 py-8 px-4 text-center cursor-pointer">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-brand flex items-center justify-center">
              <Plus className="w-8 h-8 text-brand" />
            </div>
            <span className="text-lg font-semibold text-ink">Add Trading Account</span>
            <span className="text-sm text-mut">Configure broker, account size, and upload trade history</span>
            <div className="mt-2 px-4 py-2 rounded-lg bg-brand-soft text-brand text-xs font-medium border border-brand/30">
              Supports: FundedNext, Hola Prime, FTMO, IBKR, Topstep, etc.
            </div>
          </button>
        </Card>
      </div>

      {filteredAccounts.length === 0 && accounts.length > 0 && (
        <div className="text-center py-12 text-mut">
          <p>No accounts match the current filter.</p>
        </div>
      )}
    </div>
  );
}