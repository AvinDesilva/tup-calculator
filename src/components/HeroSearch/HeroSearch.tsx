import { C } from "../../lib/theme.ts";
import { TickerSearch } from "../TickerSearch";
import { ErrorDisplay } from "../primitives";
import { DiceFilterBar } from "../DiceFilterBar";
import type { HeroSearchProps } from "./HeroSearch.types.ts";

export function HeroSearch({ ticker, onTickerChange, onTickerSelect, onFetch, loading, error, onRollDice, onCancelDice, rollingDice, dicePhrase, isFilterOpen, onToggleFilter, rollFilters, onApplyFilters, onResetFilters, hasActiveFilters }: HeroSearchProps) {
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

      <div className="rsp-hero-row" style={{ position: "relative", width: "100%", maxWidth: "700px", display: "flex", gap: "8px", alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", border: `2px solid ${C.accent}`, animation: "heroGlow 2.4s ease-in-out infinite" }}>
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
        </div>
        {rollingDice && (
          <button onClick={onCancelDice} aria-label="Cancel dice roll" style={{
            width: "52px", height: "52px",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent",
            border: "1px solid #FF4D00",
            color: "#FF4D00",
            cursor: "pointer",
            transition: "all 0.15s",
            flexShrink: 0,
          }}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        )}
        <button onClick={onRollDice} disabled={loading || rollingDice} style={{
          position: "relative",
          padding: "16px 20px",
          background: "transparent",
          color: C.accent,
          border: `1px solid ${C.accent}`,
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          cursor: (loading || rollingDice) ? "not-allowed" : "pointer",
          fontFamily: C.body,
          opacity: loading ? 0.5 : 1,
          transition: "all 0.15s",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}>
          {hasActiveFilters && !rollingDice && <span aria-hidden="true" style={{ position: "absolute", top: "-3px", right: "-3px", width: "6px", height: "6px", borderRadius: "50%", background: "#00BFA5", boxShadow: "0 0 4px rgba(0,191,165,0.6)" }} />}
          {rollingDice ? <>{dicePhrase} <span>🎲</span></> : <>Roll Dice <span>🎲</span></>}
        </button>
        <button onClick={onToggleFilter} aria-label="Dice roll filters" aria-expanded={isFilterOpen} aria-haspopup="true" style={{
          width: "52px", height: "52px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "transparent",
          border: `1px solid ${hasActiveFilters ? "#C4A06E" : "rgba(255,255,255,0.15)"}`,
          color: hasActiveFilters ? "#C4A06E" : "#666",
          cursor: "pointer",
          transition: "all 0.15s",
          flexShrink: 0,
        }}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="18" x2="20" y2="18" />
            <circle cx="8" cy="6" r="2" fill="currentColor" />
            <circle cx="16" cy="12" r="2" fill="currentColor" />
            <circle cx="10" cy="18" r="2" fill="currentColor" />
          </svg>
        </button>
      </div>

      {error && <div style={{ marginTop: "12px", fontSize: "11px", textAlign: "center" }}><ErrorDisplay error={error} /></div>}

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
