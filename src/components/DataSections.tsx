import { f, fB } from "../lib/utils.ts";
import { SectionLabel, DataRow, DerivedStat } from "./ui.tsx";
import type { InputState } from "../lib/types.ts";

interface DataSectionsProps {
  inp: InputState;
  company: string;
  currencyMismatchWarning: string;
  growthPeriod: "5yr" | "10yr";
  growthValues: { g5: number; g10: number };
  onGrowthPeriodChange: (period: "5yr" | "10yr") => void;
}

export function DataSections({
  inp, company, currencyMismatchWarning, growthPeriod, growthValues,
  onGrowthPeriodChange,
}: DataSectionsProps) {
  const divYield = inp.dividendYield || 0;
  const divIsAccelerator = divYield > 3;

  // Compute blended growth rates (growth-only, no dividend)
  const histRate = inp.historicalGrowth;
  const fwd1 = inp.fwdGrowthY1;
  const fwd2 = inp.fwdGrowthY2 ?? fwd1;
  const fwdCagr = inp.fwdCAGR;

  const blendedY1 = fwd1;
  const blendedY2 = fwd2;
  const blendedTerminal = fwdCagr != null ? (histRate + fwdCagr) / 2 : histRate;

  const labelSm: React.CSSProperties = {
    fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em",
    textTransform: "uppercase", color: "#888888",
  };
  const valueSm: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: "13px",
    fontWeight: 600, color: "#10d97e", textAlign: "right",
  };
  const formulaSm: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: "10px",
    color: "#555", textAlign: "right",
  };

  return (
    <>
      {/* 01 Enterprise Value */}
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

      {/* 02 Growth */}
      <div style={{ marginBottom: "32px" }}>
        <SectionLabel num="02" title="Growth Assumptions" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#888888" }}>Historical EPS Growth</span>
            <div style={{ display: "flex", gap: "0px" }}>
              {(["5yr", "10yr"] as const).map(p => (
                <button key={p} onClick={() => onGrowthPeriodChange(p)} style={{
                  fontSize: "9px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.05em", padding: "2px 6px",
                  background: growthPeriod === p ? "rgba(196,160,110,0.2)" : "transparent",
                  border: `1px solid ${growthPeriod === p ? "#C4A06E" : "rgba(255,255,255,0.1)"}`,
                  color: growthPeriod === p ? "#C4A06E" : "#666",
                  cursor: "pointer",
                  borderRadius: p === "5yr" ? "3px 0 0 3px" : "0 3px 3px 0",
                  marginLeft: p === "10yr" ? "-1px" : 0,
                }}>{p}</button>
              ))}
            </div>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 600, color: "#00BFA5" }}>
            {inp.historicalGrowth.toFixed(1)}%
          </span>
        </div>

        {/* Blended Growth Rate Table */}
        <div style={{ marginTop: "12px", marginBottom: "12px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto",
            gap: "0",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}>
            {/* Header */}
            <div style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.08)", ...labelSm, fontSize: "9px", letterSpacing: "0.18em" }}>Stage</div>
            <div style={{ padding: "8px 12px 8px 0", borderBottom: "1px solid rgba(255,255,255,0.08)", ...labelSm, fontSize: "9px", letterSpacing: "0.18em", textAlign: "right" }}>Formula</div>
            <div style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.08)", ...labelSm, fontSize: "9px", letterSpacing: "0.18em", textAlign: "right" }}>Rate</div>

            {/* Year 1 */}
            <div style={{ padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", ...labelSm }}>Y1 Growth</div>
            <div style={{ padding: "7px 12px 7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", ...formulaSm }}>Analyst Y1</div>
            <div style={{ padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", ...valueSm }}>{f(blendedY1)}%</div>

            {/* Year 2 */}
            <div style={{ padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", ...labelSm }}>Y2 Growth</div>
            <div style={{ padding: "7px 12px 7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", ...formulaSm }}>
              {inp.fwdGrowthY2 != null ? "Analyst Y2" : "= Y1"}
            </div>
            <div style={{ padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)", ...valueSm }}>{f(blendedY2)}%</div>

            {/* Terminal */}
            <div style={{ padding: "7px 0", ...labelSm }}>Terminal (Y3+)</div>
            <div style={{ padding: "7px 12px 7px 0", ...formulaSm }}>
              {fwdCagr != null ? "(Hist+CAGR)/2" : "Hist Only"}
            </div>
            <div style={{ padding: "7px 0", ...valueSm, color: "#C4A06E" }}>{f(blendedTerminal)}%</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#888888" }}>Dividend Yield</span>
            {divIsAccelerator && (
              <span style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#10d97e", border: "1px solid rgba(16,217,126,0.3)", padding: "1px 5px" }}>
                ★ Accelerator
              </span>
            )}
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 600, color: "#00BFA5" }}>
            {divYield.toFixed(1)}%
          </span>
        </div>
        {divYield > 0 && (
          <DerivedStat
            label="Total Terminal Rate"
            value={`(${f(blendedTerminal)}% + ${f(divYield)}%) = ${f(blendedTerminal + divYield)}%`}
            accent="#C4A06E"
          />
        )}
      </div>

      {/* 03 Technical */}
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
    </>
  );
}
