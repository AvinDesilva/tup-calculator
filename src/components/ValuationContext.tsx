interface ValuationContextProps {
  strongBuyPrice: number | null;
  buyPrice: number | null;
  dcf: number | null;
  currentPrice: number;
  altmanZ: number | null;
}

interface PanelData {
  key: string;
  title: string;
  value: string;
  icon: string | null;
  color: string;
  sub: string;
}

function Panel({ p, mono }: { p: PanelData; mono: string }) {
  return (
    <div className="rsp-val-panel" style={{ padding: "0" }}>
      <div className="rsp-val-title" style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#888", marginBottom: "6px" }}>
        {p.title}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
        <span style={{ fontFamily: mono, fontSize: "20px", fontWeight: 600, color: p.color, letterSpacing: "-0.02em" }}>
          {p.value}
        </span>
        {p.icon && (
          <span style={{ fontFamily: mono, fontSize: "14px", fontWeight: 700, color: p.color }}>{p.icon}</span>
        )}
      </div>
      <div style={{ fontSize: "11px", color: "#888", marginTop: "4px", letterSpacing: "0.06em" }}>
        {p.sub}
      </div>
    </div>
  );
}

export function ValuationContext({ strongBuyPrice, buyPrice, dcf, currentPrice, altmanZ }: ValuationContextProps) {
  const mono = "'JetBrains Mono', monospace";

  const hasStrongBuy = strongBuyPrice != null && strongBuyPrice > 0 && currentPrice > 0;
  const hasBuy       = buyPrice != null && buyPrice > 0 && currentPrice > 0;
  const hasDCF       = dcf != null && dcf > 0 && currentPrice > 0;
  const hasAltman    = altmanZ != null && isFinite(altmanZ);
  if (!hasStrongBuy && !hasBuy && !hasDCF && !hasAltman) return null;

  // Buy price (10y threshold)
  const buyDelta = hasBuy ? ((buyPrice as number) - currentPrice) / currentPrice * 100 : 0;
  const buyBelow = hasBuy && currentPrice <= (buyPrice as number);
  const buyColor = buyBelow ? "#10d97e" : "#f5a020";
  const buySub   = Math.abs(buyDelta) < 0.5
    ? "Equal to current price"
    : buyDelta > 0
      ? `${Math.abs(buyDelta).toFixed(0)}% below`
      : `${Math.abs(buyDelta).toFixed(0)}% above`;

  // DCF delta vs current price
  const dcfDelta    = hasDCF ? (((dcf as number) - currentPrice) / currentPrice) * 100 : 0;
  const undervalued = dcfDelta > 0;
  const dcfLabel    = undervalued ? "Undervalued per DCF" : "Premium to DCF";
  const absDelta    = Math.abs(dcfDelta);
  const dcfColor    = undervalued
    ? (absDelta > 25 ? "#10d97e" : absDelta > 10 ? "#5aad82" : "#8abfa8")
    : (absDelta > 25 ? "#FF4D00" : absDelta > 10 ? "#cc5533" : "#a07060");

  // Altman Z zones
  const altmanColor = hasAltman
    ? ((altmanZ as number) > 2.99 ? "#10d97e" : (altmanZ as number) >= 1.81 ? "#f5a020" : "#FF4D00")
    : "#888";
  const altmanLabel = hasAltman
    ? ((altmanZ as number) > 2.99 ? "Safe Zone" : (altmanZ as number) >= 1.81 ? "Grey Zone" : "Distress Zone")
    : "";

  // Strong Buy target
  const sbDelta   = hasStrongBuy ? ((strongBuyPrice as number) - currentPrice) / currentPrice * 100 : 0;
  const sbBelow   = hasStrongBuy && currentPrice > (strongBuyPrice as number);
  const sbColor   = sbBelow ? "#10d97e" : "#f5a020";
  const sbSub     = Math.abs(sbDelta) < 0.5
    ? "Equal to current price"
    : sbDelta < 0
      ? `${Math.abs(sbDelta).toFixed(0)}% above`
      : `${Math.abs(sbDelta).toFixed(0)}% below`;

  // Build panel data
  const sbPanel: PanelData | null = hasStrongBuy ? {
    key: "strongbuy", title: "Strong Buy Below",
    value: `$${(strongBuyPrice as number).toFixed(2)}`,
    icon: sbBelow ? "▲▲" : null, color: sbColor, sub: sbSub,
  } : null;

  const buyPanel: PanelData | null = hasBuy ? {
    key: "buy", title: "Patient Buy Below",
    value: `$${(buyPrice as number).toFixed(2)}`,
    icon: buyBelow ? "▲" : null, color: buyColor, sub: buySub,
  } : null;

  const dcfPanel: PanelData | null = hasDCF ? {
    key: "dcf", title: "DCF Fair Value",
    value: `$${Number(dcf).toFixed(2)}`,
    icon: null, color: dcfColor, sub: dcfLabel,
  } : null;

  const altmanPanel: PanelData | null = hasAltman ? {
    key: "altman", title: "Altman Z-Score",
    value: Number(altmanZ).toFixed(2),
    icon: null, color: altmanColor, sub: altmanLabel,
  } : null;

  const topRow = [sbPanel, buyPanel].filter((p): p is PanelData => p != null);
  const bottomRow = [dcfPanel, altmanPanel].filter((p): p is PanelData => p != null);

  if (topRow.length === 0 && bottomRow.length === 0) return null;

  const divider = <div style={{ background: "rgba(255,255,255,0.06)", width: "1px" }} />;
  const hDivider = <div style={{ background: "rgba(255,255,255,0.06)", height: "1px", gridColumn: "1 / -1" }} />;

  return (
    <div style={{ paddingTop: "8px" }}>
      <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888", marginBottom: "10px" }}>
        Valuation Context
      </div>

      {/* Top row: Strong Buy + Patient Buy */}
      {topRow.length > 0 && (
        <div className="rsp-valuation-grid" style={{ display: "grid", gridTemplateColumns: topRow.length === 2 ? "1fr 1px 1fr" : "1fr", gap: "0", paddingBottom: "14px" }}>
          <Panel p={topRow[0]} mono={mono} />
          {topRow.length === 2 && divider}
          {topRow.length === 2 && (
            <div style={{ paddingLeft: "14px" }}>
              <Panel p={topRow[1]} mono={mono} />
            </div>
          )}
        </div>
      )}

      {/* Horizontal divider between rows */}
      {topRow.length > 0 && bottomRow.length > 0 && hDivider}

      {/* Bottom row: DCF + Altman Z */}
      {bottomRow.length > 0 && (
        <div className="rsp-valuation-grid" style={{ display: "grid", gridTemplateColumns: bottomRow.length === 2 ? "1fr 1px 1fr" : "1fr", gap: "0", paddingTop: "14px" }}>
          <Panel p={bottomRow[0]} mono={mono} />
          {bottomRow.length === 2 && divider}
          {bottomRow.length === 2 && (
            <div style={{ paddingLeft: "14px" }}>
              <Panel p={bottomRow[1]} mono={mono} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
