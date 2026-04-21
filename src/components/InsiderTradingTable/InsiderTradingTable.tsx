import { C } from "../../lib/theme.ts";
import { SectionLabel } from "../primitives";
import type { InsiderTradingData, InsiderTrade } from "../../lib/insiderTrading/types.ts";

export interface InsiderTradingTableProps {
  data: InsiderTradingData | null;
  loading: boolean;
}

const mono = C.mono;

const thStyle: React.CSSProperties = {
  padding: "6px 8px",
  fontSize: "9px",
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#888",
  textAlign: "left",
  borderBottom: "2px solid rgba(255,255,255,0.08)",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "6px 8px",
  fontSize: "11px",
  fontFamily: mono,
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  verticalAlign: "middle",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr.slice(0, 10);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function formatValue(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function formatShares(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

const ROLE_ABBREV: Record<string, string> = {
  "chief executive officer": "CEO",
  "chief financial officer": "CFO",
  "chief operating officer": "COO",
  "chief technology officer": "CTO",
  "chief information officer": "CIO",
  "chief marketing officer": "CMO",
  "chief legal officer": "CLO",
  "chief product officer": "CPO",
  "chief revenue officer": "CRO",
  "chief people officer": "CPO",
  "principal accounting officer": "PAO",
  "general counsel": "GC",
  "senior vice president": "SVP",
  "executive vice president": "EVP",
  "vice president": "VP",
  "ten percent owner": "10%",
};

function abbreviateRole(raw: string): string {
  if (!raw) return "—";
  const lower = raw.toLowerCase().replace(/^officer:\s*/, "").replace(/^director$/, "Dir").trim();
  if (lower === "dir") return "Dir";
  // Check for exact or substring match in abbreviation table
  for (const [pattern, abbr] of Object.entries(ROLE_ABBREV)) {
    if (lower.includes(pattern)) return abbr;
  }
  // Truncate if still long
  return lower.length > 8 ? lower.slice(0, 7) + "…" : lower.charAt(0).toUpperCase() + lower.slice(1);
}

function sharesChangeLabel(trade: InsiderTrade): string {
  const owned = trade.securitiesOwned;
  const transacted = trade.securitiesTransacted;
  if (!owned || !transacted) return "—";
  // Compute shares before this transaction
  const before = trade.isBuy ? owned - transacted : owned + transacted;
  if (before <= 0) return "new";
  const pct = ((owned - before) / before) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}%`;
}

function shortName(name: string): string {
  // "DOE JOHN" → "J. Doe" style
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const last = parts[0];
    const first = parts[1];
    return `${first[0]}. ${last.charAt(0) + last.slice(1).toLowerCase()}`;
  }
  return name.length > 16 ? name.slice(0, 14) + "…" : name;
}

function FlagBadge({ label, color, title }: { label: string; color: string; title: string }) {
  return (
    <span
      title={title}
      aria-label={title}
      style={{
        display: "inline-block",
        width: 16,
        height: 16,
        lineHeight: "16px",
        textAlign: "center",
        fontSize: "9px",
        fontWeight: 700,
        fontFamily: mono,
        color,
        border: `1px solid ${color}66`,
        borderRadius: 2,
        marginRight: 3,
        letterSpacing: 0,
        cursor: "help",
      }}
    >
      {label}
    </span>
  );
}

function TradeRow({ trade }: { trade: InsiderTrade }) {
  const isBuy = trade.isBuy;
  const typeColor = isBuy ? "#10d97e" : "#e8e4dc";
  const typeLabel = isBuy ? "BUY" : "SELL";
  const { flags } = trade;
  const isFlagged = !isBuy && (flags.discretionary || flags.clusterSell);

  return (
    <tr style={{ opacity: 1 }}>
      <td style={{ ...tdStyle, color: "#888" }}>
        {formatDate(trade.transactionDate)}
      </td>
      <td style={{ ...tdStyle, color: "#e8e4dc", maxWidth: 100 }}>
        <span title={trade.reportingName}>{shortName(trade.reportingName)}</span>
      </td>
      <td style={{ ...tdStyle, color: "#888", fontSize: "10px" }} title={trade.typeOfOwner}>
        {abbreviateRole(trade.typeOfOwner)}
      </td>
      <td style={{ ...tdStyle, color: typeColor, fontWeight: 700 }}>
        {typeLabel}
      </td>
      <td style={{ ...tdStyle, color: "#e8e4dc", textAlign: "right" }}>
        {formatShares(trade.securitiesTransacted)}
      </td>
      <td style={{ ...tdStyle, color: "#888", textAlign: "right" }}>
        {trade.totalValue > 0 ? formatValue(trade.totalValue) : "—"}
      </td>
      <td style={{ ...tdStyle, textAlign: "right", color: trade.isBuy ? "#10d97e" : "#FF4D00", fontSize: "10px" }}>
        {sharesChangeLabel(trade)}
      </td>
      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
        {isFlagged && (
          <>
            {flags.discretionary && (
              <FlagBadge
                label="D"
                color="#f5a020"
                title="Discretionary sell — voluntary, not tax-related or exercise"
              />
            )}
            {flags.clusterSell && (
              <FlagBadge
                label="C"
                color="#FF4D00"
                title={`Cluster: 3+ insiders sold within 30 days${flags.clusterIncludesCFO ? " — includes CFO" : ""}`}
              />
            )}
            {flags.likelyNon10b51 && !flags.clusterSell && (
              <FlagBadge
                label="!"
                color="#FF4D00"
                title="Likely not a pre-scheduled 10b5-1 plan (heuristic)"
              />
            )}
          </>
        )}
      </td>
    </tr>
  );
}

export function InsiderTradingTable({ data, loading }: InsiderTradingTableProps) {
  const displayTrades = data?.trades.slice(0, 20) ?? [];
  const { summary } = data ?? {};

  const directionColor = summary?.netDirection === "buying"
    ? "#10d97e"
    : summary?.netDirection === "selling"
      ? "#FF4D00"
      : "#888";

  return (
    <div style={{ marginTop: 20 }}>
      <SectionLabel title="Insider Activity" />

      {/* Summary line */}
      {summary && (
        <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: "11px", fontFamily: mono, color: "#10d97e" }}>
            {summary.totalBuys} {summary.totalBuys === 1 ? "buy" : "buys"}
          </span>
          <span style={{ fontSize: "11px", fontFamily: mono, color: summary.totalSells > 0 ? "#e8e4dc" : "#505050" }}>
            {summary.totalSells} {summary.totalSells === 1 ? "sell" : "sells"}
          </span>
          {summary.discretionarySells > 0 && (
            <span style={{ fontSize: "11px", fontFamily: mono, color: "#f5a020" }}>
              {summary.discretionarySells} discretionary
            </span>
          )}
          <span style={{ fontSize: "11px", fontFamily: mono, color: directionColor, marginLeft: "auto" }}>
            {summary.netDirection === "buying" ? "net buying" : summary.netDirection === "selling" ? "net selling" : "neutral"}
          </span>
        </div>
      )}

      {/* Alert banner for cluster */}
      {summary?.clusterAlert && (
        <div style={{
          marginBottom: 10,
          padding: "6px 10px",
          border: "1px solid rgba(255,77,0,0.4)",
          background: "rgba(255,77,0,0.06)",
          fontSize: "10px",
          color: "#FF4D00",
          letterSpacing: "0.04em",
        }}>
          CLUSTER ALERT — multiple insiders sold within a 30-day window
        </div>
      )}

      {loading && (
        <div style={{ fontSize: "11px", color: "#505050", padding: "12px 0" }}>Loading insider trades…</div>
      )}

      {!loading && displayTrades.length === 0 && (
        <div style={{ fontSize: "11px", color: "#505050", padding: "12px 0" }}>No insider trades found.</div>
      )}

      {!loading && displayTrades.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <caption className="sr-only">Insider trading activity with suspicious sell indicators</caption>
            <thead>
              <tr>
                <th scope="col" style={thStyle}>Date</th>
                <th scope="col" style={thStyle}>Insider</th>
                <th scope="col" style={thStyle}>Role</th>
                <th scope="col" style={thStyle}>Type</th>
                <th scope="col" style={{ ...thStyle, textAlign: "right" }}>Shares</th>
                <th scope="col" style={{ ...thStyle, textAlign: "right" }}>Value</th>
                <th scope="col" style={{ ...thStyle, textAlign: "right" }} title="Change in total shares owned">Chg</th>
                <th scope="col" style={{ ...thStyle }} title="D = Discretionary, C = Cluster sell, ! = Likely non-10b5-1">Flags</th>
              </tr>
            </thead>
            <tbody>
              {displayTrades.map((trade, i) => (
                <TradeRow key={`${trade.transactionDate}-${trade.reportingCik || i}`} trade={trade} />
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 8, fontSize: "10px", color: "#505050", lineHeight: 1.6 }}>
            D = discretionary sell · C = cluster (3+ insiders / 30d) · ! = likely non-10b5-1
          </div>
        </div>
      )}
    </div>
  );
}
