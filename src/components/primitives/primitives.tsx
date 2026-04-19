import type { SectionLabelProps, DataRowProps, DerivedStatProps } from "./primitives.types.ts";

export function SectionLabel({ num, title, badge }: SectionLabelProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
      {num && <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#C4A06E", fontSize: "14px", letterSpacing: "0.05em", fontWeight: 700 }}>{num}</span>}
      <h3 style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888888", margin: 0 }}>{title}</h3>
      {badge}
      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} aria-hidden="true" />
    </div>
  );
}

export function DataRow({ label, value, accent }: DataRowProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#888888" }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 600, color: accent || "#e8e4dc" }}>{value}</span>
    </div>
  );
}

export function DerivedStat({ label, value, accent }: DerivedStatProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: "2px solid rgba(255,255,255,0.08)", paddingTop: "8px", marginTop: "8px" }}>
      <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#888888" }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 600, color: accent || "#00BFA5" }}>{value}</span>
    </div>
  );
}
