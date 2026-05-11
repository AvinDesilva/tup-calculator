import { C } from "../../lib/theme.ts";
import type { BacktestSummary } from "../../lib/backtesting/types.ts";

interface BacktestSummaryProps {
  summary: BacktestSummary;
  spyUnavailable: boolean;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ textAlign: "center", padding: "0 20px" }}>
      <div style={{
        fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em",
        textTransform: "uppercase", color: C.text2, marginBottom: "6px",
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: C.mono, fontSize: "18px", fontWeight: 600,
        color: accent ? C.accent : C.text1,
      }}>
        {value}
      </div>
    </div>
  );
}

function AlphaStat({ label, value }: { label: string; value: number | null }) {
  if (value == null) return <Stat label={label} value="—" />;
  const color = value > 0 ? "#10d97e" : value < 0 ? "#FF4D00" : C.text2;
  const sign  = value > 0 ? "+" : "";
  return (
    <div style={{ textAlign: "center", padding: "0 20px" }}>
      <div style={{
        fontSize: "9px", fontWeight: 700, letterSpacing: "0.15em",
        textTransform: "uppercase", color: C.text2, marginBottom: "6px",
      }}>
        {label}
      </div>
      <div style={{ fontFamily: C.mono, fontSize: "18px", fontWeight: 600, color }}>
        {sign}{value.toFixed(1)}%
      </div>
    </div>
  );
}

export function BacktestSummaryBar({ summary, spyUnavailable }: BacktestSummaryProps) {
  const winRateStr = summary.winRate5yr != null ? `${summary.winRate5yr.toFixed(0)}%` : "—";
  const paybackStr = summary.avgPayback  != null ? `${summary.avgPayback.toFixed(1)} yrs` : "—";

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      flexWrap: "wrap",
      gap: "0",
      padding: "16px 0 20px",
      borderBottom: `1px solid ${C.borderWeak}`,
      marginBottom: "20px",
    }}>
      <Stat
        label="Buy Signals"
        value={`${summary.buySignals} / ${summary.totalSnapshots}`}
        accent
      />
      <div style={{ width: "1px", background: C.borderWeak, margin: "8px 0" }} />
      <Stat label="5yr Win Rate" value={spyUnavailable ? "—" : winRateStr} />
      <div style={{ width: "1px", background: C.borderWeak, margin: "8px 0" }} />
      <AlphaStat label={spyUnavailable ? "5yr Alpha" : "Avg 5yr Alpha"} value={spyUnavailable ? null : summary.avgAlpha5yr} />
      <div style={{ width: "1px", background: C.borderWeak, margin: "8px 0" }} />
      <Stat label="Avg Payback" value={paybackStr} />
    </div>
  );
}
