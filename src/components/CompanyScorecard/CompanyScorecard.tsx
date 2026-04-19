import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ReferenceDot,
  ResponsiveContainer,
} from "recharts";
import { C } from "../../lib/theme.ts";
import { LC_CURVE, LC_ZONES, STAGE_META } from "../../lib/constants.ts";
import { classifyLifecycle, lifecycleDotX, lifecycleRevGrowth } from "../../lib/companyScorecard/lifecycle.ts";
import { SectionLabel } from "../primitives";
import type { CompanyScorecardProps } from "./CompanyScorecard.types.ts";

const ANIM_DURATION = 1600;
const FLASH_DURATION = 520;

type LabelState = "idle" | "flash" | "settled";

export function CompanyScorecard({ incomeHistory, description, dividendYield }: CompanyScorecardProps) {
  const [descExpanded, setDescExpanded] = useState(false);
  const [labelStates, setLabelStates] = useState<Record<string, LabelState>>({});
  const body  = C.body;
  const mono  = C.mono;

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

  useEffect(() => {
    if (!hasLifecycle) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    LC_ZONES.forEach(zone => {
      const flashAt = Math.round(zone.center * ANIM_DURATION);
      const settleAt = flashAt + FLASH_DURATION;
      timers.push(setTimeout(() => {
        setLabelStates(prev => ({ ...prev, [zone.key]: "flash" }));
      }, flashAt));
      timers.push(setTimeout(() => {
        setLabelStates(prev => ({ ...prev, [zone.key]: "settled" }));
      }, settleAt));
    });
    return () => {
      timers.forEach(clearTimeout);
      setLabelStates({});
    };
  }, [hasLifecycle]);

  if (!hasLifecycle && !description) return null;

  // Recharts data: x in [0, 100]; sales (y) inverted from LC_CURVE
  // LC_CURVE y=0 → top of SVG (high sales), y=1 → bottom (low sales)
  // Recharts y=0 → bottom of chart, y=100 → top → invert: sales = (1 - y) * 100
  const chartData = LC_CURVE.map(([x, y]) => ({
    x: x * 100,
    sales: (1 - y) * 100,
  }));

  // Linearly interpolate curve y at dotTx for ReferenceDot placement
  let dotChartX: number | null = null;
  let dotChartY: number | null = null;
  if (dotTx !== null) {
    dotChartX = dotTx * 100;
    const targetX = dotChartX;
    let loIdx = 0;
    for (let i = 0; i < chartData.length - 1; i++) {
      if (chartData[i].x <= targetX) loIdx = i;
    }
    const lo = chartData[loIdx];
    const hi = chartData[Math.min(loIdx + 1, chartData.length - 1)];
    const t = hi.x === lo.x ? 0 : (targetX - lo.x) / (hi.x - lo.x);
    dotChartY = lo.sales + t * (hi.sales - lo.sales);
  }

  const dotColor = (currentStage && STAGE_META[currentStage]?.color) || "#C4A06E";
  const dividerXs = [1/6, 2/6, 3/6, 4/6, 5/6].map(t => t * 100);

  // Brief explanation of how the current stage was derived
  const stageDesc = (() => {
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
  })();

  return (
    <div>
      {description && (
        <div style={{ marginBottom: "16px" }}>
          <SectionLabel title="Company Description" />
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
          <SectionLabel title="Business Lifecycle" />

          {/* Stage explanation */}
          {stageDesc && (
            <p style={{ fontSize: "11px", color: "#666", fontFamily: body, margin: "8px 0 10px", lineHeight: 1.55 }}>
              {stageDesc}
            </p>
          )}

          {/* Graph — full width */}
          <div
            role="img"
            aria-label={`Business lifecycle S-curve. Current stage: ${currentStage || "unknown"}`}
          >
            <ResponsiveContainer width="100%" height={140} minWidth={0}>
              <LineChart
                data={chartData}
                margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
              >
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
                    const isActive = zone.key === currentStage;
                    const stageColor = STAGE_META[zone.key].color;
                    const state: LabelState = labelStates[zone.key] || "idle";
                    let opacity: number;
                    let fontWeight: number;
                    if (state === "flash") {
                      opacity = 1;
                      fontWeight = 700;
                    } else if (state === "settled") {
                      opacity = isActive ? 1 : 0.35;
                      fontWeight = isActive ? 700 : 400;
                    } else {
                      opacity = 0.1;
                      fontWeight = 400;
                    }
                    return (
                      <text
                        x={props.x}
                        y={(props.y ?? 0) + 12}
                        textAnchor="middle"
                        fill={stageColor}
                        opacity={opacity}
                        fontSize={9}
                        fontFamily={mono}
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
                    style: { fill: "#555", fontSize: 9, fontFamily: mono },
                  }}
                />
                {dividerXs.map((x, i) => (
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
                  isAnimationActive={true}
                  animationBegin={0}
                  animationDuration={ANIM_DURATION}
                  animationEasing="ease-out"
                />
                {dotChartX !== null && dotChartY !== null && (
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

          {/* Legend — horizontal row below graph */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: "10px" }}>
            {LC_ZONES.map(z => {
              const isActive = z.key === currentStage;
              return (
                <div key={z.key} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{
                    width: isActive ? "9px" : "7px", height: isActive ? "9px" : "7px",
                    borderRadius: "50%", background: STAGE_META[z.key].color,
                    opacity: isActive ? 1 : 0.35,
                    boxShadow: isActive ? `0 0 6px ${STAGE_META[z.key].color}` : "none",
                    flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: "11px", fontFamily: body,
                    color: isActive ? STAGE_META[z.key].color : "#555",
                    fontWeight: isActive ? 700 : 400,
                    whiteSpace: "nowrap",
                  }}>
                    {z.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
