import type { PanelData } from "./ValuationContext.types.ts";

export function Panel({ p, mono }: { p: PanelData; mono: string }) {
  return (
    <div className="rsp-val-panel" style={{ padding: "0", textAlign: "center" }}>
      <div className="rsp-val-title" style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: "#555", marginBottom: "6px" }}>
        {p.title}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px", justifyContent: "center" }}>
        <span style={{ fontFamily: mono, fontSize: "20px", fontWeight: 600, color: p.color, letterSpacing: "-0.02em" }}>
          {p.value}
        </span>
        {p.icon && (
          <span style={{ fontFamily: mono, fontSize: "14px", fontWeight: 700, color: p.color }}>{p.icon}</span>
        )}
      </div>
      <div style={{ fontSize: "11px", color: "#888", marginTop: "4px", letterSpacing: "0.06em" }}>
        {p.sub}
      </div>
    </div>
  );
}
