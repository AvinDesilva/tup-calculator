import { C } from "../../lib/theme.ts";
import { f } from "../../lib/utils.ts";
import type { TUPResult, PriceMode } from "../../lib/types.ts";

export interface MobileSummaryProps {
  result: TUPResult | null;
  currentPrice: number;
  adjPrice: number | undefined;
  priceMode: PriceMode;
  onPriceModeToggle: () => void;
  onGrowthStep: (delta: number) => void;
}

export function MobileSummary({ result, currentPrice, adjPrice, priceMode, onPriceModeToggle, onGrowthStep }: MobileSummaryProps) {
  const techStatus = result ? (
    result.paybackNote ? { label: "N/A", color: "#888", sym: "—" } :
    (!result.fallingKnife && result.sma200 > 0) ? { label: "Sound", color: "#00BFA5", sym: "✓" } :
    (result.fallingKnife && result.verdict === "spec_buy") ? { label: "Weak", color: "#f5a020", sym: "!" } :
    (result.fallingKnife && result.verdict === "avoid") ? { label: "Avoid", color: "#ff4136", sym: "⚠" } :
    null
  ) : null;

  return (
    <div className="rsp-mobile-summary" style={{ display: "none", animation: "fadeInUp 0.5s 0.2s ease both" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>{priceMode === "adj" ? "Adj. Price" : "Listed Price"}</div>
        <div style={{ fontFamily: C.mono, fontSize: "15px", fontWeight: 600, color: C.text1 }}>${f(priceMode === "adj" ? adjPrice : currentPrice)}</div>
        {currentPrice > 0 && (
          <button
            onClick={onPriceModeToggle}
            aria-label={`Switch to ${priceMode === "adj" ? "listed" : "adjusted"} price`}
            aria-pressed={priceMode === "listed"}
            style={{
              marginTop: "6px", fontSize: "9px", fontWeight: 700, letterSpacing: "0.1em",
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
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>Growth</div>
        <div style={{ fontFamily: C.mono, fontSize: "15px", fontWeight: 600, color: "#10d97e" }}>{result ? f(result.gr * 100) : "—"}%</div>
        <div style={{ display: "flex", gap: "4px", justifyContent: "center", marginTop: "4px" }}>
          <button
            onClick={() => onGrowthStep(-1)}
            aria-label="Decrease growth rate"
            style={{
              fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em",
              padding: "3px 10px",
              border: "1px solid rgba(255,77,0,0.3)",
              borderRadius: "10px",
              background: "transparent",
              color: "#FF4D00",
              cursor: "pointer", lineHeight: 1.4,
            }}
          >
            −
          </button>
          <button
            onClick={() => onGrowthStep(1)}
            aria-label="Increase growth rate"
            style={{
              fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em",
              padding: "3px 10px",
              border: "1px solid rgba(16,217,126,0.3)",
              borderRadius: "10px",
              background: "transparent",
              color: "#10d97e",
              cursor: "pointer", lineHeight: 1.4,
            }}
          >
            +
          </button>
        </div>
      </div>
      {techStatus && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>Technical</div>
          <div style={{ fontFamily: C.mono, fontSize: "15px", fontWeight: 600, color: techStatus.color }}>{techStatus.sym} {techStatus.label}</div>
        </div>
      )}
      {result?.tamWarning && (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>TAM</div>
          <div style={{ fontFamily: C.mono, fontSize: "15px", fontWeight: 600, color: "#f5a020" }}>⚠ Warn</div>
        </div>
      )}
    </div>
  );
}
