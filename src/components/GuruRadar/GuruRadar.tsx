import { C } from "../../lib/theme.ts";
import type { GuruRadarProps } from "./GuruRadar.types.ts";
import { RadarChartPanel } from "./RadarChartPanel.tsx";

const ADVICE_COLOR: Record<string, string> = {
  "Strong Buy":           "#10d97e",
  "Accumulate / Buy":     "#4a90d9",
  "Accumulate / Weak Buy":"#7ab8f0",
  "Hold":                 "#f5a020",
  "Reduce / Weak Sell":   "#f06060",
  "Sell":                 "#e03030",
  "Strong Sell":          "#c02020",
};

export function GuruRadar({ data }: GuruRadarProps) {
  const { radar, gurus, overallScore, advice } = data;
  const adviceColor = ADVICE_COLOR[advice] ?? C.text2;

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
        <RadarChartPanel radar={radar} />
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
          return (
            <div key={guru.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 72, fontSize: 10, color: C.text2, fontFamily: C.mono, flexShrink: 0, textAlign: "right" }}>
                {guru.name}
              </span>
              <div style={{ flex: "1 1 0", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: pct, height: "100%", background: barColor, borderRadius: 3, transition: "width 0.4s ease" }} />
              </div>
              <span style={{ width: 28, fontSize: 10, color: barColor, fontFamily: C.mono, flexShrink: 0, textAlign: "left" }}>
                {guru.score}/10
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
