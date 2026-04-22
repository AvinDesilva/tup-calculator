import { useState } from "react";
import { C, inputShared } from "../../lib/theme.ts";
import { TickerSearch } from "../TickerSearch";
import { ErrorDisplay } from "../primitives";
import { DiceFilterBar } from "../DiceFilterBar";
import type { CompactTickerBarProps } from "./CompactTickerBar.types.ts";

export function CompactTickerBar({ ticker, onTickerChange, onTickerSelect, onFetch, loading, error, fetchLog, onRollDice, onCancelDice, rollingDice, dicePhrase, isFilterOpen, onToggleFilter, rollFilters, onApplyFilters, onResetFilters, hasActiveFilters }: CompactTickerBarProps) {
  const [hovered, setHovered] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  return (
    <section className="rsp-ticker-bar" style={{ background: C.bg, paddingTop: "12px", paddingBottom: "20px", borderBottom: `1px solid ${C.borderWeak}`, animation: "fadeInUp 0.4s ease both" }}>
      <div className="rsp-api-bar" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ display: "flex", alignItems: "center", gap: "8px", border: `1px solid ${hovered ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)"}`, boxShadow: hovered ? "0 0 12px rgba(255,255,255,0.08)" : "none", padding: "10px 18px", borderRadius: "4px", transition: "border-color 0.2s, box-shadow 0.2s" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.text2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <TickerSearch
            value={ticker}
            onChange={onTickerChange}
            onSelect={onTickerSelect}
            onSubmit={onFetch}
            placeholder="click to search..."
            inputStyle={{ ...inputShared, letterSpacing: "0.12em", textTransform: "uppercase", paddingBottom: 0, borderBottom: "none", lineHeight: 1, position: "relative", top: "-1.5px", height: "32px" }}
            onFocus={e => (e.target.style.borderBottomColor = C.accent)}
            onBlur={e => (e.target.style.borderBottomColor = C.borderWeak)}
            onOpenChange={setDropdownOpen}
          />
        </div>
        <div className="rsp-api-bar-btn" style={{ display: dropdownOpen ? "none" : "flex", gap: "8px", flexShrink: 0 }}>
          {loading && !rollingDice && (
            <div style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg aria-hidden="true" style={{ animation: "spin 1s linear infinite", width: "14px", height: "14px", color: C.text3 }} viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          )}
          {rollingDice && (
            <button onClick={onCancelDice} aria-label="Cancel dice roll" style={{
              width: "32px", height: "32px",
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent",
              border: "1px solid #FF4D00",
              color: "#FF4D00",
              cursor: "pointer",
              flexShrink: 0,
              transition: "all 0.15s",
            }}>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          )}
          <button onClick={onRollDice} disabled={loading || rollingDice} style={{
            position: "relative",
            ...(rollingDice ? { padding: "8px 12px", whiteSpace: "nowrap" as const, fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, fontFamily: C.body } : { width: "32px", height: "32px", fontSize: "16px" }),
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent",
            color: C.accent,
            border: `1px solid ${C.accent}`,
            cursor: (loading || rollingDice) ? "not-allowed" : "pointer",
            transition: "all 0.15s",
            opacity: loading ? 0.5 : 1,
            flexShrink: 0,
          }}>
            {hasActiveFilters && !rollingDice && <span aria-hidden="true" style={{ position: "absolute", top: "-3px", right: "-3px", width: "6px", height: "6px", borderRadius: "50%", background: "#00BFA5", boxShadow: "0 0 4px rgba(0,191,165,0.6)" }} />}
            {rollingDice ? <>{dicePhrase} <span>🎲</span></> : <span>🎲</span>}
          </button>
          <button onClick={onToggleFilter} aria-label="Dice roll filters" aria-expanded={isFilterOpen} aria-haspopup="true" style={{
            width: "32px", height: "32px",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: hasActiveFilters ? "rgba(196,160,110,0.1)" : "transparent",
            border: `1px solid ${hasActiveFilters ? "#C4A06E" : "rgba(255,255,255,0.1)"}`,
            color: hasActiveFilters ? "#C4A06E" : "#666",
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 0.15s",
          }}>
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
              <circle cx="8" cy="6" r="2" fill="currentColor" />
              <circle cx="16" cy="12" r="2" fill="currentColor" />
              <circle cx="10" cy="18" r="2" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
      {error && <div style={{ marginTop: "6px", fontSize: "11px" }}><ErrorDisplay error={error} style={{ fontSize: "11px" }} /></div>}

      <DiceFilterBar
        isOpen={isFilterOpen}
        activeFilters={rollFilters}
        onApply={onApplyFilters}
        onReset={onResetFilters}
      />

      {fetchLog.some(m => m.startsWith("✕") && !/rate limit/i.test(m)) && (
        <div style={{ marginTop: "10px" }}>
          {fetchLog.filter(m => m.startsWith("✕") && !/rate limit/i.test(m)).map((msg, i) => (
            <div key={i} style={{ fontSize: "11px", color: "#ff4136", fontFamily: C.mono }}>{msg}</div>
          ))}
        </div>
      )}
    </section>
  );
}
