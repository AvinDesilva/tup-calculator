import { memo } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { C } from "../../lib/theme.ts";
import type { RadarMetricPoint } from "../../lib/guruRadar/types.ts";

interface Props {
  radar: RadarMetricPoint[];
  color: string;
  highlightIndex?: number | null;
  highlightVisible?: boolean;
}

// The tooltip is inside the CSS-rotated container, so it physically moves and
// rotates with the chart. Counter-rotating the content keeps text readable
// while preserving the "orbiting" tooltip position.
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: RadarMetricPoint }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div style={{
      background: C.bg,
      border: `1px solid ${C.border}`,
      borderRadius: 4,
      padding: "6px 10px",
      fontSize: 11,
      color: C.text1,
      // Counter-rotate via CSS custom property so it tracks in real-time
      transform: "rotate(var(--rdr-counter, 0deg))",
      transformOrigin: "center center",
      pointerEvents: "none",
    }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{point.axis}</div>
      <div style={{ color: C.text2 }}>{point.rawLabel}</div>
      <div style={{ color: C.text3 }}>Score: {Math.round(point.value)}/100</div>
    </div>
  );
}

const LABEL_BASE_PX = 10;  // push all labels outward from the outer ring
const LABEL_PUSH_PX = 5;   // additional push for the highlighted label
const RECT_PAD_X   = 5;   // horizontal padding inside the outline box
const RECT_PAD_Y   = 3;   // vertical padding inside the outline box

function RadarChartPanelInner({ radar, color, highlightIndex = null, highlightVisible = true }: Props) {
  return (
    <ResponsiveContainer width="100%" height={320} minWidth={0}>
        <RadarChart data={radar} margin={{ top: 18, right: 40, bottom: 18, left: 40 }}>
          <PolarGrid stroke={C.borderWeak} />
          <PolarAngleAxis
            dataKey="axis"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tick={(props: any) => {
              const rawX:  number = Number(props.x  ?? 0);
              const rawY:  number = Number(props.y  ?? 0);
              const chartCx: number = Number(props.cx ?? 0);
              const chartCy: number = Number(props.cy ?? 0);
              const value:  string  = props.payload?.value ?? "";
              const index:  number  = props.index ?? 0;
              const isHighlighted   = index === highlightIndex;

              // Push all labels outward for breathing room; highlighted gets extra
              let lx = rawX;
              let ly = rawY;
              if (chartCx > 0 || chartCy > 0) {
                const dx   = rawX - chartCx;
                const dy   = rawY - chartCy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0) {
                  const push = LABEL_BASE_PX + (isHighlighted ? LABEL_PUSH_PX : 0);
                  lx = rawX + (dx / dist) * push;
                  ly = rawY + (dy / dist) * push;
                }
              }

              // Estimated text box dimensions for the outline rect
              const approxCharW = 6.2;
              const approxTextH = 12;
              const textW = value.length * approxCharW;
              const rectW = textW + RECT_PAD_X * 2;
              const rectH = approxTextH + RECT_PAD_Y * 2;

              return (
                // Counter-rotate via CSS custom property so labels track in real-time.
                // transform-box:view-box makes transformOrigin use SVG viewport coords,
                // so (lx, ly) correctly maps to the label's SVG position.
                <g style={{
                  transformBox: "view-box",
                  transformOrigin: `${lx}px ${ly}px`,
                  transform: "rotate(var(--rdr-counter, 0deg))",
                } as React.CSSProperties}>
                  {isHighlighted && (
                    <rect
                      x={lx - rectW / 2}
                      y={ly - rectH / 2}
                      width={rectW}
                      height={rectH}
                      rx={2}
                      fill={C.bg}
                      fillOpacity={0.92}
                      stroke={C.accent}
                      strokeWidth={1}
                      style={{
                        opacity: highlightVisible ? 1 : 0,
                        transition: highlightVisible ? "opacity 0.35s ease" : "opacity 0.08s ease",
                      }}
                    />
                  )}
                  <text
                    x={lx}
                    y={ly}
                    fontSize={10}
                    fontFamily="Space Grotesk, sans-serif"
                    fontWeight={isHighlighted ? 700 : 400}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={isHighlighted ? {
                      fill: highlightVisible ? C.accent : C.text3,
                      transition: highlightVisible ? "fill 0.35s ease" : "fill 0.08s ease",
                    } : { fill: C.text2 }}
                  >
                    {value}
                  </text>
                </g>
              );
            }}
          />
          <Radar
            name="Score"
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.2}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            dot={(props: any) => {
              const cx    = Number(props.cx ?? 0);
              const cy    = Number(props.cy ?? 0);
              const index: number = props.index ?? 0;
              const isHighlighted  = index === highlightIndex;
              if (isHighlighted) {
                const dotOpacity = highlightVisible ? 1 : 0;
                const dotTransition = highlightVisible ? "opacity 0.35s ease" : "opacity 0.08s ease";
                return (
                  <g key={`dot-${index}`} style={{ opacity: dotOpacity, transition: dotTransition }}>
                    <circle cx={cx} cy={cy} r={9} fill="none" stroke={C.accent} strokeWidth={1} opacity={0.3} />
                    <circle cx={cx} cy={cy} r={5} fill={C.accent} stroke="#080808" strokeWidth={1.5} />
                  </g>
                );
              }
              return <circle key={`dot-${index}`} cx={cx} cy={cy} r={3} fill={color} />;
            }}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
  );
}

export const RadarChartPanel = memo(RadarChartPanelInner);
