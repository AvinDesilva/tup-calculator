import type React from "react";

// ─── Shared style tokens ─────────────────────────────────────────────────────

export const C = {
  bg: "#080808",
  text1: "#e8e4dc",
  text2: "#888888",
  text3: "#505050",
  accent: "#C4A06E",
  accentAlt: "#00BFA5",
  borderWeak: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.12)",
  mono: "'JetBrains Mono', monospace",
  display: "'Barlow Condensed', sans-serif",
  serif: "'DM Serif Display', serif",
  body: "'Space Grotesk', system-ui, sans-serif",
};

export const inputShared: React.CSSProperties = {
  background: "transparent",
  border: "none",
  borderBottom: `1px solid ${C.borderWeak}`,
  color: C.text1,
  fontFamily: C.mono,
  fontSize: "16px",
  width: "100%",
  paddingBottom: "8px",
  boxSizing: "border-box",
};

export const toggleBtn = (active: boolean): React.CSSProperties => ({
  padding: "5px 12px",
  fontSize: "9px",
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  border: `1px solid ${active ? C.accent : C.borderWeak}`,
  background: active ? C.accent : "transparent",
  color: active ? "#080808" : C.text2,
  cursor: "pointer",
  transition: "all 0.15s",
  fontFamily: C.body,
});
