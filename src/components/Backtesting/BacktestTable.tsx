import { C } from "../../lib/theme.ts";
import { VERDICT } from "../../lib/constants.ts";
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
  borderBottom: `1px solid rgba(255,255,255,0.04)`,
});

function ReturnCell({ value, suffix = "%" }: { value: number | null; suffix?: string }) {
  if (value == null) return <td style={tdStyle()}><span style={{ color: C.text3 }}>—</span></td>;
  const color = value > 0 ? "#10d97e" : value < 0 ? "#FF4D00" : C.text2;
  const sign  = value > 0 ? "+" : "";
  return <td style={{ ...tdStyle(), color }}>{sign}{value.toFixed(1)}{suffix}</td>;
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

export function BacktestTable({ rows, spyUnavailable }: BacktestTableProps) {
  if (!rows.length) return null;

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <caption className="sr-only">Historical TUP signal backtesting results</caption>
        <thead>
          <tr>
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
            const meta = VERDICT[verdict];
            const isBuy = verdict === "strong_buy" || verdict === "buy" || verdict === "spec_buy";
            return (
              <tr
                key={snapshot.year}
                style={{
                  borderBottom: `1px solid ${C.borderWeak}`,
                  opacity: row.isPartial && row.return3yr == null ? 0.6 : 1,
                }}
              >
                {/* Year */}
                <td style={{ ...tdStyle("left"), color: C.text1, fontWeight: 600 }}>
                  {snapshot.year}
                  {!snapshot.debtAvailable && (
                    <span
                      title="Balance sheet unavailable for this year — enterprise value estimated from market cap only"
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
