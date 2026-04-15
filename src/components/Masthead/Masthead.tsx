import { C, toggleBtn } from "../../lib/theme.ts";
import type { MastheadProps } from "./Masthead.types.ts";

export function Masthead({ onShowMethodology, onReset }: MastheadProps) {
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
        <button onClick={onShowMethodology} style={{ ...toggleBtn(false), marginTop: "6px" }}>
          Read Methodology →
        </button>
      </div>
    </header>
  );
}
