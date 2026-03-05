interface ValuationContextProps {
  lynchRatio: number | null;
  dcf: number | null;
  currentPrice: number;
  altmanZ: number | null;
  piotroski: number | null;
}

interface PanelData {
  key: string;
  title: string;
  value: string;
  icon: string | null;
  color: string;
  sub: string;
}

export function ValuationContext({ lynchRatio, dcf, currentPrice, altmanZ, piotroski }: ValuationContextProps) {
  const mono = "'JetBrains Mono', monospace";

  const hasLynch     = lynchRatio != null && isFinite(lynchRatio);
  const hasDCF       = dcf != null && dcf > 0 && currentPrice > 0;
  const hasAltman    = altmanZ != null && isFinite(altmanZ);
  const hasPiotroski = piotroski != null && isFinite(piotroski);
  if (!hasLynch && !hasDCF && !hasAltman && !hasPiotroski) return null;

  // Lynch PEG
  const lynchIcon  = (lynchRatio as number) < 1 ? "✓" : (lynchRatio as number) <= 2 ? "■" : "!";
  const lynchColor = (lynchRatio as number) < 1 ? "#10d97e" : (lynchRatio as number) <= 2 ? "#f5a020" : "#FF4D00";

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

  // Piotroski zones
  const pioColor = hasPiotroski
    ? ((piotroski as number) >= 7 ? "#10d97e" : (piotroski as number) >= 4 ? "#f5a020" : "#FF4D00")
    : "#888";
  const pioLabel = hasPiotroski
    ? ((piotroski as number) >= 7 ? "Strong fundamentals" : (piotroski as number) >= 4 ? "Neutral" : "Weak fundamentals")
    : "";

  // Build panel list (only include panels with data)
  const panels: PanelData[] = [
    hasLynch && {
      key: "lynch",
      title: "Lynch Score",
      value: Number(lynchRatio).toFixed(2),
      icon: lynchIcon,
      color: lynchColor,
      sub: (lynchRatio as number) < 1 ? "PEG < 1 — below growth" : (lynchRatio as number) <= 2 ? "PEG 1–2 — fairly valued" : "PEG > 2 — expensive",
    },
    hasDCF && {
      key: "dcf",
      title: "DCF Fair Value",
      value: `$${Number(dcf).toFixed(2)}`,
      icon: null,
      color: dcfColor,
      sub: dcfLabel,
    },
    hasAltman && {
      key: "altman",
      title: "Altman Z-Score",
      value: Number(altmanZ).toFixed(2),
      icon: null,
      color: altmanColor,
      sub: altmanLabel,
    },
    hasPiotroski && {
      key: "piotroski",
      title: "Piotroski F-Score",
      value: `${piotroski}/9`,
      icon: null,
      color: pioColor,
      sub: pioLabel,
    },
  ].filter((p): p is PanelData => Boolean(p));

  if (panels.length === 0) return null;

  // Alternating content + 1px divider columns
  const cols = panels.map((_, i) => (i < panels.length - 1 ? ["1fr", "1px"] : ["1fr"])).flat();

  return (
    <div style={{ marginTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "14px" }}>
      <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888", marginBottom: "10px" }}>
        Valuation Context
      </div>
      <div className="rsp-valuation-grid" style={{ display: "grid", gridTemplateColumns: cols.join(" "), gap: "0" }}>
        {panels.map((p, i) => [
          <div key={p.key} className="rsp-val-panel" style={{ paddingRight: i < panels.length - 1 ? "14px" : "0", paddingLeft: i > 0 ? "14px" : "0" }}>
            <div className="rsp-val-title" style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#888", marginBottom: "6px" }}>
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
            <div style={{ fontSize: "9px", color: "#888", marginTop: "4px", letterSpacing: "0.06em" }}>
              {p.sub}
            </div>
          </div>,
          i < panels.length - 1 && (
            <div key={`div-${i}`} className="rsp-val-div" style={{ background: "rgba(255,255,255,0.06)", width: "1px" }} />
          ),
        ])}
      </div>
    </div>
  );
}
