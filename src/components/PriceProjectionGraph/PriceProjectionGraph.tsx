import { useCallback, useEffect, useRef, useState } from "react";
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

// ─── Intro phase ────────────────────────────────────────────────────────────
// Controls both which projection lines are mounted and which button is lit.
// 'pending'  → no projection lines visible yet
// 'bear'     → bear line mounted + bear button lit
// 'bull'     → bear + bull mounted + bull button lit
// 'base'     → all mounted + base button lit
// 'done'     → all mounted + no button override (growthScenario wins)
type IntroPhase = "pending" | GrowthScenario | "done";

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

  // ─── Intro animation state ────────────────────────────────────────────────
  // introState (keyed by chartKey) controls which projection lines are mounted.
  // introScenario is independent: it changes ~200ms earlier so the button crossfade
  // overlaps with the end of each line's draw, not the beginning of the next.
  const [introState, setIntroState] = useState<{ key: string | null; phase: IntroPhase }>(
    { key: null, phase: "done" },
  );
  const introPhase: IntroPhase = introState.key === chartKey ? introState.phase : "pending";
  const [introScenario, setIntroScenario] = useState<GrowthScenario | null>(null);

  // Track which chartKey the SMA has already animated for; drives smaAnimActive.
  const [smaAnimatedKey, setSmaAnimatedKey] = useState<string | null>(null);
  const smaAnimActive = smaAnimatedKey !== chartKey;

  const introActiveRef = useRef(false);

  // ─── rAF loop — same pattern as useLifecycleAnimation ────────────────────
  // Two independent time tracks from the same start reference:
  //
  // Line-mount track  (introState) — controls when each projection line mounts:
  //   0–900ms   → pending  (historical line animating; no projection lines yet)
  //   900–1500  → bear     (bear line mounts + draws with animationBegin=0)
  //   1500–2100 → bull
  //   2100–2700 → base
  //   2700+     → done
  //
  // Button track (introScenario) — starts crossfade 200ms before next line mounts
  // so the fade overlaps with the end of each line's draw, not the start of the next:
  //   900–1300  → "bear"   (light up; bear line is drawing)
  //   1300–1900 → "bull"   (crossfade starts 200ms before bull line mounts at 1500ms)
  //   1900–2700 → "base"   (crossfade starts 200ms before base line mounts at 2100ms)
  //   2700+     → null     (growthScenario takes over)
  useEffect(() => {
    introActiveRef.current = true;
    let rafId: number;
    const start = performance.now();
    let curLine: IntroPhase = "pending";
    let curBtn: GrowthScenario | null = null;

    const tick = (now: number) => {
      if (!introActiveRef.current) return;
      const elapsed = now - start;

      const nextLine: IntroPhase =
        elapsed < 900  ? "pending" :
        elapsed < 1500 ? "bear"    :
        elapsed < 2100 ? "bull"    :
        elapsed < 2700 ? "base"    :
        "done";

      const nextBtn: GrowthScenario | null =
        elapsed >= 900  && elapsed < 1300 ? "bear" :
        elapsed >= 1300 && elapsed < 1900 ? "bull" :
        elapsed >= 1900 && elapsed < 2700 ? "base" :
        null;

      if (nextLine !== curLine) { curLine = nextLine; setIntroState({ key: chartKey, phase: nextLine }); }
      if (nextBtn  !== curBtn)  { curBtn  = nextBtn;  setIntroScenario(nextBtn); }

      if (elapsed < 2700) rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      introActiveRef.current = false;
      cancelAnimationFrame(rafId);
    };
  }, [chartKey]);

  const onSmaAnimEnd = useCallback(() => { setSmaAnimatedKey(chartKey); }, [chartKey]);

  // Scenario line styles — active: full opacity + thicker, inactive: dimmed.
  // During intro, uses introScenario so the currently-drawing line is always prominent.
  const lineStyle = (s: GrowthScenario): { strokeOpacity: number; strokeWidth: number } => {
    const effective = introScenario ?? growthScenario;
    return {
      strokeOpacity: effective === s ? 1 : 0.3,
      strokeWidth:   effective === s ? 2.5 : 1.5,
    };
  };

  const tickFmt = (v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`;

  const tooltipContent = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (props: any) => <ChartTooltip {...props} currentPrice={currentPrice} tickFmt={tickFmt} mono={mono} />,
    [currentPrice, mono],
  );

  if (currentPrice <= 0) {
    return (
      <div style={{ height: "260px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: "11px", color: C.text2, fontFamily: body }}>No price data</span>
      </div>
    );
  }

  const showBear = introPhase !== "pending";
  const showBull = introPhase === "bull" || introPhase === "base" || introPhase === "done";
  const showBase = introPhase === "base" || introPhase === "done";

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

            {/* 200-day SMA */}
            <Line
              type="monotone"
              dataKey="sma"
              stroke={smaColor}
              strokeOpacity={0.45}
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              connectNulls={false}
              isAnimationActive={smaAnimActive}
              animationBegin={1700}
              animationDuration={400}
              animationEasing="ease-out"
              onAnimationEnd={onSmaAnimEnd}
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

            {/* Bear — mounts at t≈900ms; draws immediately with animationBegin=0 */}
            {showBear && (
              <Line
                type="monotone"
                dataKey="bear"
                stroke={COLORS.bear}
                strokeDasharray="6 3"
                dot={false}
                activeDot={{ r: 4, fill: COLORS.bear, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={true}
                animationBegin={0}
                animationDuration={600}
                animationEasing="ease-out"
                {...lineStyle("bear")}
              />
            )}

            {/* Bull — mounts at t≈1500ms */}
            {showBull && (
              <Line
                type="monotone"
                dataKey="bull"
                stroke={COLORS.bull}
                strokeDasharray="6 3"
                dot={false}
                activeDot={{ r: 4, fill: COLORS.bull, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={true}
                animationBegin={0}
                animationDuration={600}
                animationEasing="ease-out"
                {...lineStyle("bull")}
              />
            )}

            {/* Base — mounts at t≈2100ms */}
            {showBase && (
              <Line
                type="monotone"
                dataKey="base"
                stroke={COLORS.base}
                strokeDasharray="6 3"
                dot={false}
                activeDot={{ r: 4, fill: COLORS.base, strokeWidth: 0 }}
                connectNulls={false}
                isAnimationActive={true}
                animationBegin={0}
                animationDuration={600}
                animationEasing="ease-out"
                {...lineStyle("base")}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

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
        introScenario={introScenario}
        introPending={introPhase === "pending"}
        onIntroCancel={() => {
          introActiveRef.current = false;
          setIntroState({ key: chartKey, phase: "done" });
          setIntroScenario(null);
        }}
      />
    </div>
  );
}
