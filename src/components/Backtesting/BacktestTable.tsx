import { useState } from "react";
import { C } from "../../lib/theme.ts";
import { VERDICT } from "../../lib/constants.ts";
import { f } from "../../lib/utils.ts";
import type { BacktestRow } from "../../lib/backtesting/types.ts";

interface BacktestTableProps {
  rows: BacktestRow[];
  spyUnavailable: boolean;
}

const mono = C.mono;

const thStyle = (align: "left" | "right" | "center" = "right"): React.CSSProperties => ({
  padding: "8px 10px",
  fontSize: "9px",
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: C.text2,
  textAlign: align,
  borderBottom: `2px solid ${C.border}`,
  whiteSpace: "nowrap",
});

const tdStyle = (align: "left" | "right" | "center" = "right"): React.CSSProperties => ({
  padding: "7px 10px",
  textAlign: align,
  fontFamily: mono,
  fontSize: "11px",
});

function ReturnCell({ value }: { value: number | null }) {
  if (value == null) return <td style={tdStyle()}><span style={{ color: C.text3 }}>—</span></td>;
  const color = value > 0 ? "#10d97e" : value < 0 ? "#FF4D00" : C.text2;
  const sign  = value > 0 ? "+" : "";
  return <td style={{ ...tdStyle(), color }}>{sign}{value.toFixed(1)}%</td>;
}

function AlphaCell({ value }: { value: number | null }) {
  if (value == null) return <td style={tdStyle()}><span style={{ color: C.text3 }}>—</span></td>;
  const color = value > 0 ? "#10d97e" : value < 0 ? "#FF4D00" : C.text2;
  const sign  = value > 0 ? "+" : "";
  return <td style={{ ...tdStyle(), color, fontWeight: 600 }}>{sign}{value.toFixed(1)}%</td>;
}

function AccuracyCell({ value }: { value: number | null }) {
  if (value == null) return <td style={tdStyle()}><span style={{ color: C.text3 }}>—</span></td>;
  const pct   = value * 100;
  const color = pct >= 70 ? "#10d97e" : pct >= 40 ? C.text1 : "#FF4D00";
  return <td style={{ ...tdStyle(), color }}>{pct.toFixed(0)}%</td>;
}

// ── Expanded detail panel ─────────────────────────────────────────────────────

function DetailRow({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "3px 0", borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
      <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: C.text3 }}>
        {label}
      </span>
      <span style={{ fontFamily: mono, fontSize: "11px", color: C.text1, textAlign: "right" }}>
        {value}
        {sub && <span style={{ fontSize: "9px", color: C.text3, marginLeft: "6px" }}>{sub}</span>}
      </span>
    </div>
  );
}

function GrowthPct({ value, label }: { value: number; label?: string }) {
  const color = value > 0 ? "#10d97e" : value < 0 ? "#FF4D00" : C.text2;
  return (
    <span style={{ color }}>
      {value > 0 ? "+" : ""}{value.toFixed(1)}%
      {label && <span style={{ color: C.text3, fontSize: "9px", marginLeft: "5px" }}>{label}</span>}
    </span>
  );
}

