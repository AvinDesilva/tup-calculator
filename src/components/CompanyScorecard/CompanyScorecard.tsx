import { useState } from "react";
import { LC_CURVE, LC_ZONES, STAGE_META } from "../../lib/constants.ts";
import { classifyLifecycle, lifecycleDotX, lifecycleRevGrowth } from "../../lib/companyScorecard/lifecycle.ts";
import { crPath, sampleCR, findTForX } from "./CompanyScorecard.helpers.ts";
import type { CompanyScorecardProps } from "./CompanyScorecard.types.ts";

export function CompanyScorecard({ incomeHistory, description, dividendYield }: CompanyScorecardProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const body  = "'Space Grotesk', sans-serif";
  const label9 = { fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#888", fontFamily: body };

  // ── Business Lifecycle S-Curve (multi-factor — Damodaran framework) ──────
  const inc       = incomeHistory || [];
  const lcSignals = {
    revenueHistory: inc.map(y => y.revenue || 0),
    netIncome: inc[0]?.netIncome || 0,
    operatingIncome: inc[0]?.operatingIncome || 0,
    dividendYield,
  };
  const revGrowth    = lifecycleRevGrowth(lcSignals.revenueHistory);
  const currentStage = classifyLifecycle(lcSignals);
  const dotTx        = lifecycleDotX(lcSignals);
  const hasLifecycle = revGrowth !== null;
  if (!hasLifecycle && !description) return null;

  // SVG geometry
  const W = 310, H = 148, PL = 30, PR = 12, PT = 14, PB = 44;
  const plotW = W - PL - PR, plotH = H - PT - PB;

  const svgPts    = LC_CURVE.map(([tx, ty]): [number, number] => [PL + tx * plotW, PT + ty * plotH]);
  const pathD     = crPath(svgPts);
  const dividerXs = [1/6, 2/6, 3/6, 4/6, 5/6].map(t => PL + t * plotW);

  let dotX: number | null = null, dotY: number | null = null, dotColor: string | null = null;
  if (dotTx !== null) {
    const targetX  = PL + dotTx * plotW;
    const t        = findTForX(svgPts, targetX);
    const [dx, dy] = sampleCR(svgPts, t);
    dotX     = dx;
    dotY     = dy;
    dotColor = (currentStage && STAGE_META[currentStage]?.color) || "#C4A06E";
  }

  return (
    <div>
      {description && (
        <div style={{ marginBottom: "16px" }}>
          <div style={label9}>Company Description</div>
          <p style={{
            fontSize: "12px", color: "#aaa", lineHeight: 1.7, margin: "8px 0 0", fontFamily: body,
            ...(!descExpanded ? {
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            } : {}),
          }}>
            {description}
          </p>
          <button
            onClick={() => setDescExpanded(e => !e)}
            aria-expanded={descExpanded}
            style={{
              background: "none", border: "none", padding: 0, marginTop: "4px",
              color: "#C4A06E", fontSize: "11px", fontFamily: body, cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            {descExpanded ? "hide description" : "explain more..."}
          </button>
        </div>
      )}

      {hasLifecycle && (
        <div>
          <div style={label9}>Business Lifecycle</div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
            <svg width="65%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Business lifecycle S-curve. Current stage: ${currentStage || "unknown"}`} style={{ display: "block", overflow: "visible", flexShrink: 0 }}>
              <line x1={PL} y1={PT} x2={PL} y2={PT + plotH} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
              <line x1={PL} y1={PT + plotH} x2={PL + plotW} y2={PT + plotH} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
              <text
                x={PL - 8} y={PT + plotH / 2}
                textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily={body}
                transform={`rotate(-90, ${PL - 8}, ${PT + plotH / 2})`}
              >Sales</text>
              {dividerXs.map((x, i) => (
                <line key={i} x1={x} y1={PT} x2={x} y2={PT + plotH}
                  stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4,4" />
              ))}
              <path d={pathD} fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              {LC_ZONES.map(z => {
                const zx = PL + z.center * plotW;
                const isActive = z.key === currentStage;
                return (
                  <text key={z.key} x={zx} y={PT + plotH + 16} textAnchor="middle"
                    fill={isActive ? STAGE_META[z.key].color : "rgba(255,255,255,0.28)"}
                    fontSize="8" fontFamily={body} fontWeight={isActive ? "700" : "400"}
                  >{z.label}</text>
                );
              })}
              {dotX != null && dotY != null && (
                <g>
                  <circle cx={dotX} cy={dotY} r="9" fill="none" stroke={dotColor ?? undefined} strokeWidth="1" opacity="0.3" />
                  <circle cx={dotX} cy={dotY} r="5.5" fill={dotColor ?? undefined} stroke="#080808" strokeWidth="1.5" />
                </g>
              )}
            </svg>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignSelf: "flex-start", marginTop: "24px" }}>
              {LC_ZONES.map(z => {
                const isActive = z.key === currentStage;
                return (
                  <div key={z.key} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                      width: isActive ? "11px" : "9px", height: isActive ? "11px" : "9px",
                      borderRadius: "50%", background: STAGE_META[z.key].color,
                      opacity: isActive ? 1 : 0.35,
                      boxShadow: isActive ? `0 0 6px ${STAGE_META[z.key].color}` : "none",
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: "15px", fontFamily: body, color: isActive ? STAGE_META[z.key].color : "#555", fontWeight: isActive ? 700 : 400, whiteSpace: "nowrap", lineHeight: 1 }}>
                      {z.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
