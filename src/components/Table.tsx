import { useState } from "react";
import { VERDICT } from "../lib/constants.ts";
import { f } from "../lib/utils.ts";
import type { TUPResult } from "../lib/types.ts";

interface TableProps {
  result: TUPResult | null;
  growthOverrides: Record<number, number>;
  onGrowthChange: (year: number, val: number) => void;
}

export function Table({ result, growthOverrides, onGrowthChange }: TableProps) {
  const [editingYear, setEditingYear] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");

  if (!result?.rows) return null;
  const hitColor = VERDICT[result.verdict]?.color || "#00BFA5";
  const show = result.rows.filter((_, i) => i < Math.max(15, (result.payback || 15) + 2));
  const mono = "'JetBrains Mono', monospace";

  const thStyle = (align: "left" | "right"): React.CSSProperties => ({
    padding: "8px 12px",
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    color: "#888888",
    textAlign: align,
    borderBottom: "2px solid rgba(255,255,255,0.08)",
  });

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <caption className="sr-only">Year-by-year EPS payback breakdown</caption>
        <thead>
          <tr>
            <th scope="col" style={thStyle("left")}>Year</th>
            <th scope="col" style={thStyle("right")}>Growth</th>
            <th scope="col" style={thStyle("right")}>Annual EPS</th>
            <th scope="col" style={thStyle("right")}>Cumulative EPS</th>
            <th scope="col" style={thStyle("right")}>Remaining</th>
          </tr>
        </thead>
        <tbody>
          {show.map(r => {
            const hit  = r.year === result.payback;
            const past = result.payback != null && r.year > result.payback;
            const pre  = r.year < result.startYr;
            const isOverridden = growthOverrides[r.year] !== undefined;
            const isEditing = editingYear === r.year;
            return (
              <tr key={r.year} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", opacity: past ? 0.3 : pre ? 0.4 : 1 }}>
                <td style={{ padding: "8px 12px", fontFamily: mono, color: hit ? hitColor : "#e8e4dc" }}>
                  {String(r.year).padStart(2, "0")}
                  {hit && <span style={{ marginLeft: "8px", fontSize: "9px", color: hitColor, fontWeight: 700, letterSpacing: "0.1em" }}>← PAYBACK</span>}
                  {pre && <span style={{ marginLeft: "8px", fontSize: "9px", color: "#505050" }}>pre-profit</span>}
                </td>
                <td style={{ padding: "8px 6px", textAlign: "right", fontFamily: mono }}>
                  {isEditing ? (
                    <input
                      // eslint-disable-next-line jsx-a11y/no-autofocus
                      autoFocus
                      aria-label={`Edit growth rate for year ${r.year}`}
                      value={editVal}
                      onChange={e => {
                        const s = e.target.value;
                        if (s === "" || /^-?\d*\.?\d*$/.test(s)) setEditVal(s);
                      }}
                      onBlur={() => {
                        const v = parseFloat(editVal);
                        if (!isNaN(v) && isFinite(v)) onGrowthChange(r.year, Math.max(-100, Math.min(v, 200)));
                        setEditingYear(null);
                      }}
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          const v = parseFloat(editVal);
                          if (!isNaN(v) && isFinite(v)) onGrowthChange(r.year, Math.max(-100, Math.min(v, 200)));
                          setEditingYear(null);
                        } else if (e.key === "Escape") {
                          setEditingYear(null);
                        }
                      }}
                      style={{
                        width: "52px", background: "rgba(255,255,255,0.08)", border: "1px solid #C4A06E",
                        color: "#e8e4dc", fontFamily: mono, fontSize: "11px", textAlign: "right",
                        padding: "2px 4px", borderRadius: "2px",
                      }}
                    />
                  ) : (
                    <button
                      onClick={() => { setEditingYear(r.year); setEditVal(r.growthRate.toFixed(1)); }}
                      aria-label={`Edit growth rate for year ${r.year}, currently ${r.growthRate.toFixed(1)}%`}
                      style={{
                        background: "none", border: "none", padding: "1px 2px",
                        cursor: "pointer", color: isOverridden ? "#C4A06E" : "#666",
                        borderBottom: "1px dashed rgba(255,255,255,0.12)",
                        fontFamily: mono, fontSize: "inherit",
                      }}
                    >
                      {r.growthRate.toFixed(1)}%
                    </button>
                  )}
                </td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: mono, color: "#888888" }}>${f(r.annual)}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: mono, color: hit ? hitColor : "#00BFA5" }}>${f(r.cum)}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: mono, color: "#888888" }}>{r.remaining > 0 ? `$${f(r.remaining)}` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
