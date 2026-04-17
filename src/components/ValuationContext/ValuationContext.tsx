import { useState } from "react";
import { Panel } from "./Panel.tsx";
import { RadarChartPanel } from "../GuruRadar/RadarChartPanel.tsx";
import type { ValuationContextProps, PanelData } from "./ValuationContext.types.ts";
import type { RadarMetricPoint } from "../../lib/guruRadar/types.ts";
import { C } from "../../lib/theme.ts";

function r(radar: RadarMetricPoint[], axis: string): string {
  return radar.find(p => p.axis === axis)?.rawLabel ?? "N/A";
}

function getGuruReasoning(name: string, radar: RadarMetricPoint[]): string {
  switch (name) {
    case "Buffett":
      return `Looks for durable moats via profitability and FCF. Op margin ${r(radar, "Op Margin")}, gross margin ${r(radar, "Gross Margin")}, ROE ${r(radar, "ROE")}, FCF yield ${r(radar, "FCF Yield")}, Piotroski ${r(radar, "Piotroski")}.`;
    case "Lynch":
      return `GARP — growth at a reasonable price. EPS growth ${r(radar, "EPS Growth")}, P/E ${r(radar, "Value (P/E)")}, revenue growth ${r(radar, "Rev Growth")}, net margin ${r(radar, "Net Margin")}.`;
    case "Fisher":
      return `Quality growth franchise. Revenue growth ${r(radar, "Rev Growth")}, EPS growth ${r(radar, "EPS Growth")}, gross margin ${r(radar, "Gross Margin")}, ROE ${r(radar, "ROE")}, FCF margin ${r(radar, "FCF Margin")}.`;
    case "Greenblatt":
      return `Magic Formula: earnings yield × return on capital. P/E ${r(radar, "Value (P/E)")}, op margin ${r(radar, "Op Margin")}, ROA ${r(radar, "ROA")}, ROE ${r(radar, "ROE")}.`;
    case "Graham":
      return `Deep value with margin of safety. P/E ${r(radar, "Value (P/E)")}, current ratio ${r(radar, "Current Ratio")}, D/E ${r(radar, "Low D/E")}, Piotroski ${r(radar, "Piotroski")}, net margin ${r(radar, "Net Margin")}.`;
    case "Templeton":
      return `Contrarian global value. P/E ${r(radar, "Value (P/E)")}, net margin ${r(radar, "Net Margin")}, revenue growth ${r(radar, "Rev Growth")}, ROE ${r(radar, "ROE")}, D/E ${r(radar, "Low D/E")}.`;
    case "Soros":
      return `Momentum and reflexivity. Revenue growth ${r(radar, "Rev Growth")}, EPS growth ${r(radar, "EPS Growth")}, ROE ${r(radar, "ROE")}, op margin ${r(radar, "Op Margin")}, FCF margin ${r(radar, "FCF Margin")}.`;
    case "Dalio":
      return `All-Weather balance of risk. Beta ${r(radar, "Low Beta")}, D/E ${r(radar, "Low D/E")}, current ratio ${r(radar, "Current Ratio")}, Piotroski ${r(radar, "Piotroski")}, FCF margin ${r(radar, "FCF Margin")}.`;
    case "Munger":
      return `Quality business at a fair price. Gross margin ${r(radar, "Gross Margin")}, ROE ${r(radar, "ROE")}, op margin ${r(radar, "Op Margin")}, FCF margin ${r(radar, "FCF Margin")}, Piotroski ${r(radar, "Piotroski")}.`;
    default:
      return "";
  }
}

const ADVICE_COLOR: Record<string, string> = {
  "Strong Buy":            "#10d97e",
  "Accumulate / Buy":      "#4a90d9",
  "Accumulate / Weak Buy": "#7ab8f0",
  "Hold":                  "#f5a020",
  "Reduce / Weak Sell":    "#f06060",
  "Sell":                  "#e03030",
  "Strong Sell":           "#c02020",
};

const subLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: C.text3,
  marginBottom: 12,
};

const dividerH = <div style={{ background: C.borderWeak, height: "1px", margin: "20px 0" }} />;

