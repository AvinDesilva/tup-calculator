import { Fragment, useEffect, useState } from "react";
import { C, toggleBtn } from "../../lib/theme.ts";
import type { WatchlistItem } from "../../lib/api/watchlist.ts";
import { getDailySearchCounts, type DailySearchCount } from "../../lib/api/searchHistory.ts";
import { useAuth } from "../../contexts/useAuth.ts";
import { WatchlistHero } from "./WatchlistHero.tsx";

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

function formatPayback(years: number | null): string {
  if (years == null) return "--";
  if (years >= 30) return "30+";
  const fixed = years.toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

export function WatchlistPage({ items, onBack, onSelectTicker, onRemove }: WatchlistPageProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const [dailyCounts, setDailyCounts] = useState<DailySearchCount[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getDailySearchCounts(84)
      .then(d => { if (!cancelled) setDailyCounts(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const toggleExpanded = (ticker: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text1, fontFamily: C.body }}>
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 24px" }}>
        {user && (
          <WatchlistHero
            displayName={user.displayName || user.email}
            dailyCounts={dailyCounts}
            onBack={onBack}
          />
        )}
        {/* Header */}
        <div style={{ paddingTop: user ? "20px" : "28px", paddingBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: C.serif, fontWeight: 400, fontSize: "clamp(1.8rem, 4vw, 2.8rem)", color: C.text1, margin: 0, lineHeight: 1 }}>
              Watchlist
            </h1>
            <p style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.text3, marginTop: "6px", marginBottom: 0 }}>
              {items.length} {items.length === 1 ? "stock" : "stocks"} tracked
            </p>
          </div>
          {!user && (
            <button onClick={onBack} style={toggleBtn(false)}>
              &larr; Back
            </button>
          )}
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
                <th scope="col" style={thStyle} className="rsp-wl-hide-mobile">Verdict</th>
                <th scope="col" style={thStyle} className="rsp-wl-hide-mobile">200-SMA</th>
                <th scope="col" style={thStyle} className="rsp-wl-hide-mobile">Price</th>
                <th scope="col" style={{ ...thStyle, width: "40px" }} className="rsp-wl-hide-mobile"><span className="sr-only">Actions</span></th>
                <th scope="col" style={{ ...thStyle, width: "40px" }} className="rsp-wl-show-mobile"><span className="sr-only">Expand</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const isOpen = expanded.has(item.ticker);
                return (
                  <Fragment key={item.ticker}>
                    <tr
                      style={{ borderBottom: isOpen ? "none" : `1px solid ${C.borderWeak}`, transition: "background 0.1s" }}
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
                        {formatPayback(item.paybackYears)}
                      </td>
                      <td style={{ ...tdStyle, color: verdictColor(item.verdict), fontSize: "10px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }} className="rsp-wl-hide-mobile">
                        {verdictLabel(item.verdict)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }} className="rsp-wl-hide-mobile">
                        <span style={{
                          display: "inline-block",
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: item.sma200Cleared ? "#10d97e" : "#e74c3c",
                        }} />
                        <span className="sr-only">{item.sma200Cleared ? "Above 200-day SMA" : "Below 200-day SMA"}</span>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: C.mono }} className="rsp-wl-hide-mobile">
                        {item.currentPrice != null ? `$${item.currentPrice.toFixed(2)}` : "--"}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }} className="rsp-wl-hide-mobile">
                        <button
                          onClick={(e) => { e.stopPropagation(); onRemove(item.ticker); }}
                          aria-label={`Remove ${item.ticker} from watchlist`}
                          style={removeBtnStyle}
                        >
                          &times;
                        </button>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }} className="rsp-wl-show-mobile">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleExpanded(item.ticker); }}
                          aria-expanded={isOpen}
                          aria-controls={`wl-details-${item.ticker}`}
                          aria-label={`${isOpen ? "Collapse" : "Expand"} details for ${item.ticker}`}
                          style={{
                            background: "none",
                            border: "none",
                            color: C.text2,
                            cursor: "pointer",
                            fontSize: "16px",
                            padding: "4px 8px",
                            lineHeight: 1,
                            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.15s",
                          }}
                        >
                          &#9662;
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr
                        id={`wl-details-${item.ticker}`}
                        className="rsp-wl-details-row"
                        style={{ borderBottom: `1px solid ${C.borderWeak}` }}
                      >
                        <td colSpan={4} style={{ padding: "0 8px 14px" }}>
                          <dl style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "10px 16px",
                            margin: 0,
                            fontFamily: "'Space Grotesk', system-ui, sans-serif",
                          }}>
                            <div>
                              <dt style={detailLabelStyle}>Verdict</dt>
                              <dd style={{ ...detailValueStyle, color: verdictColor(item.verdict), fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                                {verdictLabel(item.verdict)}
                              </dd>
                            </div>
                            <div>
                              <dt style={detailLabelStyle}>200-SMA</dt>
                              <dd style={detailValueStyle}>
                                <span style={{
                                  display: "inline-block",
                                  width: "8px",
                                  height: "8px",
                                  borderRadius: "50%",
                                  background: item.sma200Cleared ? "#10d97e" : "#e74c3c",
                                  marginRight: "8px",
                                  verticalAlign: "middle",
                                }} />
                                <span style={{ fontSize: "12px", color: C.text2, verticalAlign: "middle" }}>
                                  {item.sma200Cleared ? "Above" : "Below"}
                                </span>
                              </dd>
                            </div>
                            <div>
                              <dt style={detailLabelStyle}>Price</dt>
                              <dd style={{ ...detailValueStyle, fontFamily: C.mono, fontSize: "13px", color: C.text1 }}>
                                {item.currentPrice != null ? `$${item.currentPrice.toFixed(2)}` : "--"}
                              </dd>
                            </div>
                            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); onRemove(item.ticker); }}
                                style={{
                                  background: "none",
                                  border: `1px solid ${C.borderWeak}`,
                                  color: C.text2,
                                  cursor: "pointer",
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  letterSpacing: "0.12em",
                                  textTransform: "uppercase",
                                  padding: "6px 12px",
                                  borderRadius: "3px",
                                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </dl>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
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

const removeBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: C.text3,
  cursor: "pointer",
  fontSize: "14px",
  padding: "4px",
  lineHeight: 1,
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#666",
  marginBottom: "4px",
};

const detailValueStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "12px",
  color: "#e8e4dc",
};
