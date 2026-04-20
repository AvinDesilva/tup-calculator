import { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ReferenceDot,
  ResponsiveContainer,
} from "recharts";
import { C } from "../../lib/theme.ts";
import { LC_CURVE, LC_ZONES, STAGE_META } from "../../lib/constants.ts";
import { classifyLifecycle, lifecycleDotX, lifecycleRevGrowth } from "../../lib/companyScorecard/lifecycle.ts";
import { SectionLabel } from "../primitives";
import { useLifecycleAnimation, getLabelState } from "./useLifecycleAnimation.ts";
import type { LabelState } from "./useLifecycleAnimation.ts";
import type { CompanyScorecardProps } from "./CompanyScorecard.types.ts";

// ─── Static data derived from constants ─────────────────────────────────────

const CHART_DATA = LC_CURVE.map(([x, y]) => ({ x: x * 100, sales: (1 - y) * 100 }));
const DIVIDER_XS = [1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6].map(v => v * 100);

const DASH_STYLE =
  ".lc-graph .recharts-line-curve { stroke-dasharray: var(--lc-len); stroke-dashoffset: var(--lc-offset); }";

/** Linearly interpolate the S-curve y-value at a given x (0–1). */
function interpolateCurveY(tx: number): number {
  const targetX = tx * 100;
  let loIdx = 0;
  for (let i = 0; i < CHART_DATA.length - 1; i++) {
    if (CHART_DATA[i].x <= targetX) loIdx = i;
  }
  const lo = CHART_DATA[loIdx];
  const hi = CHART_DATA[Math.min(loIdx + 1, CHART_DATA.length - 1)];
  const t = hi.x === lo.x ? 0 : (targetX - lo.x) / (hi.x - lo.x);
  return lo.sales + t * (hi.sales - lo.sales);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CompanyScorecard({ incomeHistory, description, dividendYield }: CompanyScorecardProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Lifecycle classification ──
  const inc = incomeHistory || [];
  const lcSignals = {
    revenueHistory: inc.map(y => y.revenue || 0),
    netIncome: inc[0]?.netIncome || 0,
    operatingIncome: inc[0]?.operatingIncome || 0,
    dividendYield,
  };
  const revGrowth = lifecycleRevGrowth(lcSignals.revenueHistory);
  const currentStage = classifyLifecycle(lcSignals);
  const dotTx = lifecycleDotX(lcSignals);
  const hasLifecycle = revGrowth !== null;

  // ── Animation state (single source of truth) ──
  const { xPos, easedFraction, done, dashLen, setPathLen } = useLifecycleAnimation(hasLifecycle);

  // Measure actual SVG path length once Recharts renders it
  useEffect(() => {
    if (dashLen !== 9999) return; // already measured
    const container = containerRef.current;
    if (!container) return;
    const path = container.querySelector<SVGPathElement>(".recharts-line-curve");
    if (path) setPathLen(path.getTotalLength());
  }, [dashLen, easedFraction, setPathLen]);

  if (!hasLifecycle && !description) return null;

  // ── Dot position ──
  const dotChartX = dotTx !== null ? dotTx * 100 : null;
  const dotChartY = dotTx !== null ? interpolateCurveY(dotTx) : null;
  const dotColor = (currentStage && STAGE_META[currentStage]?.color) || "#C4A06E";

  // ── Stage description ──
  const stageDesc = buildStageDesc(currentStage, revGrowth, lcSignals);

  return (
    <div>
      {description && (
        <div style={{ marginBottom: "16px" }}>
          <SectionLabel title="Company Description" />
          <p style={{
            fontSize: "12px", color: "#aaa", lineHeight: 1.7, margin: "8px 0 0", fontFamily: C.body,
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
              color: "#C4A06E", fontSize: "11px", fontFamily: C.body, cursor: "pointer",
              letterSpacing: "0.02em",
            }}
          >
            {descExpanded ? "hide description" : "explain more..."}
          </button>
        </div>
      )}

      {hasLifecycle && (
        <div>
          <SectionLabel title="Business Lifecycle" />

          {stageDesc && (
            <p style={{ fontSize: "11px", color: "#666", fontFamily: C.body, margin: "8px 0 10px", lineHeight: 1.55 }}>
              {stageDesc}
            </p>
          )}

          <div
            ref={containerRef}
            className="lc-graph"
            role="img"
            aria-label={`Business lifecycle S-curve. Current stage: ${currentStage || "unknown"}`}
            style={{
              "--lc-len": dashLen,
              "--lc-offset": dashLen * (1 - easedFraction),
            } as React.CSSProperties}
          >
            <style>{DASH_STYLE}</style>
            <ResponsiveContainer width="100%" height={140} minWidth={0}>
              <LineChart data={CHART_DATA} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="x"
                  type="number"
                  domain={[0, 100]}
                  ticks={LC_ZONES.map(z => z.center * 100)}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  tick={(props: any) => {
                    const zone = LC_ZONES.find(z => Math.abs(z.center * 100 - (props.payload?.value ?? 0)) < 0.1);
                    if (!zone) return <g />;
                    const zoneIdx = LC_ZONES.indexOf(zone);
                    const nextCenter = LC_ZONES[zoneIdx + 1]?.center ?? null;
                    const state: LabelState = getLabelState(zone.center, nextCenter, xPos, done);
                    const isActive = zone.key === currentStage;
                    const opacity = state === "lit" ? 1 : state === "settled" ? (isActive ? 1 : 0.35) : 0.1;
                    const fontWeight = state === "lit" || (state === "settled" && isActive) ? 700 : 400;
                    return (
                      <text
                        x={props.x}
                        y={(props.y ?? 0) + 12}
                        textAnchor="middle"
                        fill={STAGE_META[zone.key].color}
                        opacity={opacity}
                        fontSize={9}
                        fontFamily={C.mono}
                        fontWeight={fontWeight}
                        style={{ transition: "opacity 0.45s ease" }}
                      >
                        {zone.label}
                      </text>
                    );
                  }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={false}
                  width={18}
                  label={{
                    value: "Sales",
                    angle: -90,
                    position: "insideLeft",
                    offset: 6,
                    style: { fill: "#555", fontSize: 9, fontFamily: C.mono },
                  }}
                />
                {DIVIDER_XS.map((x, i) => (
                  <ReferenceLine
                    key={i}
                    x={x}
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                ))}
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="rgba(255,255,255,0.72)"
                  strokeWidth={2.2}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
                {done && dotChartX !== null && dotChartY !== null && (
                  <ReferenceDot
                    x={dotChartX}
                    y={dotChartY}
                    r={0}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    shape={(props: any) => {
                      const { cx, cy } = props;
                      if (cx == null || cy == null) return <g />;
                      return (
                        <g>
                          <circle cx={cx} cy={cy} r={9} fill="none" stroke={dotColor} strokeWidth={1} opacity={0.3} />
                          <circle cx={cx} cy={cy} r={5.5} fill={dotColor} stroke="#080808" strokeWidth={1.5} />
                        </g>
                      );
                    }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildStageDesc(
  currentStage: ReturnType<typeof classifyLifecycle>,
  revGrowth: number | null,
  lcSignals: { revenueHistory: number[]; netIncome: number; operatingIncome: number },
): string | null {
  if (!currentStage || revGrowth === null) return null;
  const isThreeYear = lcSignals.revenueHistory.length >= 4;
  const growthPct = `${revGrowth >= 0 ? "+" : ""}${revGrowth.toFixed(1)}%`;
  const growthLabel = `${growthPct} ${isThreeYear ? "3-yr CAGR" : "YoY"} revenue`;
  const rev0 = lcSignals.revenueHistory[0] || 0;
  const opMargin = rev0 > 0 ? ((lcSignals.operatingIncome / rev0) * 100).toFixed(0) : null;

  switch (currentStage) {
    case "startup":
      return "Pre-revenue or early-stage — no established growth trend.";
    case "young_growth":
      return `${growthLabel} growth while still scaling toward profitability.`;
    case "high_growth":
      return `${growthLabel} growth${opMargin ? ` with ${opMargin}% operating margin` : ""}.`;
    case "mature_growth":
      return `Moderate ${growthLabel} growth with solid, established profitability.`;
    case "mature_stable":
      return `Slow ${growthLabel} growth — a mature business with durable earnings.`;
    case "decline":
      return `${growthLabel} contraction${lcSignals.netIncome <= 0 ? ", operating at a loss" : ""}.`;
    default:
      return null;
  }
}
