interface ValuationContextProps {
  strongBuyPrice: number | null;
  buyPrice: number | null;
  dcf: number | null;
  currentPrice: number;
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

export function ValuationContext({ strongBuyPrice, buyPrice, dcf, currentPrice }: ValuationContextProps) {
  const mono = "'JetBrains Mono', monospace";

  const hasStrongBuy = strongBuyPrice != null && strongBuyPrice > 0 && currentPrice > 0;
  const hasBuy       = buyPrice != null && buyPrice > 0 && currentPrice > 0;
  const hasDCF       = dcf != null && dcf > 0 && currentPrice > 0;
  if (!hasStrongBuy && !hasBuy && !hasDCF) return null;

  // Buy price (10y threshold)
  const buyBelow = hasBuy && currentPrice <= (buyPrice as number);
  const buyColor = buyBelow ? "#10d97e" : "#f5a020";

  // DCF color based on delta vs current price
  const dcfDelta    = hasDCF ? (((dcf as number) - currentPrice) / currentPrice) * 100 : 0;
  const absDelta    = Math.abs(dcfDelta);
  const dcfColor    = dcfDelta > 0
    ? (absDelta > 25 ? "#10d97e" : absDelta > 10 ? "#5aad82" : "#8abfa8")
    : (absDelta > 25 ? "#FF4D00" : absDelta > 10 ? "#cc5533" : "#a07060");

  // Strong Buy target
  const sbBelow   = hasStrongBuy && currentPrice > (strongBuyPrice as number);
  const sbColor   = sbBelow ? "#10d97e" : "#f5a020";

  // Build panel data
  const sbPanel: PanelData | null = hasStrongBuy ? {
    key: "strongbuy", title: "Strong Buy Below",
    value: `$${(strongBuyPrice as number).toFixed(2)}`,
    icon: sbBelow ? "▲▲" : null, color: sbColor, sub: "",
  } : null;

  const buyPanel: PanelData | null = hasBuy ? {
    key: "buy", title: "Patient Buy Below",
    value: `$${(buyPrice as number).toFixed(2)}`,
    icon: buyBelow ? "▲" : null, color: buyColor, sub: "",
  } : null;

  const dcfPanel: PanelData = hasDCF ? {
    key: "dcf", title: "DCF Fair Value",
    value: `$${Number(dcf).toFixed(2)}`,
    icon: null, color: dcfColor, sub: "",
  } : {
    key: "dcf", title: "DCF Fair Value",
    value: "N/A",
    icon: null, color: "#555", sub: "Insufficient cash flow data",
  };

  const topRow = [sbPanel, buyPanel, dcfPanel].filter((p): p is PanelData => p != null);

  if (topRow.length === 0) return null;

  const divider = <div style={{ background: "rgba(255,255,255,0.06)", width: "1px" }} />;

  // Build grid template for a row of N panels with dividers between them
  const rowTemplate = (n: number) => Array.from({ length: n }, (_, i) => i < n - 1 ? "1fr 1px" : "1fr").join(" ");

  return (
    <div style={{ paddingTop: "8px" }}>
      <div style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888", marginBottom: "10px" }}>
        Valuation Context
      </div>

      {/* Row 1: Strong Buy + Patient Buy + DCF */}
      {topRow.length > 0 && (
        <div className="rsp-valuation-grid" style={{ display: "grid", gridTemplateColumns: rowTemplate(topRow.length), gap: "0", paddingBottom: "14px" }}>
          {topRow.map((p, i) => (
            <div key={p.key} style={{ display: "contents" }}>
              {i > 0 && divider}
              <div style={i > 0 ? { paddingLeft: "14px" } : undefined}>
                <Panel p={p} mono={mono} />
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
