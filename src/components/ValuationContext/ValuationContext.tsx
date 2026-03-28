import { Panel } from "./Panel.tsx";
import type { ValuationContextProps, PanelData } from "./ValuationContext.types.ts";

export function ValuationContext({ strongBuyPrice, buyPrice, dcf, currentPrice, adjPrice, industryGrowth, industryGrowthLoading = false, companyBlendedGrowth }: ValuationContextProps) {
  const mono = "'JetBrains Mono', monospace";

  const hasStrongBuy = strongBuyPrice != null && strongBuyPrice > 0 && currentPrice > 0;
  const hasBuy       = buyPrice != null && buyPrice > 0 && currentPrice > 0;
  const hasDCF       = dcf != null && dcf > 0 && currentPrice > 0;
  const hasIndustry  = industryGrowth != null && !industryGrowth.error && industryGrowth.median != null;
  const showIndustry = hasIndustry || industryGrowthLoading;

  if (!hasStrongBuy && !hasBuy && !hasDCF && !showIndustry) return null;

  // Strong Buy price
  const sbBelow = hasStrongBuy && currentPrice > (strongBuyPrice as number);
  const sbColor = sbBelow ? "#10d97e" : "#f5a020";

  // Buy price (10y threshold)
  const buyBelow = hasBuy && currentPrice <= (buyPrice as number);
  const buyColor = buyBelow ? "#10d97e" : "#f5a020";

  // DCF color based on delta vs current price
  const dcfDelta = hasDCF ? (((dcf as number) - currentPrice) / currentPrice) * 100 : 0;
  const absDelta = Math.abs(dcfDelta);
  const dcfColor = dcfDelta > 0
    ? (absDelta > 25 ? "#10d97e" : absDelta > 10 ? "#5aad82" : "#8abfa8")
    : (absDelta > 25 ? "#FF4D00" : absDelta > 10 ? "#cc5533" : "#a07060");

  // Industry growth color
  let igColor = "#888";
  let igValue = "...";
  let igSub = "";
  if (industryGrowthLoading) {
    igColor = "#888";
    igValue = "...";
    igSub = "Loading";
  } else if (hasIndustry) {
    const median = industryGrowth!.median;
    igValue = `${median.toFixed(1)}%`;
    if (companyBlendedGrowth != null) {
      const diff = companyBlendedGrowth - median;
      if (diff > 2) igColor = "#10d97e";
      else if (diff < -2) igColor = "#FF4D00";
      else igColor = "#f5a020";
      igSub = industryGrowth!.industry;
    } else {
      igSub = `n=${industryGrowth!.count}`;
    }
  }

  // Sub text: % diff vs adjusted price for buy targets, vs current price for DCF
  const hasAdj = adjPrice != null && adjPrice > 0;
  const sbDiffPct = hasStrongBuy && hasAdj ? (((strongBuyPrice as number) - adjPrice) / adjPrice) * 100 : null;
  const buyDiffPct = hasBuy && hasAdj ? (((buyPrice as number) - adjPrice) / adjPrice) * 100 : null;

  const fmtDiff = (pct: number) => `${pct > 0 ? "+" : ""}${pct.toFixed(1)}% vs adj. price`;

  // Build panels
  const sbPanel: PanelData | null = hasStrongBuy ? {
    key: "strongbuy", title: "Strong Buy Below",
    value: `$${(strongBuyPrice as number).toFixed(2)}`,
    icon: sbBelow ? "▲▲" : null, color: sbColor,
    sub: sbDiffPct != null ? fmtDiff(sbDiffPct) : "",
  } : null;

  const buyPanel: PanelData | null = hasBuy ? {
    key: "buy", title: "Patient Buy Below",
    value: `$${(buyPrice as number).toFixed(2)}`,
    icon: buyBelow ? "▲" : null, color: buyColor,
    sub: buyDiffPct != null ? fmtDiff(buyDiffPct) : "",
  } : null;

  const dcfPanel: PanelData | null = hasDCF ? {
    key: "dcf", title: "DCF Fair Value",
    value: `$${Number(dcf).toFixed(2)}`,
    icon: null, color: dcfColor,
    sub: `${dcfDelta > 0 ? "+" : ""}${dcfDelta.toFixed(1)}% vs price`,
  } : null;

  const igPanel: PanelData | null = showIndustry ? {
    key: "industry", title: "Industry Growth",
    value: igValue, icon: null, color: igColor, sub: igSub,
  } : null;

  const topRow = [sbPanel, buyPanel].filter((p): p is PanelData => p != null);
  const bottomRow = [dcfPanel, igPanel].filter((p): p is PanelData => p != null);

  if (topRow.length === 0 && bottomRow.length === 0) return null;

  const dividerV = <div style={{ background: "rgba(255,255,255,0.06)", width: "1px" }} />;
  const dividerH = <div style={{ background: "rgba(255,255,255,0.06)", height: "1px", gridColumn: "1 / -1" }} />;

  return (
    <div style={{ paddingTop: "8px" }}>
      <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888", marginBottom: "10px" }}>
        Valuation Context
      </div>

      <div className="rsp-valuation-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", gap: "0" }}>
        {/* Top row */}
        {topRow.length === 2 ? (<>
          <div style={{ paddingBottom: "14px" }}>
            <Panel p={topRow[0]} mono={mono} />
          </div>
          {dividerV}
          <div style={{ paddingLeft: "14px", paddingBottom: "14px" }}>
            <Panel p={topRow[1]} mono={mono} />
          </div>
        </>) : topRow.length === 1 ? (<>
          <div style={{ paddingBottom: "14px", gridColumn: "1 / -1" }}>
            <Panel p={topRow[0]} mono={mono} />
          </div>
        </>) : null}

        {/* Horizontal divider between rows */}
        {topRow.length > 0 && bottomRow.length > 0 && dividerH}

        {/* Bottom row */}
        {bottomRow.length === 2 ? (<>
          <div style={{ paddingTop: "14px" }}>
            <Panel p={bottomRow[0]} mono={mono} />
          </div>
          {dividerV}
          <div style={{ paddingLeft: "14px", paddingTop: "14px" }}>
            <Panel p={bottomRow[1]} mono={mono} />
          </div>
        </>) : bottomRow.length === 1 ? (<>
          <div style={{ paddingTop: "14px", gridColumn: "1 / -1" }}>
            <Panel p={bottomRow[0]} mono={mono} />
          </div>
        </>) : null}
      </div>
    </div>
  );
}
