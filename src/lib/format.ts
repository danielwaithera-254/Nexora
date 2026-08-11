export const fmtMoney = (v: number, opts?: { sign?: boolean; decimals?: number }) => {
  const { sign = false, decimals } = opts ?? {};
  const abs = Math.abs(v);
  const hasCents = Math.abs(v - Math.round(v)) > 1e-9;
  const dec = decimals ?? (abs < 100 && abs !== 0 ? 2 : hasCents ? 2 : 0);
  const body = abs.toLocaleString("en-US", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
  const prefix = v < 0 ? "-$" : sign && v > 0 ? "+$" : "$";
  return `${prefix}${body}`;
};

export const fmtCompact = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1000) return `${v < 0 ? "-" : ""}$${(abs / 1000).toFixed(1)}k`;
  return fmtMoney(v);
};

export const fmtPct = (v: number, dec = 1) => `${v.toFixed(dec)}%`;

export const fmtNum = (v: number, dec = 2) =>
  v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });

export const fmtDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
};

export const fmtDateShort = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
