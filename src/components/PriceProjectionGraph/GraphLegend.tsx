import type { GrowthScenario } from "../../lib/types.ts";
import { COLORS, SCENARIO_RGBA, smaColor } from "./constants.ts";

interface GraphLegendProps {
  growthScenario: GrowthScenario;
  onScenarioChange?: (s: GrowthScenario) => void;
  showSma: boolean;
  setShowSma: React.Dispatch<React.SetStateAction<boolean>>;
  sma200: number;
  body: string;
  introScenario?: GrowthScenario | null;
  introPending?: boolean;
  onIntroCancel?: () => void;
}

const legendItems: Array<{ key: GrowthScenario; label: string }> = [
  { key: "bear", label: "Bear" },
  { key: "base", label: "Base" },
  { key: "bull", label: "Bull" },
];

export function GraphLegend({ growthScenario, onScenarioChange, showSma, setShowSma, sma200, body, introScenario, introPending, onIntroCancel }: GraphLegendProps) {
  // Longer transitions during the intro cycle so each button fades in/out smoothly;
  // snappy (0.15s) for normal user interaction.
  const dur = introScenario != null ? "0.3s" : "0.15s";

  return (
    <div role="group" aria-label="Projection scenario" style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: "10px", flexShrink: 0 }}>
      {legendItems.map(({ key, label }, i) => {
        const activeScenario = introPending ? null : (introScenario ?? growthScenario);
        const active = activeScenario === key;
        const color = COLORS[key];
        const rgba = SCENARIO_RGBA[key];
        return (
          <button
            key={key}
            onClick={() => { onIntroCancel?.(); onScenarioChange?.(key); }}
            aria-pressed={active}
            aria-label={`${label} scenario`}
            style={{
              display: "flex", alignItems: "center",
              opacity: active ? 1 : 0.45,
              cursor: onScenarioChange ? "pointer" : "default",
              padding: "5px 18px",
              width: "83px",
              justifyContent: "center",
              border: `1px solid ${active ? color : rgba.border}`,
              marginLeft: i > 0 ? "-1px" : 0,
              background: active ? color : rgba.bg,
              transition: `opacity ${dur}, background ${dur}, color ${dur}, border-color ${dur}`,
              position: "relative",
              zIndex: active ? 1 : 0,
            }}
          >
            <span style={{ fontSize: "9px", fontFamily: body, letterSpacing: "0.1em", textTransform: "uppercase", color: active ? "#000" : color, fontWeight: 700, transition: `color ${dur}` }}>
              {label}
            </span>
          </button>
        );
      })}

      {/* SMA toggle — same box style */}
      {sma200 > 0 && (
        <button
          onClick={() => setShowSma(s => !s)}
          aria-pressed={showSma}
          aria-label="Toggle 200-day SMA line"
          style={{
            display: "flex", alignItems: "center",
            opacity: showSma ? 1 : 0.45,
            cursor: "pointer",
            padding: "5px 18px",
            border: `1px solid ${SCENARIO_RGBA.sma.border}`,
            marginLeft: "-1px",
            background: SCENARIO_RGBA.sma.bg,
            transition: "opacity 0.15s",
            position: "relative",
            zIndex: showSma ? 1 : 0,
          }}
        >
          <span style={{ fontSize: "9px", fontFamily: body, letterSpacing: "0.1em", textTransform: "uppercase", color: smaColor, fontWeight: 700 }}>
            200 SMA
          </span>
        </button>
      )}
    </div>
  );
}
