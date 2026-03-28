import { Table } from "../../Table";
import type { YearByYearBreakdownProps } from "./YearByYearBreakdown.types.ts";

export function YearByYearBreakdown({
  decayMode, onDecayModeToggle, result, growthOverrides, onGrowthChange,
}: YearByYearBreakdownProps) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#C4A06E", fontSize: "14px", letterSpacing: "0.05em", fontWeight: 700 }}>04</span>
        <h3 style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888888", margin: 0 }}>Year-by-Year Breakdown</h3>
        <div style={{ display: "flex", gap: "0px" }}>
          <button aria-pressed={decayMode === "ff"} aria-label="Toggle fixed friction decay" onClick={() => onDecayModeToggle("ff")} style={{
            fontSize: "9px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.05em", padding: "2px 6px",
            background: decayMode === "ff" ? "rgba(196,160,110,0.2)" : "transparent",
            border: `1px solid ${decayMode === "ff" ? "#C4A06E" : "rgba(255,255,255,0.1)"}`,
            color: decayMode === "ff" ? "#C4A06E" : "#666",
            cursor: "pointer", borderRadius: "3px 0 0 3px",
          }}>FF</button>
          <button aria-pressed={decayMode === "vdr"} aria-label="Toggle variable decay rate" onClick={() => onDecayModeToggle("vdr")} style={{
            fontSize: "9px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: "0.05em", padding: "2px 6px",
            background: decayMode === "vdr" ? "rgba(196,160,110,0.2)" : "transparent",
            border: `1px solid ${decayMode === "vdr" ? "#C4A06E" : "rgba(255,255,255,0.1)"}`,
            color: decayMode === "vdr" ? "#C4A06E" : "#666",
            cursor: "pointer", borderRadius: "0 3px 3px 0", marginLeft: "-1px",
          }}>VDR</button>
        </div>
        <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
      </div>
      <Table result={result} growthOverrides={growthOverrides} onGrowthChange={onGrowthChange} />
    </div>
  );
}
