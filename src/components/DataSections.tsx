import { useState } from "react";
import { f, fB } from "../lib/utils.ts";
import { SectionLabel, DataRow, DerivedStat } from "./ui.tsx";
import type { InputState, EpsGrowthPoint } from "../lib/types.ts";

interface DataSectionsProps {
  inp: InputState;
  company: string;
  currencyMismatchWarning: string;
  growthPeriod: "5yr" | "10yr";
  growthYears: { short: number; long: number };
  epsGrowthHistory: EpsGrowthPoint[];
  onGrowthPeriodChange: (period: "5yr" | "10yr") => void;
}

export function DataSections({
  inp, company, currencyMismatchWarning, growthPeriod, growthYears,
  epsGrowthHistory, onGrowthPeriodChange,
}: DataSectionsProps) {
  const [chartExpanded, setChartExpanded] = useState(false);

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

  // Chart data: slice to match selected growth period, then reverse to chronological
  const sliceCount = growthPeriod === "5yr" ? growthYears.short : growthYears.long;
  const chartData = epsGrowthHistory.slice(0, sliceCount).reverse();

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
          <div className="rsp-growth-row" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#888888" }}>Historical EPS Growth</span>
            <div style={{ display: "flex", gap: "0px" }}>
              {(() => {
                const showLong = growthYears.long > growthYears.short;
                const showViz = epsGrowthHistory.length > 0;
                const buttons: { key: "5yr" | "10yr"; label: string }[] = [
                  { key: "5yr", label: `${growthYears.short}yr` },
                  ...(showLong ? [{ key: "10yr" as const, label: `${growthYears.long}yr` }] : []),
                ];
                const periodButtons = buttons.map((b, i) => (
                  <button key={b.key} aria-pressed={growthPeriod === b.key} onClick={() => onGrowthPeriodChange(b.key)} style={{
                    fontSize: "9px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: "0.05em", padding: "2px 6px",
                    background: growthPeriod === b.key ? "rgba(196,160,110,0.2)" : "transparent",
                    border: `1px solid ${growthPeriod === b.key ? "#C4A06E" : "rgba(255,255,255,0.1)"}`,
                    color: growthPeriod === b.key ? "#C4A06E" : "#666",
                    cursor: "pointer",
                    borderRadius: buttons.length === 1 ? "3px" : i === 0 ? "3px 0 0 3px" : i === buttons.length - 1 ? "0 3px 3px 0" : "0",
                    marginLeft: i > 0 ? "-1px" : 0,
                  }}>{b.label}</button>
                ));
                return <>
                  {periodButtons}
                  {showViz && (
                    <button
                      onClick={() => setChartExpanded(v => !v)}
                      aria-expanded={chartExpanded}
                      aria-label="Toggle EPS growth chart"
                      style={{
                        fontSize: "9px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: "0.05em", padding: "2px 6px",
                        background: chartExpanded ? "rgba(196,160,110,0.2)" : "transparent",
                        border: `1px solid ${chartExpanded ? "#C4A06E" : "rgba(255,255,255,0.1)"}`,
                        color: chartExpanded ? "#C4A06E" : "#666",
                        cursor: "pointer",
                        borderRadius: "3px",
                        marginLeft: "6px",
                      }}
                    >visualize</button>
                  )}
                </>;
              })()}
            </div>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 600, color: "#00BFA5" }}>
            {inp.historicalGrowth.toFixed(1)}%
          </span>
        </div>

        {/* Collapsible EPS Growth Bar Chart */}
        <div style={{
          maxHeight: chartExpanded ? "500px" : "0",
          overflow: "hidden",
          transition: "max-height 0.25s ease",
        }}>
          {chartData.length > 0 && (() => {
            const W = 300, H = 150;
            const padL = 16, padR = 10, padTop = 16, padBot = 22;
            const chartW = W - padL - padR;
            const chartH = H - padTop - padBot;
            const n = chartData.length;

            // Sqrt compression: tames outliers (150% vs 9%) while keeping
            // small bars visible. Linear when data is uniform enough.
            const pctValues = chartData.map(d => d.growth * 100);
            const absValues = pctValues.map(Math.abs).filter(v => v > 0);
            const absMax = absValues.length > 0 ? Math.max(...absValues) : 5;
            const absMin = absValues.length > 0 ? Math.min(...absValues) : 5;
            const useCompress = absMax / Math.max(absMin, 1) > 5;

            const compress = (pct: number) => useCompress
              ? Math.sign(pct) * Math.sqrt(Math.abs(pct))
              : pct;

            // Axis bounds in compressed space with headroom for labels
            const maxPct = Math.max(5, ...pctValues);
            const minPct = Math.min(-5, ...pctValues);
            const cMax = compress(maxPct);
            const cMin = compress(minPct);
            const headroom = (cMax - cMin) * 0.12;
            const axisTop = cMax + headroom;
            const axisBot = cMin - headroom;
            const axisRange = axisTop - axisBot;

            const valToY = (pct: number) => padTop + (axisTop - compress(pct)) / axisRange * chartH;
            const zeroY = valToY(0);

            // Generate nice ticks at real percentages, positioned via compress
            const posCeil = Math.ceil(maxPct);
            const negFloor = Math.floor(minPct);
            const posStep = posCeil > 100 ? 50 : posCeil > 40 ? 25 : posCeil > 15 ? 10 : 5;
            const negStep = Math.abs(negFloor) > 100 ? 50 : Math.abs(negFloor) > 40 ? 25 : Math.abs(negFloor) > 15 ? 10 : 5;
            const ticks: number[] = [0];
            for (let v = posStep; v <= posCeil; v += posStep) ticks.push(v);
            for (let v = -negStep; v >= negFloor; v -= negStep) ticks.push(v);
            ticks.sort((a, b) => a - b);

            // Thin bars: cap width, center within slot
            const slotW = chartW / n;
            const barW = Math.min(12, Math.max(3, slotW * 0.45));

            return (
              <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="EPS growth history chart" style={{ display: "block", marginTop: "6px", marginBottom: "4px" }}>
                {/* Y-axis line */}
                <line x1={padL} y1={padTop} x2={padL} y2={H - padBot}
                  stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" />

                {/* X-axis line (at zero) */}
                <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY}
                  stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />

{/* Y-axis label */}
                <text x={10} y={(padTop + H - padBot) / 2} textAnchor="middle"
                  fill="rgba(255,255,255,0.25)"
                  style={{ fontSize: "6px", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.05em" }}
                  transform={`rotate(-90, 10, ${(padTop + H - padBot) / 2})`}
                >EPS Growth %</text>

                {/* X-axis label */}
                <text x={(padL + W - padR) / 2} y={H - 1} textAnchor="middle"
                  fill="rgba(255,255,255,0.25)"
                  style={{ fontSize: "6px", fontFamily: "'Space Grotesk', sans-serif", letterSpacing: "0.05em" }}
                >Year</text>

                {/* Bars */}
                {chartData.map((d, i) => {
                  const slotX = padL + i * slotW;
                  const cx = slotX + slotW / 2;
                  const x = cx - barW / 2;
                  const pct = d.growth * 100;
                  const barTop = valToY(pct);
                  const barH = Math.abs(barTop - zeroY);
                  const isPos = d.growth >= 0;
                  const color = isPos ? "#10d97e" : "#ff4136";
                  const y = isPos ? barTop : zeroY;
                  const pctLabel = pct.toFixed(0);
                  const yearLabel = d.year.length === 4 ? "'" + d.year.slice(2) : d.year;

                  return (
                    <g key={d.year + i}>
                      <rect x={x} y={y} width={barW} height={Math.max(barH, 0.5)}
                        fill={color} rx="1" opacity="0.85" />
                      {/* Percentage label */}
                      <text
                        x={cx}
                        y={isPos ? y - 3 : y + barH + 8}
                        textAnchor="middle"
                        fill={color}
                        style={{ fontSize: "7px", fontFamily: "'JetBrains Mono', monospace" }}
                      >{pctLabel}%</text>
                      {/* Year label on X-axis */}
                      <text
                        x={cx}
                        y={H - padBot + 12}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.3)"
                        style={{ fontSize: "7px", fontFamily: "'Space Grotesk', sans-serif" }}
                      >{yearLabel}</text>
                    </g>
                  );
                })}
              </svg>
            );
          })()}
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
