import { VERDICT, STD_THRESHOLD, PP_THRESHOLD } from "../lib/constants.ts";
import { f } from "../lib/utils.ts";
import { useHoldRepeat } from "./ui.tsx";
import type { TUPResult, Mode } from "../lib/types.ts";

interface VerdictCardProps {
  result: TUPResult | null;
  mode: Mode;
  noiseFilter: boolean;
  onGrowthStep: (delta: number) => void;
  currentPrice: number;
}

export function VerdictCard({ result, mode, noiseFilter, onGrowthStep, currentPrice }: VerdictCardProps) {
  if (!result) return null;
  const v   = VERDICT[result.verdict];
  const thr = mode === "standard" ? STD_THRESHOLD : PP_THRESHOLD;
  const paybackPct = Math.min(100, ((result.payback || 30) / 30) * 100);

  const holdDown = useHoldRepeat(() => onGrowthStep(-1));
  const holdUp   = useHoldRepeat(() => onGrowthStep(1));

  const labelStyle = {
    fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em",
    textTransform: "uppercase" as const, color: "#888888", marginBottom: "4px",
  };
  const valueStyle = {
    fontFamily: "'JetBrains Mono', monospace", fontSize: "15px",
    fontWeight: 600, color: "#00BFA5",
  };
  const arrowBtnStyle: React.CSSProperties = {
    width: "24px", height: "24px",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
    color: "#888888", cursor: "pointer", fontSize: "10px",
    fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, lineHeight: 1,
    padding: 0, userSelect: "none",
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
          fontSize: "clamp(5rem, 14vw, 9rem)", lineHeight: 1,
          color: v.color, letterSpacing: "-0.03em",
        }}>
          {result.payback || "30+"}
        </div>
        <div style={{ fontSize: "13px", color: "#888888", marginTop: "12px", letterSpacing: "0.05em" }}>Years Until Principal Returned</div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: "4px" }}>
      {/* Giant number + verdict label */}
      <div className="rsp-verdict-hero" style={{ display: "flex", alignItems: "flex-end", gap: "20px", marginBottom: "12px" }}>
        <div className="rsp-verdict-num" style={{
          fontFamily: "'DM Serif Display', serif", fontWeight: 400,
          fontSize: "clamp(5rem, 14vw, 9rem)", lineHeight: 1,
          color: v.color, letterSpacing: "-0.03em",
        }}>
          {result.payback || "30+"}
        </div>
        <div style={{ paddingBottom: "8px" }}>
          <div className="rsp-verdict-label" style={{ fontSize: "22px", fontWeight: 700, color: v.color, letterSpacing: "-0.01em", fontFamily: "'Barlow Condensed', sans-serif" }}>
            {v.icon} {v.label}
          </div>
          <div className="rsp-verdict-sub" style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#888888", marginTop: "4px" }}>
            Years Until Principal Returned
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: "3px", background: "rgba(255,255,255,0.04)", marginBottom: "12px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${paybackPct}%`, background: v.color, opacity: 0.5, transition: "width 0.7s ease" }} />
      </div>

      {/* Stats — stacked vertically */}
      <div className="rsp-verdict-stats" style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {/* Adj. Price */}
        <div style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={labelStyle}>Adj. Price</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            {currentPrice > 0 && (
              <>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", fontWeight: 400, color: "#666" }}>${f(currentPrice)}</span>
                <span style={{ fontSize: "10px", color: "#555" }}>→</span>
              </>
            )}
            <span style={valueStyle}>${f(result.adjPrice)}</span>
          </div>
        </div>
        {/* EPS Base */}
        <div style={{ padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={labelStyle}>EPS Base</div>
          <div style={valueStyle}>${f(result.epsBase)}</div>
        </div>
        {/* Growth + Change Rate button */}
        <div style={{ padding: "10px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={labelStyle}>Growth</div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button {...holdDown} onClick={e => e.preventDefault()} style={arrowBtnStyle}>▼</button>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 600, color: "#10d97e" }}>
              {f(result.gr * 100)}%
            </span>
            <button {...holdUp} onClick={e => e.preventDefault()} style={arrowBtnStyle}>▲</button>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {result.fallingKnife && result.verdict === "spec_buy" && (
        <div style={{ marginTop: "16px", marginBottom: "30px", padding: "14px 16px", borderLeft: "2px solid #f5a020", borderTop: "1px solid rgba(245,160,32,0.2)", borderRight: "1px solid rgba(245,160,32,0.2)", borderBottom: "1px solid rgba(245,160,32,0.2)", background: "rgba(245,160,32,0.05)" }}>
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
        <div style={{ marginTop: "16px", padding: "10px 14px", borderLeft: "2px solid #ff4136", borderTop: "1px solid rgba(255,65,54,0.15)", borderRight: "1px solid rgba(255,65,54,0.15)", borderBottom: "1px solid rgba(255,65,54,0.15)", display: "flex", gap: "8px", alignItems: "center" }}>
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
  );
}
