import { C, inputShared } from "../lib/theme.ts";
import { TickerSearch } from "./TickerSearch.tsx";

interface CompactTickerBarProps {
  ticker: string;
  onTickerChange: (v: string) => void;
  onTickerSelect: (v: string) => void;
  onFetch: () => void;
  loading: boolean;
  error: string;
  fetchLog: string[];
}

export function CompactTickerBar({ ticker, onTickerChange, onTickerSelect, onFetch, loading, error, fetchLog }: CompactTickerBarProps) {
  return (
    <section style={{ paddingTop: "20px", paddingBottom: "20px", marginBottom: "20px", borderBottom: `1px solid ${C.borderWeak}`, animation: "fadeInUp 0.4s ease both" }}>
      <div className="rsp-api-bar" style={{ display: "grid", gridTemplateColumns: "1fr 140px auto", gap: "20px", alignItems: "end" }}>
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
        <div className="rsp-api-bar-btn">
          <button onClick={onFetch} disabled={loading} style={{
            width: "100%",
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
        </div>
        <div className="rsp-api-bar-status" style={{ fontSize: "11px", paddingBottom: "2px" }}>
          {error && <span style={{ color: "#ff4136" }}>{error}</span>}
        </div>
      </div>

      {fetchLog.some(m => m.startsWith("✕")) && (
        <div style={{ marginTop: "10px" }}>
          {fetchLog.filter(m => m.startsWith("✕")).map((msg, i) => (
            <div key={i} style={{ fontSize: "11px", color: "#ff4136", fontFamily: C.mono }}>{msg}</div>
          ))}
        </div>
      )}
    </section>
  );
}
