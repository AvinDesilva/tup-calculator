import { C } from "../../lib/theme.ts";
import type { GuruRadarProps } from "./GuruRadar.types.ts";
import { RadarChartPanel } from "./RadarChartPanel.tsx";
import { GuruBadge } from "./GuruBadge.tsx";

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
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.text3 }}>
          Guru Radar
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: adviceColor, fontWeight: 700 }}>{advice}</span>
          <span style={{ fontSize: 11, color: C.text3 }}>{overallScore}/100</span>
        </div>
      </div>

      {/* Desktop: chart + badges side-by-side ring layout */}
      <div className="rsp-guru-ring" style={{ position: "relative", display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Left column badges (3) */}
        <div className="rsp-guru-badges-side" style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 20 }}>
          {gurus.slice(0, 3).map(guru => (
            <GuruBadge key={guru.name} guru={guru} />
          ))}
        </div>

        {/* Center: chart + advice overlay */}
        <div style={{ flex: "1 1 0", minWidth: 0, position: "relative" }}>
          <RadarChartPanel radar={radar} />
          {/* Center overlay label */}
          <div style={{
            position: "absolute",
            bottom: "28%",
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: adviceColor, whiteSpace: "nowrap" }}>
              {advice}
            </div>
            <div style={{ fontSize: 11, color: C.text3 }}>{overallScore}/100</div>
          </div>
        </div>

        {/* Right column badges (3) */}
        <div className="rsp-guru-badges-side" style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 20 }}>
          {gurus.slice(3, 6).map(guru => (
            <GuruBadge key={guru.name} guru={guru} />
          ))}
        </div>
      </div>

      {/* Bottom row: last 3 on desktop, all 9 on mobile (side badges hidden via CSS) */}
      <div className="rsp-guru-badges-bottom" style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        {gurus.map((guru, i) => (
          <GuruBadge
            key={guru.name}
            guru={guru}
            className={i < 6 ? "rsp-guru-badge-desktop-only" : undefined}
          />
        ))}
      </div>
    </div>
  );
}
