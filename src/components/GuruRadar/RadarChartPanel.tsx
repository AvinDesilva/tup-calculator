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
  rotationDeg?: number;
  highlightIndex?: number | null;
}

interface TooltipPayload {
  payload?: RadarMetricPoint;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div style={{
      background: C.bg,
      border: `1px solid ${C.borderWeak}`,
      borderRadius: 6,
      padding: "6px 10px",
      fontSize: 11,
      color: C.text1,
    }}>
      <div style={{ fontWeight: 600, marginBottom: 2 }}>{point.axis}</div>
      <div style={{ color: C.text2 }}>{point.rawLabel}</div>
      <div style={{ color: C.text3 }}>Score: {Math.round(point.value)}/100</div>
    </div>
  );
}

export function RadarChartPanel({ radar, color, rotationDeg = 0, highlightIndex = null }: Props) {
  return (
    <div style={{
      transform: `rotate(${rotationDeg}deg)`,
      transition: "transform 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
    }}>
      <ResponsiveContainer width="100%" height={320} minWidth={0}>
        <RadarChart data={radar} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
          <PolarGrid stroke={C.borderWeak} />
          <PolarAngleAxis
            dataKey="axis"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            tick={(props: any) => {
              const x = Number(props.x ?? 0);
              const y = Number(props.y ?? 0);
              const value: string = props.payload?.value ?? "";
              const index: number = props.index ?? 0;
              const isHighlighted = index === highlightIndex;
              return (
                <text
                  x={x}
                  y={y}
                  transform={`rotate(${-rotationDeg}, ${x}, ${y})`}
                  fill={isHighlighted ? C.accent : C.text2}
                  fontSize={10}
                  fontFamily="Space Grotesk, sans-serif"
                  fontWeight={isHighlighted ? 700 : 400}
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {value}
                </text>
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
              const cx = Number(props.cx ?? 0);
              const cy = Number(props.cy ?? 0);
              const index: number = props.index ?? 0;
              const isHighlighted = index === highlightIndex;
              if (isHighlighted) {
                return (
                  <g key={`dot-${index}`}>
                    {/* Outer glow ring */}
                    <circle cx={cx} cy={cy} r={9} fill="none" stroke={C.accent} strokeWidth={1} opacity={0.3} />
                    {/* Filled dot */}
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
    </div>
  );
}
