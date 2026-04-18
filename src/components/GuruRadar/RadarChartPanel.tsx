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

export function RadarChartPanel({ radar, color }: Props) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <RadarChart data={radar} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
        <PolarGrid stroke={C.borderWeak} />
        <PolarAngleAxis
          dataKey="axis"
          tick={{ fill: C.text2, fontSize: 10, fontFamily: "Space Grotesk, sans-serif" }}
        />
        <Radar
          name="Score"
          dataKey="value"
          stroke={color}
          fill={color}
          fillOpacity={0.2}
          dot={{ r: 3, fill: color, strokeWidth: 0 }}
        />
        <Tooltip content={<CustomTooltip />} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
