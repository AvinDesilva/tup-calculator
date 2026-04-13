import { useMemo } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import { C } from "../../lib/theme.ts";
import type { PriceProjectionGraphProps } from "./PriceProjectionGraph.types.ts";

type ChartPoint = {
  label: string;
  historical?: number;
  base?: number;
  bull?: number;
  bear?: number;
};

function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const yr = String(d.getFullYear()).slice(2);
  const mo = d.toLocaleString("en-US", { month: "short" });
  return `${mo} '${yr}`;
}

function addYears(date: Date, n: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + n);
  return d;
}

function toDateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function PriceProjectionGraph({
  priceHistory,
  currentPrice,
  scenarioValues,
  growthScenario,
  result,
}: PriceProjectionGraphProps) {
  const body = C.body;
  const mono = C.mono;

  const label9: React.CSSProperties = {
    fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em",
    textTransform: "uppercase", color: "#888", fontFamily: body,
  };

  const chartData = useMemo<ChartPoint[]>(() => {
    if (currentPrice <= 0) return [];

    // ── CAGR for each scenario (percent) ─────────────────────────────────────
    const fallbackRate = (result?.grTerminal ?? result?.gr ?? 0.1) * 100;
    const getRate = (s: "bear" | "base" | "bull"): number => {
      const cagr = scenarioValues[s].cagr;
      if (cagr != null) return cagr;
      if (s === "base") return fallbackRate;
      if (s === "bull") return fallbackRate * 1.5;
      return fallbackRate * 0.5;
    };
    const bearRate = getRate("bear");
    const baseRate = getRate("base");
    const bullRate = getRate("bull");

    // ── Historical points ─────────────────────────────────────────────────────
    const historical: ChartPoint[] = priceHistory.map(p => ({
      label: formatMonthLabel(p.date),
      historical: p.close,
    }));

    // ── Join point (today) ────────────────────────────────────────────────────
    const today = new Date();
    const todayLabel = formatMonthLabel(toDateStr(today));
    const joinPoint: ChartPoint = {
      label: todayLabel,
      historical: currentPrice,
      base: currentPrice,
      bull: currentPrice,
      bear: currentPrice,
    };

    // ── Projection points (annual, +1 → +4 years) ────────────────────────────
    const projections: ChartPoint[] = [1, 2, 3, 4].map(n => ({
      label: formatMonthLabel(toDateStr(addYears(today, n))),
      base: parseFloat((currentPrice * Math.pow(1 + baseRate / 100, n)).toFixed(2)),
      bull: parseFloat((currentPrice * Math.pow(1 + bullRate / 100, n)).toFixed(2)),
      bear: parseFloat((currentPrice * Math.pow(1 + bearRate / 100, n)).toFixed(2)),
    }));

    return [...historical, joinPoint, ...projections];
  }, [priceHistory, currentPrice, scenarioValues, result]);

  // Label of the "today" join point — used for the reference line
  const todayLabel = useMemo(() => {
    return formatMonthLabel(toDateStr(new Date()));
  }, []);

  // Y-axis domain with 10% padding
  const yDomain = useMemo<[number, number]>(() => {
    if (chartData.length === 0) return [0, 100];
    let min = Infinity, max = -Infinity;
    for (const pt of chartData) {
      for (const v of [pt.historical, pt.base, pt.bull, pt.bear]) {
        if (v != null) { min = Math.min(min, v); max = Math.max(max, v); }
      }
    }
    const pad = (max - min) * 0.1;
    return [Math.max(0, min - pad), max + pad];
  }, [chartData]);

  const tickFmt = (v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`;

  // Scenario line styles — active: full opacity + thicker, inactive: dimmed
  const lineStyle = (s: "bear" | "base" | "bull"): { strokeOpacity: number; strokeWidth: number } => ({
    strokeOpacity: growthScenario === s ? 1 : 0.3,
    strokeWidth:   growthScenario === s ? 2.5 : 1.5,
  });

  const COLORS = { base: "#ffffff", bull: "#10d97e", bear: "#FF4D00" };

  const legendItems: Array<{ key: "bear" | "base" | "bull"; label: string }> = [
    { key: "bear", label: "Bear" },
    { key: "base", label: "Base" },
    { key: "bull", label: "Bull" },
  ];

  if (currentPrice <= 0) {
    return (
      <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "11px", color: C.text3, fontFamily: body }}>No price data</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ ...label9, marginBottom: "12px" }}>Price Projection</div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fill: "#666", fontSize: 9, fontFamily: mono }}
            tickLine={false}
            axisLine={false}
            interval={11}
          />
          <YAxis
            orientation="right"
            tick={{ fill: "#666", fontSize: 9, fontFamily: mono }}
            tickLine={false}
            axisLine={false}
            tickFormatter={tickFmt}
            width={48}
            domain={yDomain}
          />

          {/* Vertical marker at today */}
          <ReferenceLine
            x={todayLabel}
            stroke="rgba(255,255,255,0.18)"
            strokeDasharray="3 3"
            strokeWidth={1}
          />

          {/* Historical — gold solid */}
          <Line
            type="monotone"
            dataKey="historical"
            stroke={C.accent}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />

          {/* Base — white dashed */}
          <Line
            type="monotone"
            dataKey="base"
            stroke={COLORS.base}
            strokeDasharray="6 3"
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
            {...lineStyle("base")}
          />

          {/* Bull — green dashed */}
          <Line
            type="monotone"
            dataKey="bull"
            stroke={COLORS.bull}
            strokeDasharray="6 3"
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
            {...lineStyle("bull")}
          />

          {/* Bear — red dashed */}
          <Line
            type="monotone"
            dataKey="bear"
            stroke={COLORS.bear}
            strokeDasharray="6 3"
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
            {...lineStyle("bear")}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: "flex", gap: "20px", marginTop: "10px", paddingLeft: "4px" }}>
        {legendItems.map(({ key, label }) => {
          const active = growthScenario === key;
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "6px", opacity: active ? 1 : 0.4 }}>
              <svg width="18" height="8" aria-hidden="true">
                <line x1="0" y1="4" x2="18" y2="4"
                  stroke={COLORS[key]}
                  strokeWidth={active ? 2.5 : 1.5}
                  strokeDasharray="5 2"
                />
              </svg>
              <span style={{ fontSize: "9px", fontFamily: body, letterSpacing: "0.1em", textTransform: "uppercase", color: active ? COLORS[key] : "#888", fontWeight: active ? 700 : 400 }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
