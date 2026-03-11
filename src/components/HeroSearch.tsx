import { C } from "../lib/theme.ts";
import { TickerSearch } from "./TickerSearch.tsx";

interface HeroSearchProps {
  ticker: string;
  onTickerChange: (v: string) => void;
  onTickerSelect: (v: string) => void;
  onFetch: () => void;
  loading: boolean;
  error: string;
  onRollDice: () => void;
  rollingDice: boolean;
}

export function HeroSearch({ ticker, onTickerChange, onTickerSelect, onFetch, loading, error, onRollDice, rollingDice }: HeroSearchProps) {
  return (
    <section className="rsp-hero-section" style={{ padding: "0 0 96px", display: "flex", flexDirection: "column", alignItems: "center", animation: "fadeInUp 0.5s 0.1s ease both" }}>
      <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", color: C.text3, marginBottom: "24px", marginTop: "24px" }}>
        Stock Valuation Engine
      </div>
      <h2 style={{
        fontFamily: C.serif,
        fontWeight: 400,
        fontSize: "clamp(2.6rem, 6vw, 4.2rem)",
        lineHeight: 1.15,
        letterSpacing: "-0.02em",
        color: C.text1,
        textAlign: "center",
        margin: "0 0 48px",
        maxWidth: "900px",
      }}>
        Search Any Company<br />to Calculate<br /><em style={{ color: C.accent }}>Time Until Payback</em>
      </h2>

      <div className="rsp-hero-row" style={{ position: "relative", width: "100%", maxWidth: "600px", display: "flex", gap: "0", border: `2px solid ${C.accent}`, animation: "heroGlow 2.4s ease-in-out infinite" }}>
        <TickerSearch
          value={ticker}
          onChange={onTickerChange}
          onSelect={onTickerSelect}
          onSubmit={onFetch}
          placeholder="Search..."
          inputStyle={{
            flex: 1,
            background: "transparent",
            border: "none",
            padding: "16px 20px",
            fontSize: "18px",
            fontFamily: C.mono,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: C.text1,
            outline: "none",
            minWidth: 0,
          }}
        />
        <button className="rsp-hero-btn" onClick={() => onFetch()} disabled={loading} style={{
          padding: "16px 24px",
          background: C.accent,
          color: "#080808",
          border: "none",
          borderLeft: `2px solid ${C.accent}`,
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: C.body,
          flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          whiteSpace: "nowrap",
        }}>
          {loading ? (
            <>
              <svg style={{ animation: "spin 1s linear infinite", width: "12px", height: "12px" }} viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Fetching…
            </>
          ) : "Calculate →"}
        </button>
      </div>

      {error && <div style={{ marginTop: "12px", fontSize: "11px", color: "#ff4136" }}>{error}</div>}

      <button onClick={onRollDice} disabled={rollingDice || loading} style={{
        marginTop: "20px",
        padding: "10px 24px",
        background: "transparent",
        color: C.accent,
        border: `1px solid ${C.accent}`,
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        cursor: (rollingDice || loading) ? "not-allowed" : "pointer",
        fontFamily: C.body,
        opacity: (rollingDice || loading) ? 0.5 : 1,
        transition: "opacity 0.15s",
      }}>
        🎲 {rollingDice ? "Rolling..." : "Roll the TUP Dice"}
      </button>

      <div style={{ marginTop: "12px", fontSize: "10px", color: C.text3, letterSpacing: "0.08em" }}>
        Search by company name or ticker · US, UK & Canadian markets
      </div>
    </section>
  );
}
