import { useState } from "react";
import { LC_CURVE, LC_ZONES, STAGE_META } from "../lib/constants.ts";
import type { FMPEarningSurprise, FMPIncomeStatement, FMPCashFlow, FMPGradesConsensus, LifecycleStage } from "../lib/types.ts";
import { AnalystScorecard } from "./AnalystScorecard.tsx";

// ─── Catmull-Rom spline helpers ───────────────────────────────────────────────

function crPath(pts: [number, number][]): string {
  let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i];
    const p2 = pts[i + 1],              p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6, cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6, cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

function sampleCR(pts: [number, number][], t: number): [number, number] {
  const n   = pts.length - 1;
  const seg = Math.min(Math.floor(t * n), n - 1);
  const lt  = t * n - seg, lt2 = lt * lt, lt3 = lt2 * lt;
  const p0  = pts[Math.max(0, seg - 1)], p1 = pts[seg];
  const p2  = pts[seg + 1],              p3 = pts[Math.min(n, seg + 2)];
  return [
    0.5 * ((2*p1[0]) + (-p0[0]+p2[0])*lt + (2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*lt2 + (-p0[0]+3*p1[0]-3*p2[0]+p3[0])*lt3),
    0.5 * ((2*p1[1]) + (-p0[1]+p2[1])*lt + (2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*lt2 + (-p0[1]+3*p1[1]-3*p2[1]+p3[1])*lt3),
  ];
}

function findTForX(pts: [number, number][], targetX: number): number {
  let lo = 0, hi = 1;
  for (let i = 0; i < 52; i++) {
    const mid = (lo + hi) / 2;
    if (sampleCR(pts, mid)[0] < targetX) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ─── Lifecycle classification ─────────────────────────────────────────────────

function revenueStage(revenueGrowthPct: number, isProfit: boolean): LifecycleStage {
  if (!isProfit && revenueGrowthPct > 15) return "intro";
  if (revenueGrowthPct > 15)  return "growth";
  if (revenueGrowthPct >= 0)  return "maturity";
  return "decline";
}

function growthToDotX(revenueGrowthPct: number, isProfit: boolean): number {
  if (!isProfit && revenueGrowthPct > 15) return 0.12;
  if (revenueGrowthPct > 60)  return 0.30;
  if (revenueGrowthPct > 35)  return 0.37;
  if (revenueGrowthPct > 20)  return 0.42;
  if (revenueGrowthPct > 12)  return 0.50;
  if (revenueGrowthPct > 5)   return 0.60;
  if (revenueGrowthPct >= 0)  return 0.68;
  if (revenueGrowthPct > -10) return 0.80;
  if (revenueGrowthPct > -20) return 0.87;
  return 0.93;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CompanyScorecardProps {
  earnings: FMPEarningSurprise[];
  cashFlows?: FMPCashFlow[];
  incomeHistory: FMPIncomeStatement[];
  description?: string;
  grades?: FMPGradesConsensus | null;
  estimateSpread?: { epsLow: number; epsAvg: number; epsHigh: number; numAnalysts: number } | null;
  forwardEPS?: number;
  lifecycleOnly?: boolean;
}

interface ProcessedQuarter {
  status: "beat" | "miss" | "inline";
  pct: number;
  date: string | undefined;
}

export function CompanyScorecard({ earnings, incomeHistory, description, grades, estimateSpread, forwardEPS, lifecycleOnly }: CompanyScorecardProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const body  = "'Space Grotesk', sans-serif";
  const mono  = "'JetBrains Mono', monospace";
  const label9 = { fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#888", fontFamily: body };

  // ── Analyst Scorecard ──────────────────────────────────────────────────────
  const quarters  = (earnings || []).slice(0, 12);
  const processed = quarters.map(q => {
    const actual    = q.actualEarningResult ?? q.actualEps ?? null;
    const estimated = q.estimatedEarning    ?? q.estimatedEps ?? null;
    if (actual == null || estimated == null || Math.abs(estimated) < 0.001) return null;
    const pct    = ((actual - estimated) / Math.abs(estimated)) * 100;
    const status: "beat" | "miss" | "inline" = Math.abs(pct) <= 1 ? "inline" : pct > 0 ? "beat" : "miss";
    return { status, pct, date: q.date };
  }).filter((q): q is ProcessedQuarter => q !== null).reverse();

  const total    = processed.length;
  const beats    = processed.filter(q => q.status === "beat").length;
  const beatRate = total > 0 ? (beats / total) * 100 : null;
  const avgSurp  = total > 0 ? processed.reduce((s, q) => s + q.pct, 0) / total : null;
  const sqColor: Record<string, string>  = { beat: "#10d97e", miss: "#FF4D00", inline: "#444" };
  const sqLabel: Record<string, string>  = { beat: "Beat", miss: "Miss", inline: "In-line" };

  // ── Business Lifecycle S-Curve ─────────────────────────────────────────────
  const inc       = incomeHistory || [];
  const rev0      = inc[0]?.revenue || 0;
  const rev1      = inc[1]?.revenue || 0;
  const revGrowth = rev1 > 0 ? ((rev0 - rev1) / rev1) * 100 : null;
  const isProfit  = (inc[0]?.netIncome || 0) > 0;

  const currentStage = revGrowth !== null ? revenueStage(revGrowth, isProfit) : null;
  const dotTx        = revGrowth !== null ? growthToDotX(revGrowth, isProfit) : null;
  const hasEarnings  = processed.length > 0;
  const hasLifecycle = revGrowth !== null;
  if (lifecycleOnly) {
    if (!hasLifecycle && !description) return null;
  } else {
    if (!hasEarnings && !hasLifecycle) return null;
  }

  // SVG geometry
  const W = 310, H = 148, PL = 30, PR = 12, PT = 14, PB = 44;
  const plotW = W - PL - PR, plotH = H - PT - PB;

  const svgPts    = LC_CURVE.map(([tx, ty]): [number, number] => [PL + tx * plotW, PT + ty * plotH]);
  const pathD     = crPath(svgPts);
  const dividerXs = [0.25, 0.50, 0.75].map(t => PL + t * plotW);

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
    <div style={{ marginTop: lifecycleOnly ? "12px" : "16px", borderTop: lifecycleOnly ? "none" : "1px solid rgba(255,255,255,0.06)", paddingTop: lifecycleOnly ? "0" : "14px" }}>
      {description && (
        <div style={{ marginBottom: "16px" }}>
          <div style={label9}>Company Description</div>
          <p style={{
            fontSize: "12px", color: "#aaa", lineHeight: 1.7, margin: "8px 0 0", fontFamily: body,
            ...(!descExpanded ? {
              display: "-webkit-box",
              WebkitLineClamp: lifecycleOnly ? 2 : 4,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            } : {}),
          }}>
            {description}
          </p>
          <button
            onClick={() => setDescExpanded(e => !e)}
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

      {!lifecycleOnly && (<>
      <div style={{ display: "grid", gridTemplateColumns: hasEarnings && hasLifecycle ? "1fr 1px 1fr" : "1fr", gap: "0", marginTop: "0" }}>

        {/* Panel A: Analyst Scorecard */}
        {hasEarnings && (
          <div style={{ paddingRight: hasLifecycle ? "16px" : "0" }}>
            <div style={label9}>Analyst Scorecard</div>

            <div style={{ display: "flex", gap: "20px", marginTop: "8px", marginBottom: "10px" }}>
              <div>
                <div style={{ fontFamily: mono, fontSize: "22px", fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em", color: (beatRate ?? 0) >= 70 ? "#10d97e" : (beatRate ?? 0) >= 50 ? "#f5a020" : "#FF4D00" }}>
                  {beatRate != null ? `${beatRate.toFixed(0)}%` : "—"}
                </div>
                <div style={{ fontSize: "9px", color: "#888", marginTop: "3px", fontFamily: body }}>Beat Rate</div>
              </div>
              <div>
                <div style={{ fontFamily: mono, fontSize: "22px", fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em", color: (avgSurp ?? 0) > 0 ? "#10d97e" : "#FF4D00" }}>
                  {avgSurp != null ? `${avgSurp > 0 ? "+" : ""}${avgSurp.toFixed(1)}%` : "—"}
                </div>
                <div style={{ fontSize: "9px", color: "#888", marginTop: "3px", fontFamily: body }}>Avg Surprise</div>
              </div>
              <div>
                <div style={{ fontFamily: mono, fontSize: "22px", fontWeight: 600, lineHeight: 1, letterSpacing: "-0.02em", color: "#e8e4dc" }}>{total}</div>
                <div style={{ fontSize: "9px", color: "#888", marginTop: "3px", fontFamily: body }}>Quarters</div>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {processed.map((q, i) => (
                <div key={i} title={`${q.date} · ${sqLabel[q.status]} · ${q.pct > 0 ? "+" : ""}${q.pct.toFixed(1)}%`}
                  style={{ width: "18px", height: "18px", borderRadius: "3px", flexShrink: 0, background: sqColor[q.status], opacity: q.status === "inline" ? 0.45 : 1 }} />
              ))}
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              {(["beat", "miss", "inline"] as const).map(k => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: sqColor[k], opacity: k === "inline" ? 0.45 : 1 }} />
                  <span style={{ fontSize: "9px", color: "#888", fontFamily: body }}>{sqLabel[k]}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        {hasEarnings && hasLifecycle && (
          <div style={{ background: "rgba(255,255,255,0.06)", width: "1px", margin: "0 16px" }} />
        )}

        {/* Panel B: Business Lifecycle S-Curve */}
        {hasLifecycle && (
          <div>
            <div style={label9}>Business Lifecycle</div>

            <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", marginTop: "8px", overflow: "visible" }}>
              {/* Axes */}
              <line x1={PL} y1={PT} x2={PL} y2={PT + plotH} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
              <line x1={PL} y1={PT + plotH} x2={PL + plotW} y2={PT + plotH} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />

              {/* Y-axis label */}
              <text
                x={PL - 8} y={PT + plotH / 2}
                textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily={body}
                transform={`rotate(-90, ${PL - 8}, ${PT + plotH / 2})`}
              >Sales</text>

              {/* Zone dashed dividers */}
              {dividerXs.map((x, i) => (
                <line key={i} x1={x} y1={PT} x2={x} y2={PT + plotH}
                  stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeDasharray="4,4" />
              ))}

              {/* S-curve */}
              <path d={pathD} fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

              {/* Zone labels */}
              {LC_ZONES.map(z => {
                const zx       = PL + z.center * plotW;
                const isActive = z.key === currentStage;
                return (
                  <text key={z.key} x={zx} y={PT + plotH + 16} textAnchor="middle"
                    fill={isActive ? STAGE_META[z.key].color : "rgba(255,255,255,0.28)"}
                    fontSize="8" fontFamily={body}
                    fontWeight={isActive ? "700" : "400"}
                  >{z.label}</text>
                );
              })}

              {/* Current position dot */}
              {dotX != null && dotY != null && (
                <g>
                  <circle cx={dotX} cy={dotY} r="9" fill="none" stroke={dotColor ?? undefined} strokeWidth="1" opacity="0.3" />
                  <circle cx={dotX} cy={dotY} r="5.5" fill={dotColor ?? undefined} stroke="#080808" strokeWidth="1.5" />
                </g>
              )}
            </svg>

            {/* Centered stage legend */}
            <div style={{ display: "flex", justifyContent: "center", gap: "14px", marginTop: "6px", flexWrap: "wrap" }}>
              {LC_ZONES.map(z => {
                const isActive = z.key === currentStage;
                return (
                  <div key={z.key} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                    <div style={{
                      width: isActive ? "9px" : "7px", height: isActive ? "9px" : "7px",
                      borderRadius: "50%", background: STAGE_META[z.key].color,
                      opacity: isActive ? 1 : 0.35,
                      boxShadow: isActive ? `0 0 6px ${STAGE_META[z.key].color}` : "none",
                    }} />
                    <span style={{ fontSize: "9px", fontFamily: body, color: isActive ? STAGE_META[z.key].color : "#555", fontWeight: isActive ? 700 : 400 }}>
                      {z.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <AnalystScorecard
        grades={grades ?? null}
        earnings={earnings}
        estimateSpread={estimateSpread ?? null}
        forwardEPS={forwardEPS ?? 0}
      />
      </>)}

      {/* Lifecycle-only mode: just the S-curve */}
      {lifecycleOnly && hasLifecycle && (
        <div>
          <div style={label9}>Business Lifecycle</div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
            <svg width="65%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", overflow: "visible", flexShrink: 0 }}>
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