function ExpandedDetail({ row, colSpan }: { row: BacktestRow; colSpan: number }) {
  const { snapshot, adjPrice, epsBase, grTerminal, fallingKnife } = row;
  const inp = snapshot.inputState;

  const col = (title: string, children: React.ReactNode) => (
    <div style={{ flex: "1 1 180px", minWidth: "160px" }}>
      <div style={{
        fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em",
        textTransform: "uppercase", color: C.accent,
        marginBottom: "8px", paddingBottom: "4px",
        borderBottom: `1px solid rgba(196,160,110,0.2)`,
      }}>
        {title}
      </div>
      {children}
    </div>
  );

  return (
    <tr>
      <td
        colSpan={colSpan}
        style={{
          padding: "0",
          background: "rgba(255,255,255,0.02)",
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div style={{
          padding: "16px 20px 16px 48px",
          display: "flex",
          gap: "32px",
          flexWrap: "wrap",
          animation: "fadeInUp 0.2s ease both",
        }}>

          {/* Column 1: Enterprise Value */}
          {col("Enterprise Value", <>
            <DetailRow label="Market Cap" value={`$${f(inp.marketCap)}`} />
            <DetailRow label="Total Debt" value={`$${f(inp.debt)}`}
              sub={!snapshot.debtAvailable ? "estimated" : undefined} />
            <DetailRow label="Cash" value={`$${f(inp.cash)}`} />
            <DetailRow label="Shares" value={`${f(inp.shares)}`} />
            <DetailRow
              label="Adj. Share Price"
              value={<span style={{ color: C.accent, fontWeight: 600 }}>${adjPrice.toFixed(2)}</span>}
              sub="(EV ÷ shares)"
            />
          </>)}

          {/* Column 2: Earnings */}
          {col("Earnings", <>
            <DetailRow label="TTM EPS" value={`$${inp.ttmEPS.toFixed(3)}`} />
            <DetailRow
              label="Forward EPS"
              value={`$${inp.forwardEPS.toFixed(3)}`}
              sub="(actual Y+1)"
            />
            <DetailRow
              label="Base EPS"
              value={
                epsBase != null
                  ? <span style={{ color: C.accent }}>${epsBase.toFixed(3)}</span>
                  : <span style={{ color: C.text3 }}>—</span>
              }
              sub="((TTM + Fwd) ÷ 2)"
            />
          </>)}

          {/* Column 3: Growth Rates */}
          {col("Growth Rates", <>
            <DetailRow
              label="Hist. CAGR"
              value={<GrowthPct value={snapshot.historicalCAGR} />}
              sub="(to snapshot yr)"
            />
            <DetailRow
              label="Fwd Y1"
              value={<GrowthPct value={snapshot.fwdGrowthY1} />}
              sub="(actual next yr)"
            />
            <DetailRow
              label="Fwd Y2"
              value={
                snapshot.fwdGrowthY2 != null
                  ? <GrowthPct value={snapshot.fwdGrowthY2} />
                  : <span style={{ color: C.text3 }}>—</span>
              }
              sub="(actual +2 yr)"
            />
            <DetailRow
              label="Terminal Rate"
              value={
                grTerminal != null
                  ? <GrowthPct value={grTerminal * 100} />
                  : <span style={{ color: C.text3 }}>—</span>
              }
              sub="(blended, used in TUP)"
            />
            <DetailRow label="Decay Mode" value="Fixed Friction" />
          </>)}

          {/* Column 4: Technical */}
          {col("Technical", <>
            <DetailRow label="Entry Price" value={`$${snapshot.snapshotPrice.toFixed(2)}`} />
            <DetailRow
              label="200-Day SMA"
              value={
                inp.sma200 > 0
                  ? `$${inp.sma200.toFixed(2)}`
                  : <span style={{ color: C.text3 }}>N/A</span>
              }
            />
            <DetailRow
              label="vs. SMA"
              value={
                inp.sma200 > 0 && inp.currentPrice > 0
                  ? (() => {
                      const pct = ((inp.currentPrice - inp.sma200) / inp.sma200) * 100;
                      const color = pct >= 0 ? "#10d97e" : "#FF4D00";
                      return <span style={{ color }}>{pct > 0 ? "+" : ""}{pct.toFixed(1)}%</span>;
                    })()
                  : <span style={{ color: C.text3 }}>—</span>
              }
            />
            <DetailRow
              label="Falling Knife"
              value={
                <span style={{ color: fallingKnife ? "#FF4D00" : C.text3 }}>
                  {inp.sma200 > 0 ? (fallingKnife ? "Yes" : "No") : "N/A"}
                </span>
              }
            />
            {inp.operatingMargin != null && (
              <DetailRow label="Op. Margin" value={`${inp.operatingMargin.toFixed(1)}%`} />
            )}
          </>)}

        </div>
      </td>
    </tr>
  );
}

// ── Main table ────────────────────────────────────────────────────────────────

export function BacktestTable({ rows, spyUnavailable }: BacktestTableProps) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  if (!rows.length) return null;

  const colCount = spyUnavailable ? 10 : 11;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <caption className="sr-only">Historical TUP signal backtesting results</caption>
        <thead>
          <tr>
            <th scope="col" style={{ ...thStyle("left"), width: "28px", padding: "8px 4px 8px 10px" }} />
            <th scope="col" style={thStyle("left")}>Year</th>
            <th scope="col" style={thStyle()}>Entry Price</th>
            <th scope="col" style={thStyle("center")}>Signal</th>
            <th scope="col" style={thStyle()}>Payback</th>
            <th scope="col" style={thStyle()}>3yr Return</th>
            <th scope="col" style={thStyle()}>5yr Return</th>
            <th scope="col" style={thStyle()}>7yr Return</th>
            {!spyUnavailable && <th scope="col" style={thStyle()}>5yr Alpha</th>}
            <th scope="col" style={thStyle()}>Earn. Acc.</th>
            <th scope="col" style={thStyle()}>Max DD</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => {
            const { snapshot, verdict, paybackYears, adjPrice } = row;
            const meta    = VERDICT[verdict];
            const isBuy   = verdict === "strong_buy" || verdict === "buy" || verdict === "spec_buy";
            const isOpen  = expandedYear === snapshot.year;

            return (
              <>
                <tr
                  key={snapshot.year}
                  style={{
                    opacity: row.isPartial && row.return3yr == null ? 0.6 : 1,
                    borderBottom: isOpen ? "none" : `1px solid ${C.borderWeak}`,
                    cursor: "pointer",
                  }}
                  onClick={() => setExpandedYear(isOpen ? null : snapshot.year)}
                >
                  {/* Caret toggle */}
                  <td
                    style={{ ...tdStyle("center"), padding: "7px 4px 7px 10px", width: "28px" }}
                    aria-label={isOpen ? "Collapse row" : "Expand row"}
                  >
                    <span style={{
                      display: "inline-block",
                      fontSize: "9px",
                      color: isOpen ? C.accent : C.text3,
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.18s ease, color 0.15s",
                      lineHeight: 1,
                    }}>
                      ▼
                    </span>
                  </td>

                  {/* Year */}
                  <td style={{ ...tdStyle("left"), color: C.text1, fontWeight: 600 }}>
                    {snapshot.year}
                    {!snapshot.debtAvailable && (
                      <span
                        title="Balance sheet unavailable — enterprise value estimated from market cap only"
                        style={{ color: C.text3, fontSize: "9px", marginLeft: "3px", cursor: "help" }}
                      >†</span>
                    )}
                  </td>

                  {/* Entry Price */}
                  <td style={{ ...tdStyle(), color: C.text2 }}>
                    ${snapshot.snapshotPrice.toFixed(2)}
                    {adjPrice !== snapshot.snapshotPrice && (
                      <span style={{ color: C.text3, fontSize: "9px", display: "block" }}>
                        adj ${adjPrice.toFixed(2)}
                      </span>
                    )}
                  </td>

                  {/* Signal */}
                  <td style={{ ...tdStyle("center"), padding: "7px 8px" }}>
                    <span style={{
                      display: "inline-block",
                      padding: "2px 7px",
                      borderRadius: "3px",
                      background: `${meta.color}18`,
                      border: `1px solid ${meta.color}50`,
                      color: meta.color,
                      fontSize: "9px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}>
                      {meta.icon} {meta.label}
                    </span>
                  </td>

                  {/* Payback */}
                  <td style={{ ...tdStyle(), color: isBuy ? C.accent : C.text2 }}>
                    {paybackYears != null ? `${paybackYears} yrs` : <span style={{ color: C.text3 }}>N/A</span>}
                  </td>

                  <ReturnCell value={row.return3yr} />
                  <ReturnCell value={row.return5yr} />
                  <ReturnCell value={row.return7yr} />
                  {!spyUnavailable && <AlphaCell value={row.alpha5yr} />}
                  <AccuracyCell value={row.earningsAccuracy} />
                  <ReturnCell value={row.maxDrawdown3yr} />
                </tr>

                {isOpen && <ExpandedDetail row={row} colSpan={colCount} />}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