export function ValuationContext({ strongBuyPrice, buyPrice, currentPrice, adjPrice, industryGrowth, industryGrowthLoading = false, companyBlendedGrowth, priceMode = "adj", guruData }: ValuationContextProps) {
  const mono = C.mono;

  const hasStrongBuy = strongBuyPrice != null && strongBuyPrice > 0 && currentPrice > 0;
  const hasBuy       = buyPrice != null && buyPrice > 0 && currentPrice > 0;
  const hasGuru      = guruData != null;

  const [activeGuru, setActiveGuru] = useState<string | null>(null);

  if (!hasStrongBuy && !hasBuy && !hasGuru) return null;

  const sbBelow  = hasStrongBuy && currentPrice > (strongBuyPrice as number);
  const sbColor  = sbBelow ? "#10d97e" : "#f5a020";
  const buyBelow = hasBuy && currentPrice <= (buyPrice as number);
  const buyColor = buyBelow ? "#10d97e" : "#f5a020";

  const refPrice  = priceMode === "listed" ? currentPrice : adjPrice;
  const hasRef    = refPrice != null && refPrice > 0;
  const diffLabel = priceMode === "listed" ? "vs listed price" : "vs adj. price";
  const fmtDiff   = (pct: number) => `${pct > 0 ? "+" : ""}${pct.toFixed(1)}% ${diffLabel}`;

  const sbDiffPct  = hasStrongBuy && hasRef ? (((strongBuyPrice as number) - (refPrice as number)) / (refPrice as number)) * 100 : null;
  const buyDiffPct = hasBuy && hasRef       ? (((buyPrice as number)       - (refPrice as number)) / (refPrice as number)) * 100 : null;

  const sbPanel: PanelData | null = hasStrongBuy ? {
    key: "strongbuy", title: "Strong Buy Below",
    value: `$${(strongBuyPrice as number).toFixed(2)}`,
    icon: sbBelow ? "▲▲" : null, color: sbColor,
    sub: sbDiffPct != null ? fmtDiff(sbDiffPct) : "",
  } : null;

  const buyPanel: PanelData | null = hasBuy ? {
    key: "buy", title: "Patient Buy Below",
    value: `$${(buyPrice as number).toFixed(2)}`,
    icon: buyBelow ? "▲" : null, color: buyColor,
    sub: buyDiffPct != null ? fmtDiff(buyDiffPct) : "",
  } : null;

  const panels = [sbPanel, buyPanel].filter((p): p is PanelData => p != null);
  const dividerV = <div style={{ background: C.borderWeak, width: "1px" }} />;

  // Guru radar colors
  const avgGuruScore = hasGuru
    ? guruData!.gurus.reduce((s, g) => s + g.score, 0) / guruData!.gurus.length
    : 0;
  const radarColor = avgGuruScore >= 8 ? "#10d97e" : avgGuruScore >= 4 ? "#f5a020" : "#e03030";
  const adviceColor = hasGuru ? (ADVICE_COLOR[guruData!.advice] ?? C.text2) : C.text2;

  // Industry growth (used in igNote below guru section — kept for layout reference only, removed from panels)
  void industryGrowth; void industryGrowthLoading; void companyBlendedGrowth;

  return (
    <div style={{ paddingTop: "8px" }}>
      <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888", marginBottom: "10px" }}>
        Valuation Context
      </div>

      {/* Price target panels */}
      {panels.length > 0 && (
        <>
          <div style={subLabel}>Price Targets</div>
          <div className="rsp-valuation-grid" style={{ display: "grid", gridTemplateColumns: panels.length === 2 ? "1fr 1px 1fr" : "1fr", gap: 0 }}>
            {panels.length === 2 ? (<>
              <div style={{ paddingBottom: "14px" }}><Panel p={panels[0]} mono={mono} /></div>
              {dividerV}
              <div style={{ paddingLeft: "14px", paddingBottom: "14px" }}><Panel p={panels[1]} mono={mono} /></div>
            </>) : (
              <div style={{ paddingBottom: "14px", gridColumn: "1 / -1" }}><Panel p={panels[0]} mono={mono} /></div>
            )}
          </div>
        </>
      )}

      {/* Guru radar */}
      {hasGuru && (<>
        {panels.length > 0 && dividerH}

        {/* Radar chart */}
        <div style={subLabel}>Financial Health</div>
        <div style={{ position: "relative" }}>
          <RadarChartPanel radar={guruData!.radar} color={radarColor} />
          <div style={{
            position: "absolute",
            bottom: "28%",
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            pointerEvents: "none",
            padding: "7px 12px",
            border: `1px solid ${adviceColor}33`,
            background: "#080808cc",
            whiteSpace: "nowrap",
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: adviceColor }}>{guruData!.advice}</div>
            <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{guruData!.overallScore}/100</div>
          </div>
        </div>

        {dividerH}

        {/* Bar chart */}
        <div style={subLabel}>Guru Scores</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {guruData!.gurus.map(guru => {
            const barColor = guru.score >= 8 ? "#10d97e" : guru.score >= 4 ? "#f5a020" : "#e03030";
            const pct = `${(guru.score / 10) * 100}%`;
            const isActive = activeGuru === guru.name;
            return (
              <div key={guru.name}>
                <div
                  role="button"
                  tabIndex={0}
                  style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                  onMouseEnter={() => setActiveGuru(guru.name)}
                  onMouseLeave={() => setActiveGuru(null)}
                  onClick={() => setActiveGuru(isActive ? null : guru.name)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setActiveGuru(isActive ? null : guru.name); }}
                >
                  <span style={{ width: 72, fontSize: 10, color: isActive ? C.text1 : C.text2, fontFamily: C.mono, flexShrink: 0, textAlign: "right", transition: "color 0.15s" }}>
                    {guru.name}
                  </span>
                  <div style={{ flex: "1 1 0", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: pct, height: "100%", background: barColor, borderRadius: 3, transition: "width 0.4s ease" }} />
                  </div>
                  <span style={{ width: 28, fontSize: 10, color: barColor, fontFamily: C.mono, flexShrink: 0, textAlign: "left" }}>
                    {guru.score}/10
                  </span>
                </div>
                {isActive && (
                  <div style={{
                    marginTop: 4,
                    marginLeft: 80,
                    marginRight: 36,
                    padding: "7px 10px",
                    border: `1px solid ${barColor}33`,
                    background: `${barColor}0d`,
                    fontSize: 10,
                    color: C.text2,
                    lineHeight: 1.5,
                  }}>
                    {getGuruReasoning(guru.name, guruData!.radar)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>)}
    </div>
  );
}
