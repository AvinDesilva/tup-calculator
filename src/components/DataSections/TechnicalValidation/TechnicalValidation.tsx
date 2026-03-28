import { f } from "../../../lib/utils.ts";
import { SectionLabel, DataRow } from "../../primitives";
import type { TechnicalValidationProps } from "./TechnicalValidation.types.ts";

export function TechnicalValidation({ inp, company }: TechnicalValidationProps) {
  return (
    <div>
      <SectionLabel num="03" title="Technical Validation" />
      <DataRow label="Current Price" value={company ? `$${f(inp.currentPrice)}` : "—"} />
      <DataRow label="200-Day SMA"   value={company ? `$${f(inp.sma200)}` : "—"} />
      {company && inp.currentPrice > 0 && inp.sma200 > 0 && (
        <div style={{
          padding: "8px 12px",
          borderLeft: `2px solid ${inp.currentPrice >= inp.sma200 ? "rgba(16,217,126,0.5)" : "rgba(255,65,54,0.5)"}`,
          borderTop: `1px solid ${inp.currentPrice >= inp.sma200 ? "rgba(16,217,126,0.12)" : "rgba(255,65,54,0.12)"}`,
          borderRight: `1px solid ${inp.currentPrice >= inp.sma200 ? "rgba(16,217,126,0.12)" : "rgba(255,65,54,0.12)"}`,
          borderBottom: `1px solid ${inp.currentPrice >= inp.sma200 ? "rgba(16,217,126,0.12)" : "rgba(255,65,54,0.12)"}`,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginTop: "10px",
        }}>
          <span style={{ color: inp.currentPrice >= inp.sma200 ? "#10d97e" : "#ff4136" }}>
            {inp.currentPrice >= inp.sma200 ? "✓" : "✕"}
          </span>
          <span style={{ fontSize: "11px", color: inp.currentPrice >= inp.sma200 ? "#10d97e" : "#ff4136" }}>
            {inp.currentPrice >= inp.sma200
              ? `Above SMA (+${f(((inp.currentPrice / inp.sma200) - 1) * 100)}%)`
              : `Falling Knife — ${f((1 - inp.currentPrice / inp.sma200) * 100)}% below SMA`}
          </span>
        </div>
      )}
    </div>
  );
}
