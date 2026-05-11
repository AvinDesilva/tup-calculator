import { C } from "../../lib/theme.ts";
import { useBacktestData } from "../../hooks/useBacktestData.ts";
import { BacktestSummaryBar } from "./BacktestSummary.tsx";
import { BacktestTable } from "./BacktestTable.tsx";
import type { FMPIncomeStatement, FMPBalanceSheet, FMPCashFlow, HistoricalPricePoint } from "../../lib/types.ts";

interface BacktestingProps {
  ticker: string;
  incomeHistory: FMPIncomeStatement[];
  balanceSheetHistory: FMPBalanceSheet[];
  cashFlowHistory: FMPCashFlow[];
  priceHistory: HistoricalPricePoint[];
  shares: number;
}

const STAGE_LABELS: Record<string, string> = {
  idle:      "Initializing...",
  fetching:  "Loading benchmark data...",
  computing: "Computing historical signals...",
};

export function Backtesting({
  ticker, incomeHistory, balanceSheetHistory, priceHistory, shares,
}: BacktestingProps) {
  const { stage, rows, summary, error, spyUnavailable } = useBacktestData({
    ticker,
    enabled: true,
    incomeHistory,
    balanceSheetHistory,
    priceHistory,
    shares,
  });

  const isLoading = stage === "idle" || stage === "fetching" || stage === "computing";

  return (
    <div style={{ padding: "0 40px 40px", animation: "fadeInUp 0.5s 0.05s ease both" }}>

      {/* Section header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        paddingTop: "20px", paddingBottom: "16px",
        borderBottom: `1px solid ${C.borderWeak}`,
        marginBottom: "4px",
      }}>
        <span style={{ fontFamily: C.mono, color: C.accent, fontSize: "14px", letterSpacing: "0.05em", fontWeight: 700 }}>05</span>
        <h3 style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.text2, margin: 0 }}>
          Backtesting
        </h3>
        <div style={{ flex: 1, height: "1px", background: C.borderWeak }} />
        {spyUnavailable && stage === "done" && (
          <span style={{ fontSize: "9px", color: C.text3, letterSpacing: "0.1em" }}>
            S&amp;P 500 data unavailable
          </span>
        )}
      </div>

      {/* Intro description */}
      <p style={{ fontSize: "10px", color: C.text3, margin: "12px 0 0", lineHeight: 1.7 }}>
        Reconstructs TUP signals at each historical fiscal year-end using point-in-time financials,
        then tracks actual stock performance vs. the S&amp;P 500.
      </p>

      {/* Loading state */}
      {isLoading && (
        <div style={{ padding: "40px 0", textAlign: "center" }}>
          <div style={{ fontFamily: C.mono, fontSize: "11px", color: C.text2, letterSpacing: "0.1em" }}>
            {STAGE_LABELS[stage] ?? "Loading..."}
          </div>
        </div>
      )}

      {/* Error state */}
      {stage === "done" && error && (
        <div style={{ padding: "32px 0", textAlign: "center" }}>
          <div style={{ fontSize: "11px", color: C.text3, lineHeight: 1.7 }}>{error}</div>
        </div>
      )}

      {/* Results */}
      {stage === "done" && !error && rows.length > 0 && summary && (
        <>
          <BacktestSummaryBar summary={summary} spyUnavailable={spyUnavailable} />
          <BacktestTable rows={rows} spyUnavailable={spyUnavailable} />

          {/* Methodology note */}
          <div style={{
            marginTop: "24px", paddingTop: "16px",
            borderTop: `1px solid ${C.borderWeak}`,
            fontSize: "10px", color: C.text3, lineHeight: 1.8,
          }}>
            <strong style={{ color: C.text2, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "9px" }}>
              Methodology Limitations
            </strong>
            <br />
            Historical analyst estimates are unavailable — actual next-year EPS growth is used as a proxy for
            forward estimates. This means signals were computed with perfect hindsight on growth, which may
            overstate signal quality. Dividend yield is set to 0% for all historical snapshots.
            {!spyUnavailable && " Alpha = stock return minus SPY return over the same window."}
            {" "}Rows marked with † used market cap as enterprise value (balance sheet data unavailable for that year).
            {" "}Earn. Acc. measures how close the modelled growth rate was to the actual 3-year EPS CAGR.
          </div>
        </>
      )}
    </div>
  );
}
