import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { Panel } from "./Panel.tsx";
import { RadarChartPanel } from "../GuruRadar/RadarChartPanel.tsx";
import { ExpandedContextCarousel } from "../GuruRadar/ExpandedContext/index.ts";
import { SectionLabel } from "../primitives";
import type { ValuationContextProps, PanelData } from "./ValuationContext.types.ts";
import type { RadarMetricPoint } from "../../lib/guruRadar/types.ts";
import { C } from "../../lib/theme.ts";
import { computeMetricContexts } from "../../lib/guruRadar/metricHistory.ts";

// The radar has 14 metrics; index 7 (Current Ratio) naturally sits at the
// bottom (6 o'clock) with default startAngle=90 going counterclockwise.
// To bring index K to the bottom we rotate by (K - 7) * (360/14) degrees.
const METRIC_COUNT = 14;
const DEG_PER_METRIC = 360 / METRIC_COUNT;
const BOTTOM_INDEX = 7; // Current Ratio is the natural bottom

function r(radar: RadarMetricPoint[], axis: string): string {
  return radar.find(p => p.axis === axis)?.rawLabel ?? "N/A";
}

function getGuruReasoning(name: string, radar: RadarMetricPoint[]): string {
  switch (name) {
    case "Buffett":
      return `Looks for durable moats via profitability and FCF. Op margin ${r(radar, "Op Margin")}, gross margin ${r(radar, "Gross Margin")}, ROE ${r(radar, "ROE")}, FCF yield ${r(radar, "FCF Yield")}, Piotroski ${r(radar, "Piotroski")}.`;
    case "Lynch":
      return `GARP — growth at a reasonable price. EPS growth ${r(radar, "EPS Growth")}, P/E ${r(radar, "Value (P/E)")}, revenue growth ${r(radar, "Rev Growth")}, net margin ${r(radar, "Net Margin")}.`;
    case "Fisher":
      return `Quality growth franchise. Revenue growth ${r(radar, "Rev Growth")}, EPS growth ${r(radar, "EPS Growth")}, gross margin ${r(radar, "Gross Margin")}, ROE ${r(radar, "ROE")}, FCF margin ${r(radar, "FCF Margin")}.`;
    case "Greenblatt":
      return `Magic Formula: earnings yield × return on capital. P/E ${r(radar, "Value (P/E)")}, op margin ${r(radar, "Op Margin")}, ROA ${r(radar, "ROA")}, ROE ${r(radar, "ROE")}.`;
    case "Graham":
      return `Deep value with margin of safety. P/E ${r(radar, "Value (P/E)")}, current ratio ${r(radar, "Current Ratio")}, D/E ${r(radar, "Low D/E")}, Piotroski ${r(radar, "Piotroski")}, net margin ${r(radar, "Net Margin")}.`;
    case "Templeton":
      return `Contrarian global value. P/E ${r(radar, "Value (P/E)")}, net margin ${r(radar, "Net Margin")}, revenue growth ${r(radar, "Rev Growth")}, ROE ${r(radar, "ROE")}, D/E ${r(radar, "Low D/E")}.`;
    case "Soros":
      return `Momentum and reflexivity. Revenue growth ${r(radar, "Rev Growth")}, EPS growth ${r(radar, "EPS Growth")}, ROE ${r(radar, "ROE")}, op margin ${r(radar, "Op Margin")}, FCF margin ${r(radar, "FCF Margin")}.`;
    case "Dalio":
      return `All-Weather balance of risk. Beta ${r(radar, "Low Beta")}, D/E ${r(radar, "Low D/E")}, current ratio ${r(radar, "Current Ratio")}, Piotroski ${r(radar, "Piotroski")}, FCF margin ${r(radar, "FCF Margin")}.`;
    case "Munger":
      return `Quality business at a fair price. Gross margin ${r(radar, "Gross Margin")}, ROE ${r(radar, "ROE")}, op margin ${r(radar, "Op Margin")}, FCF margin ${r(radar, "FCF Margin")}, Piotroski ${r(radar, "Piotroski")}.`;
    default:
      return "";
  }
}

const dividerH = <div style={{ background: C.borderWeak, height: "1px", margin: "20px 0" }} />;

