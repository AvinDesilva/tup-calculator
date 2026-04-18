import { useCallback, useState } from "react";
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceLine, ResponsiveContainer, Tooltip,
} from "recharts";
import { C } from "../../lib/theme.ts";
import type { GrowthScenario } from "../../lib/types.ts";
import type { PriceProjectionGraphProps } from "./PriceProjectionGraph.types.ts";
import { COLORS, smaColor } from "./constants.ts";
import { useChartData } from "./useChartData.ts";
import { ChartTooltip } from "./ChartTooltip.tsx";
import { GraphLegend } from "./GraphLegend.tsx";
import { ViewWindowToggle } from "./ViewWindowToggle.tsx";

export function PriceProjectionGraph({
  priceHistory,
  currentPrice,
  scenarioValues,
  growthScenario,
  result,
  sma200,
  rollingDice,
  onScenarioChange,
  lifecycleStage,
  dividendYield,
}: PriceProjectionGraphProps) {
  const body = C.body;
  const mono = C.mono;

  const [viewYears, setViewYears] = useState<2 | 5 | 10>(2);
  const [showSma, setShowSma] = useState(true);

  const { chartData, todayLabel, chartKey, yDomain } = useChartData(
    priceHistory,
    currentPrice,
    scenarioValues,
    result,
    viewYears,
    rollingDice,
    lifecycleStage,
    dividendYield,
  );

  const tickFmt = (v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`;

  // Scenario line styles — active: full opacity + thicker, inactive: dimmed
  const lineStyle = (s: GrowthScenario): { strokeOpacity: number; strokeWidth: number } => ({
    strokeOpacity: growthScenario === s ? 1 : 0.3,
    strokeWidth:   growthScenario === s ? 2.5 : 1.5,
  });

  // Stable tooltip wrapper — prevents Recharts from remounting the tooltip
  // on every render (which happens when content is an inline arrow function)
  const tooltipContent = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (props: any) => <ChartTooltip {...props} currentPrice={currentPrice} tickFmt={tickFmt} mono={mono} />,
    // tickFmt is a stable inline function with no captures; mono/currentPrice are primitives
    [currentPrice, mono],
  );

  if (currentPrice <= 0) {
    return (
      <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "11px", color: C.text2, fontFamily: body }}>No price data</span>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <ViewWindowToggle viewYears={viewYears} setViewYears={setViewYears} body={body} />

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: -1, height: 1 }}>
          <ComposedChart
            key={chartKey}
            data={chartData}
            margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
            title="Price projection chart"
            desc="Historical prices and bear, base, and bull scenario projections"
          >
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />

            <XAxis
              dataKey="label"
              tick={{ fill: "#888", fontSize: 9, fontFamily: mono }}
              tickLine={false}
              axisLine={false}
              interval={Math.floor(chartData.length / 8)}
            />
            <YAxis
              orientation="right"
              tick={{ fill: "#888", fontSize: 9, fontFamily: mono }}
              tickLine={false}
              axisLine={false}
              tickFormatter={tickFmt}
              width={48}
              domain={yDomain}
            />

            <Tooltip
              content={tooltipContent}
              cursor={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
            />

            {/* Vertical marker at today */}
            <ReferenceLine
              x={todayLabel}
              stroke="rgba(255,255,255,0.18)"
              strokeDasharray="3 3"
              strokeWidth={1}
            />

            {/* 200-day SMA — curved line following the rolling 40-week average */}
            <Line
              type="monotone"
              dataKey="sma"
              stroke={smaColor}
              strokeOpacity={0.45}
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={true}
              animationBegin={1700}
              animationDuration={400}
              animationEasing="ease-out"
              hide={!showSma}
            />

            {/* Historical — gold solid */}
            <Line
              type="monotone"
              dataKey="historical"
              stroke={C.accent}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: C.accent, strokeWidth: 0 }}
              connectNulls={false}
              isAnimationActive={true}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            />

            {/* Base — white dashed */}
            <Line
              type="monotone"
              dataKey="base"
              stroke={COLORS.base}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 4, fill: COLORS.base, strokeWidth: 0 }}
              connectNulls={false}
              isAnimationActive={true}
              animationBegin={900}
              animationDuration={600}
              animationEasing="ease-out"
              {...lineStyle("base")}
            />

            {/* Bull — green dashed */}
            <Line
              type="monotone"
              dataKey="bull"
              stroke={COLORS.bull}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 4, fill: COLORS.bull, strokeWidth: 0 }}
              connectNulls={false}
              isAnimationActive={true}
              animationBegin={900}
              animationDuration={600}
              animationEasing="ease-out"
              {...lineStyle("bull")}
            />

            {/* Bear — red dashed */}
            <Line
              type="monotone"
              dataKey="bear"
              stroke={COLORS.bear}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 4, fill: COLORS.bear, strokeWidth: 0 }}
              connectNulls={false}
              isAnimationActive={true}
              animationBegin={900}
              animationDuration={600}
              animationEasing="ease-out"
              {...lineStyle("bear")}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Screen-reader summary — tooltip data is mouse-only; this gives AT users key projection endpoints */}
      {chartData.length > 0 && (() => {
        const last = chartData[chartData.length - 1];
        const projYears = viewYears === 10 ? 10 : 5;
        return (
          <p className="sr-only">
            Current price {tickFmt(currentPrice)}.{" "}
            {projYears}-year projections:{" "}
            {last.bear != null && <>bear {tickFmt(last.bear)}, </>}
            {last.base != null && <>base {tickFmt(last.base)}, </>}
            {last.bull != null && <>bull {tickFmt(last.bull)}.</>}
          </p>
        );
      })()}

      <GraphLegend
        growthScenario={growthScenario}
        onScenarioChange={onScenarioChange}
        showSma={showSma}
        setShowSma={setShowSma}
        sma200={sma200}
        body={body}
      />
    </div>
  );
}
