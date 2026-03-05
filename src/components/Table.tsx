import { VERDICT } from "../lib/constants.ts";
import { f } from "../lib/utils.ts";
import type { TUPResult } from "../lib/types.ts";

interface TableProps {
  result: TUPResult | null;
}

export function Table({ result }: TableProps) {
  if (!result?.rows) return null;
  const hitColor = VERDICT[result.verdict]?.color || "#00BFA5";
  const show = result.rows.filter((_, i) => i < Math.max(15, (result.payback || 15) + 2));

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <thead>
          <tr>
            {["Year", "Annual EPS", "Cumulative EPS", "Remaining"].map(h => (
              <th key={h} style={{
                padding: "8px 12px",
                fontSize: "9px",
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#888888",
                textAlign: h === "Year" ? "left" : "right",
                borderBottom: "2px solid rgba(255,255,255,0.08)",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {show.map(r => {
            const hit  = r.year === result.payback;
            const past = result.payback != null && r.year > result.payback;
            const pre  = r.year < result.startYr;
            return (
              <tr key={r.year} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", opacity: past ? 0.3 : pre ? 0.4 : 1 }}>
                <td style={{ padding: "8px 12px", fontFamily: "'JetBrains Mono', monospace", color: hit ? hitColor : "#e8e4dc" }}>
                  {String(r.year).padStart(2, "0")}
                  {hit && <span style={{ marginLeft: "8px", fontSize: "9px", color: hitColor, fontWeight: 700, letterSpacing: "0.1em" }}>← PAYBACK</span>}
                  {pre && <span style={{ marginLeft: "8px", fontSize: "9px", color: "#505050" }}>pre-profit</span>}
                </td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: "#888888" }}>${f(r.annual)}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: hit ? hitColor : "#00BFA5" }}>${f(r.cum)}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: "#888888" }}>{r.remaining > 0 ? `$${f(r.remaining)}` : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