export function ValuationContext({
  strongBuyPrice, buyPrice, currentPrice, adjPrice, priceMode = "adj",
  guruData, showPriceTargets = true, metricHistory,
}: ValuationContextProps) {
  const mono = C.mono;

  const hasStrongBuy = strongBuyPrice != null && strongBuyPrice > 0 && currentPrice > 0;
  const hasBuy       = buyPrice != null && buyPrice > 0 && currentPrice > 0;
  const hasGuru      = guruData != null;

  const [activeGuru, setActiveGuru] = useState<string | null>(null);
  const [activeMetricIndex, setActiveMetricIndex] = useState(BOTTOM_INDEX);
  const [highlightVisible, setHighlightVisible] = useState(true);
  const touchInProgressRef = useRef(false);
  const fractionalRef = useRef(BOTTOM_INDEX);
  const highlightVisibleRef = useRef(true);
  const radarWrapperRef = useRef<HTMLDivElement>(null);

  const handleScrollProgress = useCallback((f: number) => {
    fractionalRef.current = f;
    // Direct DOM update — bypasses React render cycle entirely
    if (radarWrapperRef.current) {
      const wrapDeg    = (BOTTOM_INDEX - f) * DEG_PER_METRIC;
      const counterDeg = (f - BOTTOM_INDEX) * DEG_PER_METRIC;
      radarWrapperRef.current.style.transform = `rotate(${wrapDeg}deg)`;
      // Counter-rotation via CSS custom property so labels track the rotation
      // without triggering a Recharts re-render on every scroll frame
      radarWrapperRef.current.style.setProperty('--rdr-counter', `${counterDeg}deg`);
    }
    // Only trigger a React re-render when visibility actually toggles
    const nowVisible = Math.abs(f - activeMetricIndex) < 0.08;
    if (nowVisible !== highlightVisibleRef.current) {
      highlightVisibleRef.current = nowVisible;
      setHighlightVisible(nowVisible);
    }
  }, [activeMetricIndex]);

  // Sync --rdr-counter and restore highlight whenever the settled index changes
  useEffect(() => {
    if (radarWrapperRef.current) {
      const counterDeg = (activeMetricIndex - BOTTOM_INDEX) * DEG_PER_METRIC;
      radarWrapperRef.current.style.setProperty('--rdr-counter', `${counterDeg}deg`);
    }
    // Always restore highlight on settle (scroll events can't reliably do this
    // because they stop firing before highlightVisible gets a chance to flip back).
    // setState in effect is intentional here: we're responding to an external
    // carousel settle event, not creating an infinite loop.
    if (!highlightVisibleRef.current) {
      highlightVisibleRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHighlightVisible(true);
    }
  }, [activeMetricIndex]);

  // Must be before early return to satisfy Rules of Hooks
  const metricContexts = useMemo(() => {
    if (!metricHistory) return [];
    return computeMetricContexts(metricHistory);
  }, [metricHistory]);

  if (!hasStrongBuy && !hasBuy && !hasGuru) return null;

  const sbBelow  = hasStrongBuy && currentPrice > (strongBuyPrice as number);
  const sbColor  = sbBelow ? "#10d97e" : "#f5a020";
  const buyBelow = hasBuy && currentPrice <= (buyPrice as number);
  const buyColor = buyBelow ? "#10d97e" : "#f5a020";

  const refPrice  = priceMode === "listed" ? currentPrice : adjPrice;
  const hasRef    = refPrice != null && refPrice > 0;
  const diffLabel = priceMode === "listed" ? "vs listed price" : "vs adj. price";
  const fmtDiff   = (pct: number) => `${pct > 0 ? "+" : ""}${pct.toFixed(1)}% ${diffLabel}`;

  const sbDiffPct  = hasStrongBuy && hasRef ? (((strongBuyPrice as number) - (refPrice as number)) / (refPrice as number)) * 100 : null;
  const buyDiffPct = hasBuy && hasRef       ? (((buyPrice as number)       - (refPrice as number)) / (refPrice as number)) * 100 : null;

  const sbPanel: PanelData | null = hasStrongBuy ? {
    key: "strongbuy", title: "Strong Buy Below",
    value: `$${(strongBuyPrice as number).toFixed(2)}`,
    icon: sbBelow ? "▲▲" : null, color: sbColor,
    sub: sbDiffPct != null ? fmtDiff(sbDiffPct) : "",
  } : null;

  const buyPanel: PanelData | null = hasBuy ? {
    key: "buy", title: "Patient Buy Below",
    value: `$${(buyPrice as number).toFixed(2)}`,
    icon: buyBelow ? "▲" : null, color: buyColor,
    sub: buyDiffPct != null ? fmtDiff(buyDiffPct) : "",
  } : null;

  const panels = [sbPanel, buyPanel].filter((p): p is PanelData => p != null);
  const dividerV = <div style={{ background: C.borderWeak, width: "1px" }} />;

  // Guru radar colors
  const avgGuruScore = hasGuru
    ? guruData!.gurus.reduce((s, g) => s + g.score, 0) / guruData!.gurus.length
    : 0;
  const radarColor = avgGuruScore >= 8 ? "#10d97e" : avgGuruScore >= 4 ? "#f5a020" : "#e03030";

  const settledRotationDeg = (BOTTOM_INDEX - activeMetricIndex) * DEG_PER_METRIC;
  const hasContexts = metricContexts.length > 0;

  return (
    <div style={{ paddingTop: "8px" }}>
      <SectionLabel title="Valuation Context" />

      {/* Price target panels */}
      {showPriceTargets && panels.length > 0 && (
        <>
          <SectionLabel title="Price Targets" />
          <div className="rsp-valuation-grid" style={{ display: "grid", gridTemplateColumns: panels.length === 2 ? "1fr 1px 1fr" : "1fr", gap: 0 }}>
            {panels.length === 2 ? (<>
              <div style={{ paddingBottom: "14px" }}><Panel p={panels[0]} mono={mono} /></div>
              {dividerV}
              <div style={{ paddingBottom: "14px" }}><Panel p={panels[1]} mono={mono} /></div>
            </>) : (
              <div style={{ paddingBottom: "14px", gridColumn: "1 / -1" }}><Panel p={panels[0]} mono={mono} /></div>
            )}
          </div>
        </>
      )}

      {/* Guru radar */}
      {hasGuru && (<>
        {showPriceTargets && panels.length > 0 && dividerH}

        {/* Radar chart */}
        <SectionLabel
          title="Financial Health"
          badge={<span style={{ fontSize: 11, fontWeight: 700, color: radarColor, fontFamily: C.mono, letterSpacing: "0.05em" }}>{guruData!.overallScore}/100</span>}
        />
        <div ref={radarWrapperRef} style={{ transform: `rotate(${settledRotationDeg}deg)` }}>
          <RadarChartPanel
            radar={guruData!.radar}
            color={radarColor}
            highlightIndex={activeMetricIndex}
            highlightVisible={highlightVisible}
          />
        </div>

        {/* Expanded context carousel */}
        {hasContexts && (
          <>
            <div style={{ marginTop: 14 }}>
              <ExpandedContextCarousel
                contexts={metricContexts}
                radar={guruData!.radar}
                activeIndex={activeMetricIndex}
                onIndexChange={setActiveMetricIndex}
                onScrollProgress={handleScrollProgress}
              />
            </div>
          </>
        )}

        {dividerH}

        {/* Bar chart */}
        <SectionLabel title="Guru Scores" />
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {guruData!.gurus.map(guru => {
            const barColor = guru.score >= 8 ? "#10d97e" : guru.score >= 4 ? "#f5a020" : "#e03030";
            const pct = `${(guru.score / 10) * 100}%`;
            const isActive = activeGuru === guru.name;
            return (
              <div key={guru.name}>
                <div
                  role="button"
                  tabIndex={0}
                  style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
                  onTouchStart={() => { touchInProgressRef.current = true; }}
                  onTouchEnd={e => { e.preventDefault(); setActiveGuru(isActive ? null : guru.name); setTimeout(() => { touchInProgressRef.current = false; }, 300); }}
                  onMouseEnter={() => { if (!touchInProgressRef.current) setActiveGuru(guru.name); }}
                  onMouseLeave={() => { if (!touchInProgressRef.current) setActiveGuru(null); }}
                  onClick={() => setActiveGuru(isActive ? null : guru.name)}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setActiveGuru(isActive ? null : guru.name); }}
                >
                  <span style={{ width: 72, fontSize: 10, color: isActive ? C.text1 : C.text2, fontFamily: C.mono, flexShrink: 0, textAlign: "right", transition: "color 0.15s" }}>
                    {guru.name}
                  </span>
                  <div style={{ flex: "1 1 0", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: pct, height: "100%", background: barColor, borderRadius: 3, transition: "width 0.4s ease" }} />
                  </div>
                  <span style={{ width: 28, fontSize: 10, color: barColor, fontFamily: C.mono, flexShrink: 0, textAlign: "left" }}>
                    {guru.score}/10
                  </span>
                </div>
                {isActive && (
                  <div style={{
                    marginTop: 4,
                    marginLeft: 80,
                    marginRight: 36,
                    padding: "7px 10px",
                    border: `1px solid ${barColor}33`,
                    background: `${barColor}0d`,
                    fontSize: 10,
                    color: C.text2,
                    lineHeight: 1.5,
                  }}>
                    {getGuruReasoning(guru.name, guruData!.radar)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </>)}
    </div>
  );
}
