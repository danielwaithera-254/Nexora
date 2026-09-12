import { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  Download,
  FileText,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  Settings,
  Eye,
  X,
  Search,
  Link2,
  Unlink2,
} from "lucide-react";
import { Card, CardHead } from "./ui";
import { parseTradesCSV, sampleCSV, tradesToCSV, type Trade } from "../data/trades";
import { computeKpis, balanceSeries } from "../lib/metrics";
import { fmtMoney } from "../lib/format";
import { cn } from "../utils/cn";
import { vaultGet, vaultSet } from "../lib/vault";

export interface AccountConfig {
  id: string;
  name: string;
  broker: string;
  accountNumber: string;
  type: "Funded" | "Personal" | "Prop" | "Demo";
  size: number;
  maxDrawdown: number;
  platform: string;
  trades: Trade[];
  createdAt: number;
  updatedAt: number;
}

export const VAULT_KEY = "nexora-accounts";
export const SYNCED_KEY = "nexora-synced-accounts";

export function loadAccounts(): AccountConfig[] | null {
  try {
    const stored = vaultGet<AccountConfig[]>(VAULT_KEY, []);
    return stored.length ? stored : null;
  } catch {
    return null;
  }
}

export function getDefaultAccounts(): AccountConfig[] {
  const now = Date.now();
  return [
    { id: "acc-fundednext-5k", name: "FundedNext 5K", broker: "FundedNext", accountNumber: "FN-847291", type: "Prop", size: 5000, maxDrawdown: 5, platform: "FundedNext CFD", trades: [], createdAt: now - 86400000 * 30, updatedAt: now },
    { id: "acc-hola-2k", name: "Hola Prime 2K", broker: "Hola Prime", accountNumber: "HP-339102", type: "Prop", size: 2000, maxDrawdown: 5, platform: "Hola Prime DX", trades: [], createdAt: now - 86400000 * 15, updatedAt: now },
    { id: "acc-personal-swing", name: "Personal Swing", broker: "Interactive Brokers", accountNumber: "IB-U982341", type: "Personal", size: 25000, maxDrawdown: 10, platform: "IBKR TWS", trades: [], createdAt: now - 86400000 * 90, updatedAt: now },
  ];
}

function parseFile(file: File): Promise<Trade[]> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(parseTradesCSV(String(reader.result ?? "")));
    reader.readAsText(file);
  });
}

function maxDrawdownPct(trades: Trade[], size: number): number {
  if (!trades.length || size <= 0) return 0;
  let bal = size, peak = size, maxDd = 0;
  const sorted = [...trades].sort((a, b) => a.ts - b.ts);
  for (const t of sorted) { bal += t.pnl; peak = Math.max(peak, bal); if (peak > 0) maxDd = Math.max(maxDd, ((peak - bal) / peak) * 100); }
  return Math.round(maxDd * 10) / 10;
}

function derived(acc: AccountConfig) {
  const k = computeKpis(acc.trades);
  const pnl = k.net;
  const balance = acc.size + pnl;
  const equity = acc.size + pnl;
  const dd = maxDrawdownPct(acc.trades, acc.size);
  return { k, pnl, balance, equity, dd };
}

const initials = (n: string) => n.split(/\s+/).map(p=>p[0]).slice(0,2).join("").toUpperCase();

