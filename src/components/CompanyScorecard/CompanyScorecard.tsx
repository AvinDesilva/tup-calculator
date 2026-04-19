import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, ReferenceLine, ReferenceDot,
  ResponsiveContainer,
} from "recharts";
import { LC_CURVE, LC_ZONES, STAGE_META } from "../../lib/constants.ts";
import { classifyLifecycle, lifecycleDotX, lifecycleRevGrowth } from "../../lib/companyScorecard/lifecycle.ts";
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

          <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginTop: "8px" }}>
            <div
              style={{ width: "75%", flexShrink: 0 }}
              role="img"
              aria-label={`Business lifecycle S-curve. Current stage: ${currentStage || "unknown"}`}
            >
              <ResponsiveContainer width="100%" height={140} minWidth={0}>
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 12, bottom: 36, left: 0 }}
                >
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
                      return (
                        <text
                          x={props.x}
                          y={(props.y ?? 0) + 12}
                          textAnchor="middle"
                          fill={isActive ? STAGE_META[zone.key].color : "rgba(255,255,255,0.28)"}
                          fontSize={8}
                          fontFamily={body}
                          fontWeight={isActive ? 700 : 400}
                        >
                          {zone.label}
                        </text>
                      );
                    }}
                    axisLine={{ stroke: "rgba(255,255,255,0.2)", strokeWidth: 1.5 }}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    domain={[0, 100]}
                    axisLine={{ stroke: "rgba(255,255,255,0.2)", strokeWidth: 1.5 }}
                    tickLine={false}
                    tick={false}
                    width={14}
                    label={{
                      value: "Sales",
                      angle: -90,
                      position: "insideLeft",
                      offset: 2,
                      style: { fill: "rgba(255,255,255,0.3)", fontSize: 8, fontFamily: body },
                    }}
                  />
                  {dividerXs.map((x, i) => (
                    <ReferenceLine
                      key={i}
                      x={x}
                      stroke="rgba(255,255,255,0.18)"
                      strokeWidth={1}
                      strokeDasharray="4 4"
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
                    animationDuration={800}
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

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
