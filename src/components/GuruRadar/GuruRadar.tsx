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
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontFamily: C.mono, color: C.accent, fontSize: 14, letterSpacing: "0.05em", fontWeight: 700 }}>
          Guru Radar
        </span>
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

      {/* Bottom: horizontal bar chart — last 3 on desktop, all 9 on mobile */}
      <div className="rsp-guru-badges-bottom" style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 5 }}>
        {gurus.map((guru, i) => {
          const barColor = guru.verdict === "Yes" ? "#10d97e" : guru.verdict === "Maybe" ? "#5aad82" : "#444";
          const pct = `${(guru.score / 10) * 100}%`;
          return (
            <div
              key={guru.name}
              className={i < 6 ? "rsp-guru-badge-desktop-only" : undefined}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
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
