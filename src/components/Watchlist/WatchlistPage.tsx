import { C, toggleBtn } from "../../lib/theme.ts";
import type { WatchlistItem } from "../../lib/api/watchlist.ts";

interface WatchlistPageProps {
  items: WatchlistItem[];
  onBack: () => void;
  onSelectTicker: (ticker: string) => void;
  onRemove: (ticker: string) => void;
}

function verdictColor(verdict: string | null): string {
  switch (verdict) {
    case "strong_buy": return "#10d97e";
    case "buy": return "#7ee87e";
    case "hold": return C.text2;
    case "stretched": return "#f5a020";
    case "avoid": return "#e74c3c";
    case "spec_buy": return "#C4A06E";
    default: return C.text3;
  }
}

function verdictLabel(verdict: string | null): string {
  switch (verdict) {
    case "strong_buy": return "Deeply Discounted";
    case "buy": return "Fairly Priced";
    case "hold": return "Fully Valued";
    case "stretched": return "Stretched";
    case "avoid": return "Avoid";
    case "spec_buy": return "Speculative";
    default: return "--";
  }
}

export function WatchlistPage({ items, onBack, onSelectTicker, onRemove }: WatchlistPageProps) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text1, fontFamily: C.body }}>
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 24px" }}>
        {/* Header */}
        <div style={{ paddingTop: "28px", paddingBottom: "20px", borderBottom: `2px solid ${C.accent}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: C.serif, fontWeight: 400, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: C.text1, margin: 0, lineHeight: 1 }}>
              Watchlist
            </h1>
            <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.text3, marginTop: "6px", marginBottom: 0 }}>
              {items.length} {items.length === 1 ? "stock" : "stocks"} tracked
            </p>
          </div>
          <button onClick={onBack} style={toggleBtn(false)}>
            &larr; Back
          </button>
        </div>

        {/* Table */}
        {items.length === 0 ? (
          <div style={{ paddingTop: "80px", textAlign: "center" }}>
            <div style={{ fontFamily: C.serif, color: C.accent, fontSize: "28px", marginBottom: "16px" }}>&star;</div>
            <p style={{ fontSize: "13px", color: C.text2, lineHeight: 1.7, margin: 0 }}>
              Your watchlist is empty.<br />
              Search for a stock and tap the star to add it.
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "16px" }}>
            <caption className="sr-only">Your stock watchlist</caption>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                <th scope="col" style={thStyle}>Ticker</th>
                <th scope="col" style={{ ...thStyle, textAlign: "left" }}>Company</th>
                <th scope="col" style={thStyle}>Payback</th>
                <th scope="col" style={thStyle}>Verdict</th>
                <th scope="col" style={thStyle}>200-SMA</th>
                <th scope="col" style={thStyle}>Price</th>
                <th scope="col" style={{ ...thStyle, width: "40px" }}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr
                  key={item.ticker}
                  style={{ borderBottom: `1px solid ${C.borderWeak}`, cursor: "pointer", transition: "background 0.1s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td
                    style={{ ...tdStyle, fontFamily: C.mono, fontWeight: 600, color: C.accent, cursor: "pointer" }}
                    onClick={() => onSelectTicker(item.ticker)}
                  >
                    {item.ticker}
                  </td>
                  <td
                    style={{ ...tdStyle, textAlign: "left", color: C.text2, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", cursor: "pointer" }}
                    onClick={() => onSelectTicker(item.ticker)}
                  >
                    {item.companyName}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: C.mono, fontWeight: 600 }}>
                    {item.paybackYears != null ? (item.paybackYears >= 30 ? "30+" : item.paybackYears.toFixed(1)) : "--"}
                  </td>
                  <td style={{ ...tdStyle, color: verdictColor(item.verdict), fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    {verdictLabel(item.verdict)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <span style={{
                      display: "inline-block",
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: item.sma200Cleared ? "#10d97e" : "#e74c3c",
                    }} />
                    <span className="sr-only">{item.sma200Cleared ? "Above 200-day SMA" : "Below 200-day SMA"}</span>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: C.mono }}>
                    {item.currentPrice != null ? `$${item.currentPrice.toFixed(2)}` : "--"}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemove(item.ticker); }}
                      aria-label={`Remove ${item.ticker} from watchlist`}
                      style={{
                        background: "none",
                        border: "none",
                        color: C.text3,
                        cursor: "pointer",
                        fontSize: "14px",
                        padding: "4px",
                        lineHeight: 1,
                      }}
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#666",
  padding: "10px 8px",
  textAlign: "center",
  fontFamily: "'Space Grotesk', system-ui, sans-serif",
};

const tdStyle: React.CSSProperties = {
  fontSize: "12px",
  padding: "12px 8px",
  textAlign: "center",
  fontFamily: "'Space Grotesk', system-ui, sans-serif",
  color: "#e8e4dc",
};
