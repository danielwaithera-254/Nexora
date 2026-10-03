import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { fmtMoney } from "./format";

export type DisplayUnit = "$" | "R";

interface DisplayCtx {
  unit: DisplayUnit;
  setUnit: (u: DisplayUnit) => void;
  /** dollar value of 1R (1% of connected account capital) */
  rValue: number;
  /** format a P&L value in the active unit */
  fmtPnl: (v: number, opts?: { sign?: boolean; decimals?: number }) => string;
  /** short unit suffix for axis/column headers */
  unitLabel: string;
}

const Ctx = createContext<DisplayCtx>({
  unit: "$",
  setUnit: () => {},
  rValue: 250,
  fmtPnl: (v, opts) => fmtMoney(v, opts),
  unitLabel: "$",
});

export function formatR(r: number, opts?: { sign?: boolean }): string {
  const { sign = false } = opts ?? {};
  const abs = Math.abs(r);
  const body = abs >= 100 ? abs.toFixed(0) : abs.toFixed(1);
  const prefix = r < 0 ? "-" : sign && r > 0 ? "+" : "";
  return `${prefix}${body}R`;
}

export function DisplayUnitProvider({ rValue, children }: { rValue: number; children: ReactNode }) {
  const [unit, setUnitState] = useState<DisplayUnit>(() => {
    try { return (localStorage.getItem("nexora-unit") as DisplayUnit) || "$"; } catch { return "$"; }
  });
  const setUnit = useCallback((u: DisplayUnit) => {
    setUnitState(u);
    try { localStorage.setItem("nexora-unit", u); } catch {}
  }, []);

  const ctx = useMemo<DisplayCtx>(() => {
    const rv = rValue > 0 ? rValue : 250;
    return {
      unit,
      setUnit,
      rValue: rv,
      fmtPnl: (v, opts) => (unit === "$" ? fmtMoney(v, opts) : formatR(v / rv, opts)),
      unitLabel: unit === "$" ? "$" : "R",
    };
  }, [unit, setUnit, rValue]);

  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>;
}

export function useDisplay(): DisplayCtx {
  return useContext(Ctx);
}
