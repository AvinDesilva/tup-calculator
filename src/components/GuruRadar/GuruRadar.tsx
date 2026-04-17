import { useState } from "react";
import { C } from "../../lib/theme.ts";
import type { GuruRadarProps } from "./GuruRadar.types.ts";
import { RadarChartPanel } from "./RadarChartPanel.tsx";
import type { RadarMetricPoint } from "../../lib/guruRadar/types.ts";

const ADVICE_COLOR: Record<string, string> = {
  "Strong Buy":           "#10d97e",
  "Accumulate / Buy":     "#4a90d9",
  "Accumulate / Weak Buy":"#7ab8f0",
  "Hold":                 "#f5a020",
  "Reduce / Weak Sell":   "#f06060",
  "Sell":                 "#e03030",
  "Strong Sell":          "#c02020",
};

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

export function GuruRadar({ data }: GuruRadarProps) {
  const { radar, gurus, overallScore, advice } = data;
  const adviceColor = ADVICE_COLOR[advice] ?? C.text2;
  const avgGuruScore = gurus.reduce((s, g) => s + g.score, 0) / gurus.length;
  const radarColor = avgGuruScore >= 8 ? "#10d97e" : avgGuruScore >= 4 ? "#f5a020" : "#e03030";

  const [activeGuru, setActiveGuru] = useState<string | null>(null);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontFamily: C.mono, color: C.text2, fontSize: 14, letterSpacing: "0.05em", fontWeight: 700 }}>
          Guru Radar
        </span>
      </div>

      {/* Chart */}
      <div style={{ position: "relative" }}>
        <RadarChartPanel radar={radar} color={radarColor} />
        {/* Center overlay label */}
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
          <div style={{ fontSize: 12, fontWeight: 700, color: adviceColor }}>
            {advice}
          </div>
          <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{overallScore}/100</div>
        </div>
      </div>

      {/* Horizontal bar chart */}
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 5 }}>
        {gurus.map(guru => {
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
                  {getGuruReasoning(guru.name, radar)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
