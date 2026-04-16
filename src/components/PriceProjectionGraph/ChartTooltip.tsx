import { COLORS } from "./constants.ts";

interface ChartTooltipProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  active?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[];
  label?: string;
  currentPrice: number;
  tickFmt: (v: number) => string;
  mono: string;
}

export function ChartTooltip({ active, payload, label, currentPrice, tickFmt, mono }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const entries = payload.filter((p: { value: unknown }) => p.value != null);
  if (!entries.length) return null;
  const PROJECTION_KEYS = new Set(["bear", "base", "bull"]);
  return (
    <div style={{
      background: "#111", border: "1px solid rgba(255,255,255,0.1)",
      padding: "7.5px 12.5px", fontSize: "12.5px", fontFamily: mono,
      pointerEvents: "none",
    }}>
      <div style={{ color: "#999", marginBottom: "5px", letterSpacing: "0.06em" }}>{label}</div>
      {entries.map((e: { dataKey: string; value: number }) => {
        const color = COLORS[e.dataKey as keyof typeof COLORS] ?? "#fff";
        const isProjection = PROJECTION_KEYS.has(e.dataKey) && currentPrice > 0;
        const pct = isProjection ? ((e.value - currentPrice) / currentPrice) * 100 : null;
        const pctStr = pct != null
          ? (pct >= 0 ? `+${pct.toFixed(1)}%` : `${pct.toFixed(1)}%`)
          : null;
        return (
          <div key={e.dataKey} style={{ display: "flex", alignItems: "baseline", gap: "10px", color, fontWeight: 600 }}>
            <span>{tickFmt(e.value)}</span>
            {pctStr != null && (
              <span style={{ fontSize: "11.25px", opacity: 0.75, fontWeight: 400 }}>{pctStr}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
