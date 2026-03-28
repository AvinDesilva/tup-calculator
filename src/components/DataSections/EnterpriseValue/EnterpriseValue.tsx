import { f, fB } from "../../../lib/utils.ts";
import { SectionLabel, DataRow, DerivedStat } from "../../primitives";
import type { EnterpriseValueProps } from "./EnterpriseValue.types.ts";

export function EnterpriseValue({ inp, company, currencyMismatchWarning }: EnterpriseValueProps) {
  return (
    <div style={{ marginBottom: "32px" }}>
      <SectionLabel num="01" title="Enterprise Value" />
      {currencyMismatchWarning && (
        <div style={{ marginBottom: "12px", padding: "8px 12px", borderLeft: "2px solid #f5a020", background: "rgba(245,160,32,0.04)", display: "flex", gap: "8px", alignItems: "flex-start" }}>
          <span style={{ color: "#f5a020", flexShrink: 0 }}>⚠</span>
          <span style={{ fontSize: "10px", color: "#f5a020", lineHeight: 1.6 }}>{currencyMismatchWarning}</span>
        </div>
      )}
      <DataRow label="Market Cap"         value={company ? fB(inp.marketCap) : "—"} />
      <DataRow label="Total Debt"         value={company ? fB(inp.debt) : "—"} />
      <DataRow label="Cash & Equiv."      value={company ? fB(inp.cash) : "—"} />
      <DataRow label="Shares Outstanding" value={company ? `${(inp.shares / 1e9).toFixed(3)}B` : "—"} />
      {company && (
        <DerivedStat
          label="Adj. Price = (MktCap + Debt − Cash) ÷ Shares"
          value={`$${f((inp.marketCap + inp.debt - inp.cash) / inp.shares)}`}
        />
      )}
    </div>
  );
}
