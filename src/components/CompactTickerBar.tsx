import { C, inputShared } from "../lib/theme.ts";
import { TickerSearch } from "./TickerSearch.tsx";
import { ErrorDisplay } from "./ui.tsx";
import { DiceFilterBar } from "./DiceFilterBar.tsx";
import type { RollFilters } from "../lib/types.ts";

interface CompactTickerBarProps {
  ticker: string;
  onTickerChange: (v: string) => void;
  onTickerSelect: (v: string) => void;
  onFetch: () => void;
  loading: boolean;
  error: string;
  fetchLog: string[];
  onRollDice: () => void;
  rollingDice: boolean;
  dicePhrase: string;
  isFilterOpen: boolean;
  onToggleFilter: () => void;
  rollFilters: RollFilters;
  onRollFiltersChange: (f: RollFilters) => void;
  hasActiveFilters: boolean;
}

export function CompactTickerBar({ ticker, onTickerChange, onTickerSelect, onFetch, loading, error, fetchLog, onRollDice, rollingDice, dicePhrase, isFilterOpen, onToggleFilter, rollFilters, onRollFiltersChange, hasActiveFilters }: CompactTickerBarProps) {
  return (
    <section className="rsp-ticker-bar" style={{ paddingTop: "20px", paddingBottom: "20px", marginBottom: "20px", borderBottom: `1px solid ${C.borderWeak}`, animation: "fadeInUp 0.4s ease both" }}>
      <div className="rsp-api-bar" style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "20px", alignItems: "end" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "10px" }}>
          <label style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.text2, flexShrink: 0 }}>Ticker</label>
          <TickerSearch
            value={ticker}
            onChange={onTickerChange}
            onSelect={onTickerSelect}
            onSubmit={onFetch}
            placeholder="AAPL"
            inputStyle={{ ...inputShared, letterSpacing: "0.12em", textTransform: "uppercase" }}
            onFocus={e => (e.target.style.borderBottomColor = C.accent)}
            onBlur={e => (e.target.style.borderBottomColor = C.borderWeak)}
          />
        </div>
        <div className="rsp-api-bar-btn" style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => onFetch()} disabled={loading} style={{
            padding: "8px 16px",
            background: loading ? C.text3 : C.accent,
            color: "#080808",
            border: "none",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: C.body,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            transition: "opacity 0.15s",
            whiteSpace: "nowrap",
          }}>
            {loading ? (
              <>
                <svg style={{ animation: "spin 1s linear infinite", width: "12px", height: "12px" }} viewBox="0 0 24 24">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Fetching...
              </>
            ) : "Fetch Data →"}
          </button>
          <button onClick={onRollDice} disabled={rollingDice || loading} style={{
            padding: "8px 16px",
            background: "transparent",
            color: C.accent,
            border: `1px solid ${C.accent}`,
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: (rollingDice || loading) ? "not-allowed" : "pointer",
            fontFamily: C.body,
            whiteSpace: "nowrap",
            transition: "opacity 0.15s",
            opacity: (rollingDice || loading) ? 0.5 : 1,
          }}>
            {rollingDice ? dicePhrase : "Roll Dice"} <span style={rollingDice ? { display: "inline-block", animation: "spin 0.6s linear infinite" } : undefined}>🎲</span>
          </button>
          <button onClick={onToggleFilter} style={{
            width: "32px", height: "32px",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: hasActiveFilters ? "rgba(196,160,110,0.1)" : "transparent",
            border: `1px solid ${hasActiveFilters ? "#C4A06E" : "rgba(255,255,255,0.1)"}`,
            color: hasActiveFilters ? "#C4A06E" : "#666",
            cursor: "pointer",
            flexShrink: 0,
            transition: "all 0.15s",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
              <circle cx="8" cy="6" r="2" fill="currentColor" />
              <circle cx="16" cy="12" r="2" fill="currentColor" />
              <circle cx="10" cy="18" r="2" fill="currentColor" />
            </svg>
          </button>
        </div>
        <div className="rsp-api-bar-status" style={{ fontSize: "11px", paddingBottom: "2px" }}>
          {error && <ErrorDisplay error={error} style={{ fontSize: "11px" }} />}
        </div>
      </div>

      <DiceFilterBar
        isOpen={isFilterOpen}
        filters={rollFilters}
        onFiltersChange={onRollFiltersChange}
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
