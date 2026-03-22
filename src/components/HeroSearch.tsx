import { C } from "../lib/theme.ts";
import { TickerSearch } from "./TickerSearch.tsx";
import { ErrorDisplay } from "./ui.tsx";
import { DiceFilterBar } from "./DiceFilterBar.tsx";
import type { RollFilters } from "../lib/types.ts";

interface HeroSearchProps {
  ticker: string;
  onTickerChange: (v: string) => void;
  onTickerSelect: (v: string) => void;
  onFetch: () => void;
  loading: boolean;
  error: string;
  onRollDice: () => void;
  rollingDice: boolean;
  dicePhrase: string;
  isFilterOpen: boolean;
  onToggleFilter: () => void;
  rollFilters: RollFilters;
  onApplyFilters: (f: RollFilters) => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export function HeroSearch({ ticker, onTickerChange, onTickerSelect, onFetch, loading, error, onRollDice, rollingDice, dicePhrase, isFilterOpen, onToggleFilter, rollFilters, onApplyFilters, onResetFilters, hasActiveFilters }: HeroSearchProps) {
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
            width: "100%",
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
              <svg aria-hidden="true" style={{ animation: "spin 1s linear infinite", width: "12px", height: "12px" }} viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Fetching…
            </>
          ) : "Calculate →"}
        </button>
      </div>

      {error && <div style={{ marginTop: "12px", fontSize: "11px", textAlign: "center" }}><ErrorDisplay error={error} /></div>}

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "20px" }}>
        <button onClick={onRollDice} disabled={rollingDice || loading} style={{
          position: "relative",
          padding: "clamp(6px, 1.5vw, 12px) clamp(14px, 4vw, 32px)",
          background: "transparent",
          color: C.accent,
          border: `1px solid ${C.accent}`,
          fontSize: "clamp(11px, 3.8vw, 18px)",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          cursor: (rollingDice || loading) ? "not-allowed" : "pointer",
          fontFamily: C.body,
          opacity: (rollingDice || loading) ? 0.5 : 1,
          transition: "opacity 0.15s",
        }}>
          {hasActiveFilters && <span aria-hidden="true" style={{ position: "absolute", top: "-3px", right: "-3px", width: "6px", height: "6px", borderRadius: "50%", background: "#00BFA5", boxShadow: "0 0 4px rgba(0,191,165,0.6)" }} />}
          {rollingDice ? dicePhrase : "Roll the TUP Dice"} <span style={rollingDice ? { display: "inline-block", animation: "spin 0.6s linear infinite" } : undefined}>🎲</span>
        </button>
        <button onClick={onToggleFilter} aria-label="Dice roll filters" aria-expanded={isFilterOpen} aria-haspopup="true" style={{
          width: "clamp(32px, 8vw, 48px)", height: "clamp(32px, 8vw, 48px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "transparent",
          border: `1px solid ${hasActiveFilters ? "#C4A06E" : "rgba(255,255,255,0.15)"}`,
          color: hasActiveFilters ? "#C4A06E" : "#666",
          cursor: "pointer",
          transition: "all 0.15s",
          flexShrink: 0,
        }}>
          <svg aria-hidden="true" width="clamp(14px, 4vw, 24px)" height="clamp(14px, 4vw, 24px)" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
            <circle cx="8" cy="6" r="2" fill="currentColor" />
            <circle cx="16" cy="12" r="2" fill="currentColor" />
            <circle cx="10" cy="18" r="2" fill="currentColor" />
          </svg>
        </button>
      </div>

      <div style={{ width: "100%", maxWidth: "700px" }}>
        <DiceFilterBar
          isOpen={isFilterOpen}
          activeFilters={rollFilters}
          onApply={onApplyFilters}
          onReset={onResetFilters}
          variant="hero"
        />
      </div>

      <div style={{ marginTop: "16px", fontSize: "10px", color: C.text3, letterSpacing: "0.08em", textAlign: "center" }}>
        Search by company name or ticker — US, UK & Canadian markets
        <span style={{ margin: "0 8px", opacity: 0.4 }}>·</span>
        For educational purposes only. Not financial advice.
      </div>
    </section>
  );
}
