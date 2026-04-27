import { useState, useEffect, useRef } from "react";
import { VERDICT } from "../../lib/constants.ts";
import { f } from "../../lib/utils.ts";
import { useHoldRepeat } from "../primitives";
import { SlotCounter } from "./SlotCounter.tsx";
import type { VerdictCardProps } from "./VerdictCard.types.ts";

export function VerdictCard({ result, noiseFilter, onGrowthStep, onGrowthSet, currentPrice, growthScenario, onScenarioChange, hasScenarioData, priceMode, onPriceModeToggle, animationKey }: VerdictCardProps) {
  const holdDown = useHoldRepeat(() => onGrowthStep(-1));
  const holdUp   = useHoldRepeat(() => onGrowthStep(1));
  const [editingGrowth, setEditingGrowth] = useState(false);
  const [editGrowthVal, setEditGrowthVal] = useState("");
  const [completedKey, setCompletedKey] = useState(0);
  const [arrowTick, setArrowTick] = useState(0);
  const prevVerdictRef = useRef<string | null>(null);
  const [verdictCompletedFor, setVerdictCompletedFor] = useState<string | null>(null);

  useEffect(() => {
    if (animationKey === 0) return;
    const flip = setInterval(() => setArrowTick(t => t + 1), 100);
    const stop = setTimeout(() => { clearInterval(flip); setCompletedKey(animationKey); }, 650);
    return () => { clearInterval(flip); clearTimeout(stop); };
  }, [animationKey]);

  useEffect(() => {
    const verdict = result?.verdict ?? null;
    if (verdict === null || verdict === prevVerdictRef.current) return;
    prevVerdictRef.current = verdict;
    const flip = setInterval(() => setArrowTick(t => t + 1), 100);
    const stop = setTimeout(() => { clearInterval(flip); setVerdictCompletedFor(verdict); }, 650);
    return () => { clearInterval(flip); clearTimeout(stop); };
  }, [result?.verdict]);

  const isSpinning = (animationKey > 0 && animationKey !== completedKey) || (result?.verdict != null && result.verdict !== verdictCompletedFor);
  const arrowUp = arrowTick % 2 === 0;

  if (!result) return null;
  const v   = VERDICT[result.verdict];
  const paybackPct = Math.min(100, ((result.payback || 30) / 30) * 100);

  const labelStyle = {
    fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em",
    textTransform: "uppercase" as const, color: "#888888", marginBottom: "4px",
  };
  const valueStyle = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: "15px",
    fontWeight: 600, color: "#00BFA5",
  };

  const grPct = result.gr * 100;

  const stepBtnBase: React.CSSProperties = {
    flex: 1,
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    border: "none",
    cursor: "pointer",
    fontSize: "10px",
    fontWeight: 700,
    fontFamily: "'Space Grotesk', sans-serif",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    userSelect: "none",
    WebkitUserSelect: "none",
    MozUserSelect: "none",
    WebkitTouchCallout: "none",
    WebkitTapHighlightColor: "transparent",
  };

  if (noiseFilter) {
    return (
      <div style={{ padding: "48px 0 32px" }}>
        <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.25em", textTransform: "uppercase", color: "#888888", marginBottom: "16px" }}>
          Ignore the price. Focus on
        </div>
        <div style={{
          fontFamily: "'DM Serif Display', serif", fontWeight: 400,
          fontSize: result.paybackNote ? "clamp(2.64rem, 8.8vw, 5.28rem)" : "clamp(4.4rem, 12.32vw, 7.92rem)", lineHeight: 1,
          letterSpacing: "-0.03em",
        }}>
          <SlotCounter value={result.payback} paybackNote={result.paybackNote} color={v.color} animationKey={animationKey} />
        </div>
        <div style={{ fontSize: "13px", color: "#888888", marginTop: "12px", letterSpacing: "0.05em" }}>
          {result.paybackNote ? "Principal Uncalculable" : "Years Until Principal Returned"}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Giant number + verdict label */}
      <div className="rsp-verdict-hero" style={{ display: "flex", alignItems: "flex-end", gap: "20px", marginBottom: "12px" }}>
        <div className="rsp-verdict-num" style={{
          fontFamily: "'DM Serif Display', serif", fontWeight: 400,
          fontSize: result.paybackNote ? "clamp(2.64rem, 8.8vw, 5.28rem)" : "clamp(4.4rem, 12.32vw, 7.92rem)", lineHeight: 1,
          letterSpacing: "-0.03em",
        }}>
          <SlotCounter value={result.payback} paybackNote={result.paybackNote} color={v.color} animationKey={animationKey} />
        </div>
        <div style={{ paddingBottom: "8px" }}>
          <div className="rsp-verdict-label" style={{ fontSize: "22px", fontWeight: 700, color: v.color, letterSpacing: "-0.01em", fontFamily: "'Barlow Condensed', sans-serif" }}>
            {isSpinning ? (arrowUp ? "▲" : "▼") : v.icon} {v.label}
          </div>
          <div className="rsp-verdict-sub" style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#888888", marginTop: "4px" }}>
            {result.paybackNote ? "Principal Uncalculable" : "Years Until Principal Returned"}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div role="progressbar" aria-label="Payback progress" aria-valuenow={result.payback || 30} aria-valuemin={0} aria-valuemax={30} style={{ height: "3px", background: "rgba(255,255,255,0.04)", marginBottom: "7px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${paybackPct}%`, background: v.color, opacity: 0.5, transition: "width 0.7s ease" }} />
      </div>

      {/* Stats — stacked vertically */}
      <div className="rsp-verdict-stats" style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {/* Price mode row */}
        <div style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ ...labelStyle, marginBottom: 0 }}>{priceMode === "adj" ? "Adj. Price" : "Listed Price"}</div>
            {currentPrice > 0 && (
              <button
                onClick={onPriceModeToggle}
                aria-label={`Switch to ${priceMode === "adj" ? "listed" : "adjusted"} price mode`}
                aria-pressed={priceMode === "listed"}
                style={{
                  fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em",
                  textTransform: "uppercase", padding: "2px 6px",
                  border: `1px solid ${priceMode === "listed" ? "#C4A06E" : "rgba(255,255,255,0.15)"}`,
                  borderRadius: "10px",
                  background: priceMode === "listed" ? "rgba(196,160,110,0.15)" : "transparent",
                  color: priceMode === "listed" ? "#C4A06E" : "#555",
                  cursor: "pointer", lineHeight: 1.4,
                }}
              >
                {priceMode === "adj" ? "LISTED" : "ADJ"}
              </button>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            {priceMode === "adj" ? (
              <>
                {currentPrice > 0 && (
                  <>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", fontWeight: 400, color: "#666" }}>${f(currentPrice)}</span>
                    <span style={{ fontSize: "10px", color: "#555" }}>→</span>
                  </>
                )}
                <span style={valueStyle}>${f(result.adjPrice)}</span>
              </>
            ) : (
              <span style={valueStyle}>${f(currentPrice)}</span>
            )}
          </div>
        </div>
        {/* EPS Base */}
        <div style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={labelStyle}>EPS Base</div>
          <div style={valueStyle}>${f(result.epsBase)}</div>
        </div>
        {/* Growth + step buttons */}
        <div style={{ padding: "10px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={labelStyle}>Growth</div>
            {editingGrowth ? (
              <input
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
                aria-label="Edit growth rate"
                value={editGrowthVal}
                onChange={e => {
                  const s = e.target.value;
                  if (s === "" || /^\d*\.?\d*$/.test(s)) setEditGrowthVal(s);
                }}
                onBlur={() => {
                  const v = parseFloat(editGrowthVal);
                  if (!isNaN(v) && isFinite(v)) onGrowthSet(Math.min(v, 200));
                  setEditingGrowth(false);
                }}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    const v = parseFloat(editGrowthVal);
                    if (!isNaN(v) && isFinite(v)) onGrowthSet(Math.min(v, 200));
                    setEditingGrowth(false);
                  } else if (e.key === "Escape") {
                    setEditingGrowth(false);
                  }
                }}
                style={{
                  width: "60px", background: "rgba(255,255,255,0.08)", border: "1px solid #C4A06E",
                  color: "#e8e4dc", fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 600,
                  textAlign: "right", padding: "2px 4px", borderRadius: "2px",
                }}
              />
            ) : (
              <button
                onClick={() => { setEditingGrowth(true); setEditGrowthVal(f(grPct)); }}
                aria-label={`Edit growth rate, currently ${f(grPct)}%`}
                style={{
                  background: "none", border: "none", padding: "1px 2px",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 600, color: "#10d97e",
                  cursor: "pointer", borderBottom: "1px dashed rgba(255,255,255,0.12)",
                }}
              >
                {f(grPct)}%
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {hasScenarioData && (
              <div style={{ display: "flex", flex: 3 }}>
                {(["bear", "base", "bull"] as const).map((s, i) => {
                  const colors: Record<string, { active: string; activeBg: string; border: string; idleBg: string; idleBorder: string; idleColor: string; idleGlow: string; activeGlow: string }> = {
                    bear: { active: "#FF4D00", activeBg: "rgba(255,77,0,0.2)", border: "#FF4D00", idleBg: "rgba(255,77,0,0.05)", idleBorder: "rgba(255,77,0,0.25)", idleColor: "rgba(255,77,0,0.5)", idleGlow: "0 0 6px rgba(255,77,0,0.15)", activeGlow: "0 0 12px rgba(255,77,0,0.35)" },
                    base: { active: "#999", activeBg: "rgba(255,255,255,0.1)", border: "#666", idleBg: "transparent", idleBorder: "rgba(255,255,255,0.1)", idleColor: "#555", idleGlow: "none", activeGlow: "none" },
                    bull: { active: "#00897B", activeBg: "rgba(0,137,123,0.2)", border: "#00897B", idleBg: "rgba(0,137,123,0.05)", idleBorder: "rgba(0,137,123,0.25)", idleColor: "rgba(0,137,123,0.5)", idleGlow: "0 0 6px rgba(0,137,123,0.15)", activeGlow: "0 0 12px rgba(0,137,123,0.35)" },
                  };
                  const c = colors[s];
                  const isActive = growthScenario === s;
                  return (
                    <button key={s} aria-pressed={growthScenario === s} onClick={() => onScenarioChange(s)} style={{
                      fontSize: "11px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
                      letterSpacing: "0.05em", padding: "2px 6px", height: "30px", flex: 1,
                      background: isActive ? c.activeBg : c.idleBg,
                      border: `1px solid ${isActive ? c.border : c.idleBorder}`,
                      color: isActive ? c.active : c.idleColor,
                      boxShadow: isActive ? c.activeGlow : c.idleGlow,
                      cursor: "pointer",
                      borderRadius: i === 0 ? "3px 0 0 3px" : i === 2 ? "0 3px 3px 0" : "0",
                      marginLeft: i > 0 ? "-1px" : "0",
                    }}>{s}</button>
                  );
                })}
              </div>
            )}
            <div className="rsp-growth-step-btns" style={{ display: "flex", gap: "6px", flex: 1 }}>
              <button
                {...holdDown}
                aria-label="Decrease growth rate"
                onClick={e => e.preventDefault()}
                style={{
                  ...stepBtnBase,
                  background: "rgba(255,77,0,0.10)",
                  color: "#FF4D00",
                  borderLeft: "2px solid rgba(255,77,0,0.3)",
                }}
              >
                <span style={{ fontSize: "11px", lineHeight: 1 }}>−</span>
              </button>
              <button
                {...holdUp}
                aria-label="Increase growth rate"
                onClick={e => e.preventDefault()}
                style={{
                  ...stepBtnBase,
                  background: "rgba(16,217,126,0.10)",
                  color: "#10d97e",
                  borderRight: "2px solid rgba(16,217,126,0.3)",
                }}
              >
                <span style={{ fontSize: "11px", lineHeight: 1 }}>+</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="rsp-verdict-warnings">

      {/* Payback note — shown when calculation is broken */}
      {result.paybackNote && (
        <div style={{ marginTop: "12px", marginBottom: "16px", padding: "14px 16px", borderLeft: "2px solid #888", borderTop: "1px solid rgba(136,136,136,0.2)", borderRight: "1px solid rgba(136,136,136,0.2)", borderBottom: "1px solid rgba(136,136,136,0.2)", background: "rgba(136,136,136,0.05)" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <span style={{ color: "#888", fontSize: "14px", fontWeight: 700, flexShrink: 0, lineHeight: 1.2, fontFamily: "'JetBrains Mono', monospace" }}>—</span>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
                Calculation Not Applicable
              </div>
              <p style={{ fontSize: "11px", color: "rgba(136,136,136,0.7)", lineHeight: 1.75, margin: 0 }}>
                {result.paybackNote}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Technical status */}
      {!result.paybackNote && !result.fallingKnife && result.sma200 > 0 && (
        <div style={{ marginTop: "12px", marginBottom: "16px", padding: "14px 16px", borderLeft: "2px solid #00BFA5", borderTop: "1px solid rgba(0,191,165,0.2)", borderRight: "1px solid rgba(0,191,165,0.2)", borderBottom: "1px solid rgba(0,191,165,0.2)", background: "rgba(0,191,165,0.05)" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <span style={{ color: "#00BFA5", fontSize: "14px", fontWeight: 700, flexShrink: 0, lineHeight: 1.2, fontFamily: "'JetBrains Mono', monospace" }}>✓</span>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#00BFA5", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
                Technically Sound
              </div>
              <p style={{ fontSize: "11px", color: "rgba(0,191,165,0.7)", lineHeight: 1.75, margin: 0 }}>
                Price is trading above the 200-day SMA{result.sma200 > 0 ? ` of $${f(result.sma200)}` : ""}, confirming an uptrend.
              </p>
            </div>
          </div>
        </div>
      )}
      {result.fallingKnife && result.verdict === "spec_buy" && (
        <div style={{ marginTop: "12px", marginBottom: "16px", padding: "14px 16px", borderLeft: "2px solid #f5a020", borderTop: "1px solid rgba(245,160,32,0.2)", borderRight: "1px solid rgba(245,160,32,0.2)", borderBottom: "1px solid rgba(245,160,32,0.2)", background: "rgba(245,160,32,0.05)" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <span style={{ color: "#f5a020", fontSize: "14px", fontWeight: 700, flexShrink: 0, lineHeight: 1.2, fontFamily: "'JetBrains Mono', monospace" }}>!</span>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "#f5a020", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
                Warning: Technically Weak
              </div>
              <p style={{ fontSize: "11px", color: "#d4923c", lineHeight: 1.75, margin: 0 }}>
                The math suggests a Buy, but the stock is in a downtrend (trading below its 200-day SMA
                {result.sma200 > 0 ? ` of $${f(result.sma200)}` : ""}).{" "}
                Consider scaling in <strong style={{ color: "#f5a020" }}>only after price stabilizes above the 200-day SMA</strong>.
              </p>
            </div>
          </div>
        </div>
      )}
      {result.fallingKnife && result.verdict === "avoid" && (
        <div style={{ marginTop: "12px", padding: "10px 14px", borderLeft: "2px solid #ff4136", borderTop: "1px solid rgba(255,65,54,0.15)", borderRight: "1px solid rgba(255,65,54,0.15)", borderBottom: "1px solid rgba(255,65,54,0.15)", display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ color: "#ff4136" }}>⚠</span>
          <span style={{ fontSize: "11px", color: "#ff4136" }}>Falling Knife — Price below 200-day SMA. Technical avoid.</span>
        </div>
      )}
      {result.tamWarning && (
        <div style={{ marginTop: "8px", padding: "10px 14px", borderLeft: "2px solid #f5a020", borderTop: "1px solid rgba(245,160,32,0.15)", borderRight: "1px solid rgba(245,160,32,0.15)", borderBottom: "1px solid rgba(245,160,32,0.15)", display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ color: "#f5a020" }}>⚠</span>
          <span style={{ fontSize: "11px", color: "#f5a020" }}>TAM Warning — Implied Y10 revenue exceeds $5T. Growth may be unrealistic.</span>
        </div>
      )}

      </div>
    </>
  );
}
