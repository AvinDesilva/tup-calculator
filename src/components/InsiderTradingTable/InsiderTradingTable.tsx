import { useState } from "react";
import { C } from "../../lib/theme.ts";
import { SectionLabel, DataRow, DerivedStat } from "../primitives";
import type { InsiderTradingData, InsiderTrade } from "../../lib/insiderTrading/types.ts";

export interface InsiderTradingTableProps {
  data: InsiderTradingData | null;
  loading: boolean;
  fetchedAt: number; // ms timestamp from async fetch callback — not Date.now() in render
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
  borderBottom: "1px solid rgba(255,255,255,0.04)",
  verticalAlign: "middle",
};

// C-suite roles that get highlighted in the table
const HIGH_SIGNAL_ROLES = new Set(["CEO", "CFO", "COO", "CTO", "President"]);

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
  "president": "Pres",
};

function abbreviateRole(raw: string): string {
  if (!raw) return "—";
  const lower = raw.toLowerCase().replace(/^officer:\s*/, "").replace(/^director$/, "Dir").trim();
  if (lower === "dir") return "Dir";
  for (const [pattern, abbr] of Object.entries(ROLE_ABBREV)) {
    if (lower.includes(pattern)) return abbr;
  }
  return lower.length > 8 ? lower.slice(0, 7) + "…" : lower.charAt(0).toUpperCase() + lower.slice(1);
}

function txCode(transactionType: string): string {
  if (transactionType === "P-Purchase") return "P";
  if (transactionType === "S-Sale+OE") return "S·OE";
  if (transactionType.startsWith("S")) return "S";
  return transactionType.split("-")[0];
}