export default function Accounts({ externalAccounts, onAccountsChange }: { externalAccounts?: AccountConfig[]; onAccountsChange?: (a: AccountConfig[]) => void } = {}) {
  const [internalAccounts, setInternalAccounts] = useState<AccountConfig[]>(() => loadAccounts() ?? getDefaultAccounts());
  const accounts = externalAccounts ?? internalAccounts;
  const setAccounts: React.Dispatch<React.SetStateAction<AccountConfig[]>> = (onAccountsChange as any) ?? setInternalAccounts;

  const [query, setQuery] = useState("");
  const [synced, setSynced] = useState<string[]>(() => { try { return vaultGet<string[]>(SYNCED_KEY, []);} catch { return []; }});
  const [detailId, setDetailId] = useState<string | null>(null);
  const [manageId, setManageId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<AccountConfig>>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { try { vaultSet(VAULT_KEY, accounts); } catch {} }, [accounts]);
  useEffect(() => { try { vaultSet(SYNCED_KEY, synced); } catch {} }, [synced]);
  useEffect(() => { if (!notice) return; const t = setTimeout(()=>setNotice(null), 3200); return ()=>clearTimeout(t); }, [notice]);

  const filteredAccounts = useMemo(()=> accounts.filter(acc=>{
    if (query.trim()) { const q=query.toLowerCase(); return [acc.name, acc.broker, acc.accountNumber, acc.platform, acc.type].join(" ").toLowerCase().includes(q); }
    return true;
  }), [accounts, query]);

  const detailAcc = detailId ? accounts.find(a=>a.id===detailId) ?? null : null;
  const manageAcc = manageId ? accounts.find(a=>a.id===manageId) ?? null : null;

  const syncedAccounts = useMemo(()=> accounts.filter(a=>synced.includes(a.id)), [accounts, synced]);

  const addAccount = () => {
    const acc: AccountConfig = { id:`acc-${Date.now()}`, name:`New Account ${accounts.length+1}`, broker:"", accountNumber:"", type:"Personal", size:10000, maxDrawdown:10, platform:"", trades:[], createdAt:Date.now(), updatedAt:Date.now() };
    setAccounts(prev=>[...prev, acc]); setManageId(acc.id); setEditForm({...acc});
  };
  const saveManage = () => {
    if (!manageId) return;
    const name=(editForm.name??"").trim()||"Untitled Account";
    const size=Math.max(0, Number(editForm.size)||0);
    const maxDd=Math.min(100, Math.max(0, Number(editForm.maxDrawdown)||0));
    setAccounts(prev=>prev.map(a=>a.id===manageId?{...a, ...editForm, name, size, maxDrawdown:maxDd, updatedAt:Date.now()}:a));
    setManageId(null); setEditForm({}); setNotice({ok:true, text:"Account saved."});
  };
  const deleteAccount = (id:string) => {
    const acc=accounts.find(a=>a.id===id); if(!acc) return;
    if(!confirm(`Delete "${acc.name}" and its ${acc.trades.length} trades?`)) return;
    setAccounts(prev=>prev.filter(a=>a.id!==id)); setSynced(s=>s.filter(x=>x!==id));
    if(detailId===id) setDetailId(null); if(manageId===id){setManageId(null);setEditForm({});}
    setNotice({ok:true, text:`"${acc.name}" deleted.`});
  };
  const toggleSync = (id:string) => setSynced(s=> s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);
  const handleFileUpload = async (id:string, file:File|undefined) => {
    if(!file) return; setUploadingId(id);
    try{
      const parsed=await parseFile(file);
      if(!parsed.length){ setNotice({ok:false, text:`No valid rows in ${file.name}. Expected headers: date, symbol, side, pnl…`}); return; }
      setAccounts(prev=>prev.map(a=>a.id===id?{...a, trades:parsed, updatedAt:Date.now()}:a));
      setNotice({ok:true, text:`Imported ${parsed.length} trades into ${accounts.find(a=>a.id===id)?.name ?? "account"}.`});
    } finally{ setUploadingId(null); }
  };
  const clearTrades = (id:string) => {
    const acc=accounts.find(a=>a.id===id); if(!acc||!acc.trades.length) return;
    if(!confirm(`Remove all ${acc.trades.length} trades from "${acc.name}"?`)) return;
    setAccounts(prev=>prev.map(a=>a.id===id?{...a, trades:[], updatedAt:Date.now()}:a));
    setNotice({ok:true, text:`Cleared trades for "${acc.name}".`});
  };
  const loadSample = (id:string) => {
    const parsed=parseTradesCSV(sampleCSV()); if(!parsed.length) return;
    setAccounts(prev=>prev.map(a=>a.id===id?{...a, trades:parsed, updatedAt:Date.now()}:a));
    setNotice({ok:true, text:`Loaded ${parsed.length} sample trades.`});
  };
  const exportAccount = (id:string) => {
    const acc=accounts.find(a=>a.id===id); if(!acc||!acc.trades.length){ setNotice({ok:false, text:"Nothing to export — upload trades first."}); return; }
    const csv=tradesToCSV(acc.trades); const blob=new Blob([csv],{type:"text/csv"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`${acc.name.toLowerCase().replace(/\s+/g,"-")}-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
    setNotice({ok:true, text:`Exported ${acc.trades.length} trades.`});
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">Accounts</h1>
          <p className="mt-0.5 text-xs text-mut">Manage accounts, upload CSV per account, sync to combine metrics</p>
        </div>
        <div className="flex gap-2">
          {synced.length>1 && (
            <div className="flex items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft px-3 py-2">
              <Link2 size={14} className="text-brand" />
              <span className="text-xs font-bold text-brand">{synced.length} synced</span>
              <button onClick={()=>setSynced([])} className="ml-1 rounded-md bg-brand px-2 py-1 text-[10px] font-bold text-white">Clear</button>
            </div>
          )}
          <button onClick={addAccount} className="flex items-center gap-1.5 rounded-xl bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-deep">
            <Plus size={14} /> Add Account
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, broker, number…" className="w-full rounded-xl border border-edge bg-panel py-2 pl-8 pr-3 text-xs text-ink outline-none placeholder:text-faint focus:border-brand" />
        </div>
        <span className="ml-auto text-xs text-mut">{filteredAccounts.length} of {accounts.length} accounts {synced.length>0 && `· ${synced.length} synced`}</span>
      </div>

      {syncedAccounts.length>1 && (
        <SyncedBanner accounts={syncedAccounts} onUnsync={(id)=> setSynced(s=>s.filter(x=>x!==id))} />
      )}

      {notice && <div className={cn("rounded-xl border px-3 py-2.5 text-xs font-semibold", notice.ok ? "border-gain/30 bg-gain-soft text-gain" : "border-loss/30 bg-loss-soft text-loss")}>{notice.text}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredAccounts.map(acc=>{
          const d=derived(acc);
          const pnlTone=d.pnl>=0?"var(--gain)":"var(--loss)";
          const ddTone=d.dd>acc.maxDrawdown?"var(--loss)":d.dd>acc.maxDrawdown*0.6?"var(--warn)":"var(--gain)";
          const spark=balanceSeries(acc.trades, acc.size).slice(-20).map(p=>p.balance);
          const isSynced=synced.includes(acc.id);
          return (
            <Card key={acc.id} elevated className={cn("flex flex-col overflow-hidden transition-all", isSynced && "ring-1 ring-brand border-brand/40")}>
              <div className="flex items-center gap-2 border-b border-edge bg-panel2/60 px-3 py-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-soft text-[11px] font-extrabold text-brand">{initials(acc.name)}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-display text-xs font-bold leading-tight text-ink">{acc.name}</h3>
                  <p className="truncate text-[11px] text-mut">{acc.broker || "No broker"} · {acc.type}</p>
                </div>
                <button
                  onClick={()=>toggleSync(acc.id)}
                  title={isSynced ? "Unsync" : "Sync for combined stats"}
                  className={cn("flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold transition-colors", isSynced ? "bg-brand text-white" : "border border-edge bg-panel text-mut hover:border-brand hover:text-brand")}
                >
                  {isSynced ? <><Link2 size={10} /> Synced</> : <><Unlink2 size={10} /> Sync</>}
                </button>
              </div>

              <div className="space-y-2.5 p-3">
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="rounded-lg bg-panel2 p-2 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-mut">Bal</p>
                    <p className="tnum font-display text-xs font-bold text-ink">{fmtMoney(d.balance)}</p>
                  </div>
                  <div className="rounded-lg bg-panel2 p-2 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-mut">Equity</p>
                    <p className="tnum font-display text-xs font-bold text-ink">{fmtMoney(d.equity)}</p>
                  </div>
                  <div className="rounded-lg bg-panel2 p-2 text-center">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-mut">P&L</p>
                    <p className="tnum font-display text-xs font-bold" style={{color:pnlTone}}>{d.pnl>=0?"+":""}{fmtMoney(d.pnl)}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-edge bg-panel p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-mut">Performance</span>
                    <span className="text-[10px] font-bold text-mut">{acc.trades.length} trades</span>
                  </div>
                  {spark.length>1 ? <MiniEquity points={spark} up={d.pnl>=0} /> : <div className="flex h-[28px] items-center justify-center rounded bg-panel2 text-[11px] text-faint">No trades yet</div>}
                  <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                    <div><p className="text-[9px] font-bold uppercase text-mut">Win</p><p className="tnum text-xs font-bold" style={{color:d.k.winRate>=50?"var(--gain)":"var(--loss)"}}>{d.k.winRate.toFixed(0)}%</p></div>
                    <div><p className="text-[9px] font-bold uppercase text-mut">PF</p><p className="tnum text-xs font-bold text-ink">{d.k.pf.toFixed(2)}</p></div>
                    <div><p className="text-[9px] font-bold uppercase text-mut">DD</p><p className="tnum text-xs font-bold" style={{color:ddTone}}>{d.dd.toFixed(1)}%</p></div>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-edge2">
                    <div className="h-full rounded-full transition-all" style={{width:`${acc.maxDrawdown>0?Math.min(100,(d.dd/acc.maxDrawdown)*100):0}%`, background:ddTone}} />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="truncate font-mono text-mut">{acc.accountNumber || "—"} · {acc.platform || "—"}</span>
                  <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-faint">{fmtMoney(acc.size)} cap</span>
                </div>
              </div>

              <div className="mt-auto flex gap-1 border-t border-edge bg-panel2/40 p-2">
                <button onClick={()=>setDetailId(acc.id)} className="flex flex-1 items-center justify-center gap-1 rounded-md border border-edge bg-panel px-2 py-1.5 text-xs font-semibold text-mut hover:border-brand hover:text-brand">
                  <Eye size={11} /> Details
                </button>
                <button onClick={()=>{setManageId(acc.id); setEditForm({...acc});}} className="flex flex-1 items-center justify-center gap-1 rounded-md bg-brand px-2 py-1.5 text-xs font-semibold text-white hover:bg-brand-deep">
                  <Settings size={11} /> Manage
                </button>
              </div>
            </Card>
          );
        })}
        <Card elevated className="flex min-h-[220px] flex-col items-center justify-center border-2 border-dashed border-edge2 p-4">
          <button onClick={addAccount} className="flex w-full cursor-pointer flex-col items-center justify-center gap-2 px-2 py-6 text-center">
            <div className="grid h-9 w-9 place-items-center rounded-full border-2 border-dashed border-brand"><Plus className="h-4 w-4 text-brand" /></div>
            <span className="text-sm font-bold text-ink">Add Trading Account</span>
            <span className="text-xs text-mut">Configure then upload CSV</span>
          </button>
        </Card>
      </div>

      {filteredAccounts.length===0 && <div className="py-10 text-center text-sm text-mut">No accounts match.</div>}

      {detailAcc && <AccountDetailsModal acc={detailAcc} onClose={()=>setDetailId(null)} onManage={()=>{setDetailId(null); setManageId(detailAcc.id); setEditForm({...detailAcc});}} onUpload={(f)=>handleFileUpload(detailAcc.id,f)} onExport={()=>exportAccount(detailAcc.id)} uploading={uploadingId===detailAcc.id} />}
      {manageAcc && <AccountManageModal acc={manageAcc} form={editForm} setForm={setEditForm} uploading={uploadingId===manageAcc.id} onUpload={(f)=>handleFileUpload(manageAcc.id,f)} onSample={()=>loadSample(manageAcc.id)} onClear={()=>clearTrades(manageAcc.id)} onExport={()=>exportAccount(manageAcc.id)} onDelete={()=>deleteAccount(manageAcc.id)} onSave={saveManage} onClose={()=>{setManageId(null); setEditForm({});}} />}
    </div>
  );
}

function SyncedBanner({ accounts, onUnsync }: { accounts: AccountConfig[]; onUnsync:(id:string)=>void }) {
  const all=accounts.flatMap(a=>a.trades); const k=computeKpis(all);
  return (
    <div className="rounded-xl border border-brand/30 bg-brand-soft p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link2 size={14} className="text-brand" />
        <span className="text-xs font-bold text-brand">Synced — {accounts.length} accounts combined</span>
        <span className="text-xs text-mut">· {all.length} trades · {fmtMoney(k.net,{sign:true})} · {k.winRate.toFixed(1)}% WR · PF {k.pf.toFixed(2)}</span>
        <div className="ml-auto flex flex-wrap gap-1">
          {accounts.map(a=>(
            <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-ink shadow-sm">
              {a.name} <button onClick={()=>onUnsync(a.id)} className="rounded-full p-0.5 hover:bg-panel2"><X size={10} /></button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModalShell({ title, sub, onClose, children, wide }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-3 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} className={cn("max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-edge bg-panel shadow-2xl", wide ? "max-w-3xl" : "max-w-xl")}>
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-edge bg-panel px-4 py-3">
          <div><h2 className="font-display text-base font-bold text-ink">{title}</h2>{sub && <p className="mt-0.5 text-xs text-mut">{sub}</p>}</div>
          <button onClick={onClose} className="rounded-lg border border-edge p-1.5 text-mut hover:bg-panel2 hover:text-ink"><X size={14} /></button>
        </div>
        <div className="space-y-3 p-4">{children}</div>
      </div>
    </div>
  );
}

function AccountDetailsModal({ acc, uploading, onClose, onManage, onUpload, onExport }: { acc: AccountConfig; uploading: boolean; onClose: () => void; onManage: () => void; onUpload: (f: File|undefined)=>void; onExport: ()=>void; }) {
  const d=derived(acc); const k=d.k; const bal=balanceSeries(acc.trades, acc.size); const recent=[...acc.trades].sort((a,b)=>b.ts-a.ts).slice(0,6);
  const ddPct=acc.maxDrawdown>0?Math.min(100,(d.dd/acc.maxDrawdown)*100):0;
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <ModalShell title={acc.name} sub={`${acc.broker||"No broker"} · ${acc.accountNumber||"no number"} · ${acc.platform||"no platform"}`} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          {label:"Balance", value:fmtMoney(d.balance), tone:"var(--ink)"},
          {label:"Equity", value:fmtMoney(d.equity), tone:"var(--ink)"},
          {label:"Net P&L", value:`${d.pnl>=0?"+":""}${fmtMoney(d.pnl)}`, tone:d.pnl>=0?"var(--gain)":"var(--loss)"},
          {label:"Win rate", value:`${k.winRate.toFixed(1)}%`, tone:"var(--ink)"},
          {label:"Profit factor", value:k.pf.toFixed(2), tone:"var(--ink)"},
          {label:"Trades", value:String(acc.trades.length), tone:"var(--ink)"},
        ].map(m=>(
          <div key={m.label} className="rounded-xl border border-edge bg-panel2 p-2.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-mut">{m.label}</p>
            <p className="tnum mt-0.5 font-display text-sm font-bold" style={{color:m.tone}}>{m.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-edge bg-panel2 p-2.5">
        <div className="flex items-center justify-between text-xs"><span className="font-semibold text-mut">Drawdown usage</span><span className="tnum font-bold text-ink">{d.dd.toFixed(1)}% of {acc.maxDrawdown}%</span></div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-edge2"><div className="h-full rounded-full" style={{width:`${ddPct}%`, background: d.dd>acc.maxDrawdown?"var(--loss)":"var(--brand)"}} /></div>
      </div>
      <div>
        <p className="mb-1.5 text-xs font-bold text-ink">Equity curve</p>
        {bal.length ? <EquitySpark points={bal.map(p=>p.balance)} /> : <p className="rounded-xl border border-dashed border-edge2 p-3 text-center text-xs text-mut">Upload a CSV to draw equity curve.</p>}
      </div>
      <div>
        <p className="mb-1.5 text-xs font-bold text-ink">Recent trades</p>
        {recent.length ? (
          <div className="overflow-hidden rounded-xl border border-edge">
            <table className="w-full text-left text-xs">
              <thead><tr className="border-b border-edge bg-panel2 text-[10px] uppercase tracking-wider text-mut"><th className="px-2.5 py-2">Date</th><th className="px-2.5 py-2">Symbol</th><th className="px-2.5 py-2">Side</th><th className="px-2.5 py-2 text-right">P&L</th></tr></thead>
              <tbody className="divide-y divide-edge">{recent.map(t=>(
                <tr key={t.id}><td className="px-2.5 py-1.5 text-mut">{t.date}</td><td className="px-2.5 py-1.5 font-bold text-ink">{t.symbol}</td><td className="px-2.5 py-1.5 text-mut">{t.side}</td><td className="px-2.5 py-1.5 text-right font-bold" style={{color:t.pnl>=0?"var(--gain)":"var(--loss)"}}>{t.pnl>=0?"+":""}{fmtMoney(t.pnl)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="rounded-xl border border-dashed border-edge2 p-3 text-center text-xs text-mut">No trades yet.</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <input ref={inputRef} type="file" accept=".csv,text/csv,.txt" className="hidden" onChange={e=>{ onUpload(e.target.files?.[0]); e.currentTarget.value=""; }} />
        <button onClick={()=> inputRef.current?.click()} disabled={uploading} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-edge bg-panel px-3 py-2 text-xs font-semibold text-mut hover:border-brand hover:text-brand disabled:opacity-50">
          <Upload size={12} />{uploading?"Importing…":acc.trades.length?"Replace CSV":"Upload CSV"}
        </button>
        <button onClick={onExport} disabled={!acc.trades.length} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-edge bg-panel px-3 py-2 text-xs font-semibold text-mut hover:border-brand hover:text-brand disabled:opacity-50"><Download size={12} />Export</button>
        <button onClick={onManage} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white hover:bg-brand-deep"><Settings size={12} />Manage</button>
      </div>
      <p className="text-center text-[11px] text-mut">Supports MT5 History Report (Positions) &amp; <code>date,symbol,side,pnl</code> CSV</p>
    </ModalShell>
  );
}

function AccountManageModal({ acc, form, setForm, uploading, onUpload, onSample, onClear, onExport, onDelete, onSave, onClose }: { acc: AccountConfig; form: Partial<AccountConfig>; setForm: (f: Partial<AccountConfig>)=>void; uploading: boolean; onUpload: (f: File|undefined)=>void; onSample: ()=>void; onClear: ()=>void; onExport: ()=>void; onDelete: ()=>void; onSave: ()=>void; onClose: ()=>void; }) {
  const set = (patch: Partial<AccountConfig>) => setForm({ ...form, ...patch });
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <ModalShell title={`Manage ${acc.name}`} sub="Edit details, limits and trade data" onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-mut">Account name</span><input value={form.name??""} onChange={e=>set({name:e.target.value})} className="w-full rounded-lg border border-edge bg-panel px-3 py-2 text-xs text-ink outline-none focus:border-brand" /></label>
        <label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-mut">Broker / prop firm</span><input value={form.broker??""} onChange={e=>set({broker:e.target.value})} placeholder="FundedNext" className="w-full rounded-lg border border-edge bg-panel px-3 py-2 text-xs text-ink outline-none focus:border-brand" /></label>
        <label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-mut">Account number</span><input value={form.accountNumber??""} onChange={e=>set({accountNumber:e.target.value})} placeholder="FN-000000" className="w-full rounded-lg border border-edge bg-panel px-3 py-2 font-mono text-xs text-ink outline-none focus:border-brand" /></label>
        <label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-mut">Platform</span><input value={form.platform??""} onChange={e=>set({platform:e.target.value})} placeholder="MT5 / DXtrade / TWS" className="w-full rounded-lg border border-edge bg-panel px-3 py-2 text-xs text-ink outline-none focus:border-brand" /></label>
        <label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-mut">Type</span><select value={form.type??"Personal"} onChange={e=>set({type:e.target.value as AccountConfig["type"]})} className="w-full rounded-lg border border-edge bg-panel px-3 py-2 text-xs text-ink outline-none focus:border-brand"><option value="Prop">Prop</option><option value="Funded">Funded</option><option value="Personal">Personal</option><option value="Demo">Demo</option></select></label>
        <label className="block"><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-mut">Account size ($)</span><input type="number" min={0} value={form.size??0} onChange={e=>set({size:Number(e.target.value)||0})} className="w-full rounded-lg border border-edge bg-panel px-3 py-2 text-xs text-ink outline-none focus:border-brand" /></label>
        <label className="block sm:col-span-2"><span className="mb-1 block text-xs font-bold uppercase tracking-wider text-mut">Max drawdown (%)</span><input type="number" min={0} max={100} value={form.maxDrawdown??0} onChange={e=>set({maxDrawdown:Number(e.target.value)||0})} className="w-full rounded-lg border border-edge bg-panel px-3 py-2 text-xs text-ink outline-none focus:border-brand" /></label>
      </div>
      <div className="rounded-xl border border-edge bg-panel2 p-3">
        <p className="text-xs font-bold text-ink">Trade data · {acc.trades.length} trades loaded</p>
        <p className="mt-0.5 text-[11px] text-mut">Supports MT5 History Report (Positions) &amp; <code>date,symbol,side,pnl</code> CSV. After upload every tab (Dashboard, Analytics…) recalculates from this account.</p>
        <input ref={inputRef} type="file" accept=".csv,text/csv,.txt" className="hidden" onChange={e=>{ onUpload(e.target.files?.[0]); e.currentTarget.value=""; }} />
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button onClick={()=> inputRef.current?.click()} disabled={uploading} className="flex items-center justify-center gap-2 rounded-lg border border-edge bg-panel px-3 py-2 text-xs font-semibold text-mut hover:border-brand hover:text-brand disabled:opacity-50">
            <Upload size={12} />{uploading?"Importing…":acc.trades.length?"Replace CSV":"Upload CSV"}
          </button>
          <button onClick={onSample} className="flex items-center justify-center gap-2 rounded-lg border border-edge bg-panel px-3 py-2 text-xs font-semibold text-mut hover:border-brand hover:text-brand"><FileText size={12} />Load sample</button>
          <button onClick={onExport} disabled={!acc.trades.length} className="flex items-center justify-center gap-2 rounded-lg border border-edge bg-panel px-3 py-2 text-xs font-semibold text-mut hover:border-brand hover:text-brand disabled:opacity-50"><Download size={12} />Export CSV</button>
          <button onClick={onClear} disabled={!acc.trades.length} className="flex items-center justify-center gap-2 rounded-lg border border-edge bg-panel px-3 py-2 text-xs font-semibold text-mut hover:border-loss hover:text-loss disabled:opacity-50"><RotateCcw size={12} />Clear trades</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={onDelete} className="flex items-center gap-2 rounded-lg border border-loss/30 bg-loss-soft px-3 py-2 text-xs font-semibold text-loss hover:bg-loss/25"><Trash2 size={12} />Delete account</button>
        <div className="ml-auto flex gap-2"><button onClick={onClose} className="rounded-lg border border-edge bg-panel px-4 py-2 text-xs font-semibold text-mut hover:bg-panel2">Cancel</button><button onClick={onSave} className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-deep">Save changes</button></div>
      </div>
    </ModalShell>
  );
}

function EquitySpark({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const max=Math.max(...points), min=Math.min(...points), span=max-min||1;
  const pts=points.map((v,i)=>{ const x=(i/(points.length-1))*580+10; const y=90-((v-min)/span)*76; return `${x.toFixed(1)},${y.toFixed(1)}`;});
  const up=points[points.length-1]>=points[0];
  return (
    <svg viewBox="0 0 600 100" className="h-20 w-full" preserveAspectRatio="none">
      <defs><linearGradient id="accEqFill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={up?"var(--gain)":"var(--loss)"} stopOpacity="0.25" /><stop offset="100%" stopColor={up?"var(--gain)":"var(--loss)"} stopOpacity="0" /></linearGradient></defs>
      <polyline points={`10,90 ${pts.join(" ")} 590,90`} fill="url(#accEqFill2)" stroke="none" />
      <polyline points={pts.join(" ")} fill="none" stroke={up?"var(--gain)":"var(--loss)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MiniEquity({ points, up }: { points: number[]; up: boolean }) {
  if (points.length < 2) return null;
  const max=Math.max(...points), min=Math.min(...points), span=max-min||1;
  const d=points.map((v,i)=>{ const x=(i/Math.max(1,points.length-1))*100; const y=24 - ((v-min)/span)*18; return `${i===0?"M":"L"} ${x.toFixed(1)} ${y.toFixed(1)}`;}).join(" ");
  return <svg viewBox="0 0 100 24" className="h-7 w-full" preserveAspectRatio="none"><path d={d} fill="none" stroke={up?"var(--gain)":"var(--loss)"} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
