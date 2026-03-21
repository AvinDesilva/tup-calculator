import { C, toggleBtn } from "../lib/theme.ts";

interface MastheadProps {
  company: string;
  meta: { sector: string; industry: string };
  isConverted: boolean;
  currencyNote: string;
  onShowMethodology: () => void;
  onReset?: () => void;
}

export function Masthead({ company, meta, isConverted, currencyNote, onShowMethodology, onReset }: MastheadProps) {
  return (
    <header className="rsp-header" style={{
      paddingTop: "28px",
      paddingBottom: "20px",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "16px",
      flexWrap: "wrap",
      borderBottom: `2px solid ${C.accent}`,
      animation: "fadeInUp 0.4s ease both",
    }}>
      <div>
        {onReset ? (
          <button
            onClick={onReset}
            aria-label="Reset calculator and return to search"
            style={{ display: "flex", alignItems: "baseline", gap: "10px", cursor: "pointer", background: "none", border: "none", padding: 0 }}
          >
            <h1 style={{
              fontFamily: C.serif,
              fontWeight: 400,
              fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: C.text1,
              margin: 0,
            }}>TUP</h1>
            <span style={{
              fontFamily: C.serif,
              fontWeight: 400,
              fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: C.text2,
            }}>Calculator</span>
          </button>
        ) : (
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
            <h1 style={{
              fontFamily: C.serif,
              fontWeight: 400,
              fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: C.text1,
              margin: 0,
            }}>TUP</h1>
            <span style={{
              fontFamily: C.serif,
              fontWeight: 400,
              fontSize: "clamp(2.4rem, 5vw, 3.8rem)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color: C.text2,
            }}>Calculator</span>
          </div>
        )}
        <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.text3, marginTop: "4px" }}>
          Time Until Payback — Stock Valuation Engine
        </div>
      </div>

      <div className="rsp-header-toggles" style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, paddingTop: "6px" }}>
        <button className="rsp-methodology-btn" onClick={onShowMethodology} style={toggleBtn(false)}>
          Read Methodology →
        </button>
      </div>

      {company && (
        <div
          tabIndex={0}
          aria-label={`${company}${meta.sector ? `, ${meta.sector}, ${meta.industry}` : ""}`}
          className="rsp-company-info"
          style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", animation: "fadeInUp 0.3s ease both", width: "100%" }}
        >
          <span style={{ fontFamily: C.display, fontSize: "20px", fontWeight: 700, color: C.text1, letterSpacing: "0.04em", textTransform: "uppercase" }}>{company}</span>
          {meta.sector && (
            <span style={{ fontSize: "10px", color: C.text2, letterSpacing: "0.05em" }}>{meta.sector} · {meta.industry}</span>
          )}
          {isConverted && (
            <span title={currencyNote} style={{
              fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
              color: C.accent, border: `1px solid rgba(196,160,110,0.35)`, padding: "2px 7px",
              cursor: "help", flexShrink: 0,
            }}>
              ↔ FX Normalized
            </span>
          )}
        </div>
      )}
    </header>
  );
}