function stakeChangePct(trade: InsiderTrade): string {
  const owned = trade.securitiesOwned;
  const transacted = trade.securitiesTransacted;
  if (!owned || !transacted) return "—";
  const before = trade.isBuy ? owned - transacted : owned + transacted;
  if (before <= 0) return "new";
  const pct = ((owned - before) / before) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}%`;
}

function shortName(name: string): string {
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
  const { flags } = trade;
  const roleAbbr = abbreviateRole(trade.typeOfOwner);
  const isHighSignalRole = HIGH_SIGNAL_ROLES.has(roleAbbr);
  const typeColor = isBuy ? "#10d97e" : flags.clusterSell ? "#FF4D00" : "#e8e4dc";
  const code = txCode(trade.transactionType);
  const isFlagged = !isBuy && (flags.discretionary || flags.clusterSell);

  return (
    <tr style={{ opacity: 1 }}>
      <td style={{ ...tdStyle, fontFamily: mono, color: "#666", fontSize: "10px" }}>
        {formatDate(trade.transactionDate)}
      </td>
      <td style={{ ...tdStyle, color: "#e8e4dc", maxWidth: 100 }}>
        <span title={trade.reportingName}>{shortName(trade.reportingName)}</span>
      </td>
      <td
        style={{ ...tdStyle, fontSize: "10px", fontWeight: isHighSignalRole ? 700 : 400, color: isHighSignalRole ? C.accent : "#666" }}
        title={trade.typeOfOwner}
      >
        {roleAbbr}
      </td>
      <td style={{ ...tdStyle, fontFamily: mono, color: typeColor, fontWeight: 700, fontSize: "10px" }}>
        {code}
      </td>
      <td style={{ ...tdStyle, fontFamily: mono, color: "#e8e4dc", textAlign: "right" }}>
        {formatShares(trade.securitiesTransacted)}
      </td>
      <td style={{ ...tdStyle, fontFamily: mono, color: "#888", textAlign: "right" }}>
        {trade.totalValue > 0 ? formatValue(trade.totalValue) : "—"}
      </td>
      <td style={{ ...tdStyle, fontFamily: mono, textAlign: "right", fontWeight: 600, color: isBuy ? "#10d97e" : "#FF4D00", fontSize: "10px" }}>
        {stakeChangePct(trade)}
      </td>
      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
        {isFlagged && (
          <>
            {flags.clusterSell && (
              <FlagBadge
                label="C"
                color="#FF4D00"
                title={`Cluster: 3+ insiders sold within 30 days${flags.clusterIncludesCFO ? " — includes CFO" : ""}`}
              />
            )}
            {flags.discretionary && !flags.clusterSell && (
              <FlagBadge
                label="D"
                color="#f5a020"
                title="Discretionary sell — voluntary open-market sale"
              />
            )}
          </>
        )}
      </td>
    </tr>
  );
}

const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
  fontSize: "9px",
  fontWeight: 700,
  fontFamily: mono,
  letterSpacing: "0.05em",
  padding: "2px 6px",
  background: active ? "rgba(196,160,110,0.2)" : "transparent",
  border: `1px solid ${active ? "#C4A06E" : "rgba(255,255,255,0.1)"}`,
  color: active ? "#C4A06E" : "#666",
  cursor: "pointer",
});

const PAGE_SIZE = 10;

export function InsiderTradingTable({ data, loading, fetchedAt }: InsiderTradingTableProps) {
  const [windowDays, setWindowDays] = useState<180 | 730>(180);
  const [page, setPage] = useState(0);

  const cutoffMs = fetchedAt - windowDays * 24 * 60 * 60 * 1000;
  const windowTrades = (data?.trades ?? []).filter(
    t => new Date(t.transactionDate).getTime() >= cutoffMs
  );

  // Recompute summary for the active window
  const wBuys = windowTrades.filter(t => t.isBuy);
  const wSells = windowTrades.filter(t => !t.isBuy);
  const wDisc = windowTrades.filter(t => t.flags.discretionary);
  const wClusterAlert = windowTrades.some(t => t.flags.clusterSell);
  const wNetDir: "buying" | "selling" | "neutral" =
    wBuys.length > wSells.length * 1.5 ? "buying" :
    wSells.length > wBuys.length * 1.5 ? "selling" : "neutral";
  const wDirColor = wNetDir === "buying" ? "#10d97e" : wNetDir === "selling" ? "#FF4D00" : "#888";

  // Select display trades: cluster sells first, then non-cluster disc sells, then buys
  const clusterTrades = windowTrades.filter(t => t.flags.clusterSell);
  const discNonCluster = windowTrades.filter(t => t.flags.discretionary && !t.flags.clusterSell);
  const buyTrades = windowTrades.filter(t => t.isBuy);

  const seen = new Set<string>();
  const displayTrades: InsiderTrade[] = [];
  for (const group of [clusterTrades, discNonCluster, buyTrades]) {
    for (const t of group) {
      const k = `${t.transactionDate}-${t.reportingCik || t.reportingName}`;
      if (!seen.has(k)) { seen.add(k); displayTrades.push(t); }
    }
  }
  displayTrades.sort((a, b) => {
    const pa = a.flags.clusterSell ? 0 : a.flags.discretionary ? 1 : 2;
    const pb = b.flags.clusterSell ? 0 : b.flags.discretionary ? 1 : 2;
    if (pa !== pb) return pa - pb;
    return new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
  });

  const totalTrades = displayTrades.length;
  const totalPages = Math.max(1, Math.ceil(totalTrades / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageTrades = displayTrades.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const rangeStart = totalTrades === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const rangeEnd = Math.min((safePage + 1) * PAGE_SIZE, totalTrades);

  const hasData = data !== null;
  const windowLabel = windowDays === 180 ? "6 months" : "2 years";

  const windowToggle = (
    <div style={{ display: "flex" }}>
      <button
        aria-pressed={windowDays === 180}
        onClick={() => { setWindowDays(180); setPage(0); }}
        style={{ ...toggleBtnStyle(windowDays === 180), borderRadius: "3px 0 0 3px" }}
      >6m</button>
      <button
        aria-pressed={windowDays === 730}
        onClick={() => { setWindowDays(730); setPage(0); }}
        style={{ ...toggleBtnStyle(windowDays === 730), borderRadius: "0 3px 3px 0", marginLeft: "-1px" }}
      >2y</button>
    </div>
  );

  return (
    <div style={{ marginTop: 20 }}>
      <SectionLabel title="Insider Activity" badge={windowToggle} />

      {/* Summary rows */}
      {hasData && (
        <div style={{ marginBottom: 20 }}>
          <DataRow label="Buys" value={wBuys.length} accent="#10d97e" />
          <DataRow
            label="Sells"
            value={wSells.length}
            accent={wSells.length > 0 ? "#e8e4dc" : "#505050"}
          />
          {wDisc.length > 0 && (
            <DataRow label="Discretionary" value={wDisc.length} accent="#f5a020" />
          )}
          <DerivedStat
            label={`Net (${windowLabel})`}
            value={wNetDir === "buying" ? "net buying" : wNetDir === "selling" ? "net selling" : "neutral"}
            accent={wDirColor}
          />
        </div>
      )}

      {/* Cluster alert banner */}
      {wClusterAlert && (
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

      {!loading && hasData && displayTrades.length === 0 && (
        <div style={{ fontSize: "11px", color: "#505050", padding: "12px 0" }}>No meaningful trades in the last {windowLabel}.</div>
      )}

      {!loading && displayTrades.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
            <caption className="sr-only">Insider trading activity — cluster and discretionary sells prioritized</caption>
            <thead>
              <tr>
                <th scope="col" style={thStyle}>Date</th>
                <th scope="col" style={thStyle}>Insider</th>
                <th scope="col" style={thStyle}>Role</th>
                <th scope="col" style={thStyle} title="P = purchase · S = open-market sell · S·OE = sell on option exercise">Code</th>
                <th scope="col" style={{ ...thStyle, textAlign: "right" }}>Shares</th>
                <th scope="col" style={{ ...thStyle, textAlign: "right" }}>Value</th>
                <th scope="col" style={{ ...thStyle, textAlign: "right" }} title="% change in total shares held">% Stake</th>
                <th scope="col" style={thStyle} title="C = Cluster sell · D = Discretionary">Flags</th>
              </tr>
            </thead>
            <tbody>
              {pageTrades.map((trade, i) => (
                <TradeRow key={`${trade.transactionDate}-${trade.reportingCik || i}`} trade={trade} />
              ))}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, gap: 8 }}>
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={safePage === 0}
                style={{
                  ...toggleBtnStyle(false),
                  borderRadius: 3,
                  opacity: safePage === 0 ? 0.3 : 1,
                  cursor: safePage === 0 ? "default" : "pointer",
                }}
              >← prev</button>
              <span style={{ fontFamily: mono, fontSize: "10px", color: "#666" }}>
                {rangeStart}–{rangeEnd} of {totalTrades}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={safePage === totalPages - 1}
                style={{
                  ...toggleBtnStyle(false),
                  borderRadius: 3,
                  opacity: safePage === totalPages - 1 ? 0.3 : 1,
                  cursor: safePage === totalPages - 1 ? "default" : "pointer",
                }}
              >next →</button>
            </div>
          )}

          <div style={{ marginTop: 8, fontSize: "10px", color: "#505050", lineHeight: 1.6 }}>
            C = cluster (3+ insiders / 30d) · D = discretionary open-market sell · <span style={{ color: C.accent }}>gold role</span> = C-suite
          </div>
        </div>
      )}
    </div>
  );
}
