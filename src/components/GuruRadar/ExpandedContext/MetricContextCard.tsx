import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { C } from "../../../lib/theme.ts";
import type { MetricContext } from "../../../lib/guruRadar/metricHistory.ts";
import type { RadarMetricPoint } from "../../../lib/guruRadar/types.ts";

interface Props {
  context: MetricContext;
  radarPoint: RadarMetricPoint | undefined;
  isActive: boolean;
}

function scoreColor(score: number): string {
  if (score >= 66) return "#10d97e";
  if (score >= 33) return "#f5a020";
  return "#e03030";
}

function barColor(value: number | null): string {
  if (value == null) return C.text3;
  return value >= 0 ? "#10d97e" : "#e03030";
}

export function MetricContextCard({ context, radarPoint, isActive }: Props) {
  const score = radarPoint?.value ?? 0;
  const color = scoreColor(score);
  const currentValue = radarPoint?.rawLabel ?? "N/A";

  return (
    <div style={{
      border: `1px solid ${isActive ? color + "55" : C.borderWeak}`,
      background: isActive ? `${color}08` : C.bg,
      padding: "14px 16px",
      transition: "border-color 0.3s, background 0.3s",
      display: "flex",
      flexDirection: "column",
      gap: 8,
      height: "100%",
      boxSizing: "border-box",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div>
          <div style={{
            fontFamily: C.display,
            fontSize: 15,
            fontWeight: 700,
            color: C.text1,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
          }}>
            {context.title}
          </div>
          <div style={{ fontFamily: C.mono, fontSize: 10, color: C.text3, marginTop: 2, letterSpacing: "0.06em" }}>
            {context.formula}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontFamily: C.mono, fontSize: 18, fontWeight: 700, color, lineHeight: 1 }}>
            {currentValue}
          </div>
          <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, marginTop: 3 }}>
            {Math.round(score)}/100
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{
        fontSize: 11,
        color: C.text2,
        lineHeight: 1.55,
        fontFamily: C.body,
      }}>
        {context.description}
      </div>

      {/* Chart or single-value display */}
      {context.hasHistory && context.history.length > 0 ? (
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 9, fontFamily: C.mono, color: C.text3, letterSpacing: "0.08em", marginBottom: 4 }}>
            YEAR-OVER-YEAR
          </div>
          <ResponsiveContainer width="100%" height={108}>
            <BarChart data={context.history} margin={{ top: 4, right: 0, bottom: 0, left: 0 }} barCategoryGap="25%">
              <XAxis
                dataKey="year"
                tick={{ fill: C.text3, fontSize: 9, fontFamily: "JetBrains Mono, monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <ReferenceLine y={0} stroke={C.borderWeak} strokeWidth={1} />
              <Bar dataKey="value" radius={[2, 2, 0, 0]} isAnimationActive={false}>
                {context.history.map((entry, i) => (
                  <Cell key={i} fill={barColor(entry.value)} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{
          marginTop: 8,
          padding: "12px 0",
          textAlign: "center",
          borderTop: `1px solid ${C.borderWeak}`,
        }}>
          <div style={{ fontFamily: C.mono, fontSize: 9, color: C.text3, letterSpacing: "0.08em", marginBottom: 6 }}>
            CURRENT VALUE
          </div>
          <div style={{ fontFamily: C.mono, fontSize: 28, fontWeight: 700, color }}>
            {currentValue}
          </div>
          <div style={{ fontSize: 9, color: C.text3, marginTop: 4, fontFamily: C.body }}>
            Historical trend not available
          </div>
        </div>
      )}
    </div>
  );
}
