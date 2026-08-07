import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search, Table2, Inbox } from "lucide-react";
import { Card, CardHead, SelectBox } from "./ui";
import type { Trade } from "../data/trades";
import { fmtDate, fmtMoney, fmtNum } from "../lib/format";
import { cn } from "../utils/cn";

type SortKey = "date" | "symbol" | "qty" | "r" | "pnl";

export default function TradesTable({
  trades,
  onSelect,
}: {
  trades: Trade[];
  onSelect?: (t: Trade) => void;
}) {
  const [q, setQ] = useState("");
  const [side, setSide] = useState("All");
  const [result, setResult] = useState("All");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState(10);

  const rows = useMemo(() => {
    let list = trades.filter((t) => {
      const hit =
        !q ||
        t.symbol.toLowerCase().includes(q.toLowerCase()) ||
        t.strategy.toLowerCase().includes(q.toLowerCase()) ||
        t.account.toLowerCase().includes(q.toLowerCase()) ||
        t.id.toLowerCase().includes(q.toLowerCase());
      const sOk = side === "All" || t.side === side;
      const rOk =
        result === "All" ||
        (result === "Wins" && t.pnl > 0) ||
        (result === "Losses" && t.pnl < 0) ||
        (result === "Breakeven" && t.pnl === 0);
      return hit && sOk && rOk;
    });
    const dir = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      if (sortKey === "date") return (a.ts - b.ts) * dir;
      if (sortKey === "symbol") return a.symbol.localeCompare(b.symbol) * dir;
      return ((a[sortKey] as number) - (b[sortKey] as number)) * dir;
    });
    return list;
  }, [trades, q, side, result, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const Th = ({ k, label, right }: { k?: SortKey; label: string; right?: boolean }) => (
    <th
      onClick={k ? () => toggleSort(k) : undefined}
      className={cn(
        "whitespace-nowrap px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-faint",
        k && "cursor-pointer select-none transition-colors hover:text-brand",
        right && "text-right"
      )}
    >
      <span className={cn("inline-flex items-center gap-1", right && "flex-row-reverse")}>
        {label}
        {k &&
          (sortKey === k ? (
            sortDir === "asc" ? (
              <ArrowUp size={10} className="text-brand" />
            ) : (
              <ArrowDown size={10} className="text-brand" />
            )
          ) : (
            <ArrowUpDown size={10} className="opacity-40" />
          ))}
      </span>
    </th>
  );

  return (
    <Card>
      <CardHead
        title="Trade Log"
        info="Every closed execution in the current view. Click any column header to sort."
        icon={<Table2 size={14} />}
        right={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setLimit(10);
                }}
                placeholder="Search symbol, strategy…"
                className="w-40 rounded-xl border border-edge bg-panel2 py-[7px] pl-7 pr-2 text-[11px] font-semibold text-ink outline-none transition-all placeholder:text-faint focus:w-52 focus:border-brand sm:w-48"
              />
            </div>
            <SelectBox
              value={side}
              onChange={(v) => setSide(v)}
              options={[
                { value: "All", label: "All sides" },
                { value: "Long", label: "Long" },
                { value: "Short", label: "Short" },
              ]}
            />
            <SelectBox
              value={result}
              onChange={(v) => setResult(v)}
              options={[
                { value: "All", label: "All results" },
                { value: "Wins", label: "Wins" },
                { value: "Losses", label: "Losses" },
                { value: "Breakeven", label: "Breakeven" },
              ]}
            />
          </div>
        }
      />
      <div className="overflow-x-auto px-2 pb-2 sm:px-3">
        <table className="w-full min-w-[760px] border-collapse">
          <thead>
            <tr className="border-b border-edge2 text-left">
              <Th k="date" label="Date" />
              <th className="px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-faint">ID</th>
              <Th k="symbol" label="Symbol" />
              <th className="px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-faint">Side</th>
              <th className="px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-faint">Strategy</th>
              <th className="px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-faint">Account</th>
              <Th k="qty" label="Qty" right />
              <th className="px-3 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-wider text-faint">Entry → Exit</th>
              <Th k="r" label="R" right />
              <Th k="pnl" label="Net P&L" right />
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((t) => (
              <tr
                key={t.id}
                onClick={() => onSelect?.(t)}
                title={onSelect ? "Open trade details — stats, playbook, execution, attachments & notes" : undefined}
                className={cn(
                  "group border-b border-edge2/60 transition-colors last:border-0",
                  onSelect
                    ? "cursor-pointer hover:bg-brand-soft/40"
                    : "hover:bg-brand-soft/40"
                )}
              >
                <td className="whitespace-nowrap px-3 py-2.5 text-[11.5px] font-semibold text-mut tnum">
                  {fmtDate(t.date)}
                </td>
                <td className="px-3 py-2.5 font-mono text-[10px] text-faint">{t.id}</td>
                <td className="px-3 py-2.5">
                  <span className="rounded-md bg-brand-soft px-1.5 py-0.5 font-display text-[11px] font-bold text-brand">
                    {t.symbol}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px] font-bold",
                      t.side === "Long" ? "bg-gain-soft text-gain" : "bg-loss-soft text-loss"
                    )}
                  >
                    {t.side === "Long" ? "L" : "S"} · {t.side}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[11.5px] font-medium text-mut">{t.strategy}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-faint">{t.account}</td>
                <td className="px-3 py-2.5 text-right text-[11.5px] font-semibold text-mut tnum">{t.qty}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[10.5px] text-faint tnum">
                  {t.entry} → {t.exit}
                </td>
                <td
                  className={cn(
                    "px-3 py-2.5 text-right font-mono text-[11px] font-semibold tnum",
                    t.r > 0 ? "text-gain" : t.r < 0 ? "text-loss" : "text-mut"
                  )}
                >
                  {t.r > 0 ? "+" : ""}
                  {fmtNum(t.r, 1)}R
                </td>
                <td
                  className={cn(
                    "px-3 py-2.5 text-right font-display text-[12px] font-bold tnum",
                    t.pnl > 0 ? "text-gain" : t.pnl < 0 ? "text-loss" : "text-mut"
                  )}
                >
                  {fmtMoney(t.pnl, { sign: true })}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-12 text-center">
                  <Inbox size={28} className="mx-auto mb-2 text-faint" />
                  <p className="text-sm font-bold text-mut">No trades match your filters</p>
                  <p className="mt-1 text-[11px] text-faint">Try widening the date range or clearing the search.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-edge2 px-5 py-3">
        <span className="text-[11px] font-semibold text-mut tnum">
          Showing {Math.min(limit, rows.length)} of {rows.length} trades
        </span>
        {rows.length > limit && (
          <button
            onClick={() => setLimit((l) => l + 10)}
            className="rounded-xl border border-edge bg-panel2 px-3.5 py-1.5 text-[11px] font-bold text-ink transition-all hover:-translate-y-px hover:border-brand/50 hover:text-brand active:translate-y-0 active:scale-95"
          >
            Show more
          </button>
        )}
      </div>
    </Card>
  );
}
