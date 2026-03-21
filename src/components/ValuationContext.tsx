import type { IndustryGrowthData, IndustryPeer } from "../lib/api.ts";

interface ValuationContextProps {
  strongBuyPrice: number | null;
  buyPrice: number | null;
  dcf: number | null;
  currentPrice: number;
  industryGrowth: IndustryGrowthData | null;
  industryGrowthLoading: boolean;
  companyBlendedGrowth: number | null;
  onPeerSelect?: (ticker: string) => void;
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

function PeerCard({ peer, mono, onSelect }: { peer: IndustryPeer; mono: string; onSelect?: (ticker: string) => void }) {
  const pb = peer.payback;
  const color = pb <= 10 ? "#10d97e" : pb <= 15 ? "#f5a020" : "#FF4D00";
  return (
    <button
      onClick={() => onSelect?.(peer.symbol)}
      aria-label={`Load ${peer.symbol} — ${pb} year payback`}
      style={{
        padding: "clamp(2px, 1vw, 4px) clamp(2px, 1vw, 4px) clamp(2px, 1vw, 4px) clamp(4px, 2vw, 10px)",
        background: "transparent",
        border: "1px solid #C4A06E",
        cursor: "pointer",
        textAlign: "center",
        height: "100%",
        flex: "1 1 0",
        minWidth: 0,
        boxSizing: "border-box",
        fontFamily: "'Space Grotesk', sans-serif",
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase" as const,
        color: "#C4A06E",
        transition: "opacity 0.15s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "clamp(2px, 1vw, 6px)",
      }}
    >
      <span style={{ fontFamily: mono, fontSize: "clamp(8px, 2.2vw, 11px)", letterSpacing: "0.06em", color: "#888", whiteSpace: "nowrap" }}>
        {peer.symbol}
      </span>
      <span style={{ fontSize: "clamp(8px, 2.2vw, 11px)", color: "#555" }}>→</span>
      <div style={{ display: "flex", alignItems: "baseline", gap: "1px" }}>
        <span style={{ fontFamily: mono, fontSize: "clamp(12px, 3.5vw, 16px)", fontWeight: 600, color, letterSpacing: "-0.02em" }}>
          {pb}
        </span>
        <span style={{ fontSize: "clamp(7px, 1.8vw, 9px)", color: "#666", fontWeight: 400 }}>yr</span>
      </div>
    </button>
  );
}

export function ValuationContext({ strongBuyPrice, buyPrice, dcf, currentPrice, industryGrowth, industryGrowthLoading, companyBlendedGrowth, onPeerSelect }: ValuationContextProps) {
  const mono = "'JetBrains Mono', monospace";

  const hasStrongBuy = strongBuyPrice != null && strongBuyPrice > 0 && currentPrice > 0;
  const hasBuy       = buyPrice != null && buyPrice > 0 && currentPrice > 0;
  const hasDCF       = dcf != null && dcf > 0 && currentPrice > 0;
  const hasIndustry  = industryGrowth != null && !industryGrowth.error && industryGrowth.median != null;
  const showIndustrySlot = hasIndustry || industryGrowthLoading;

  if (!hasStrongBuy && !hasBuy && !hasDCF && !showIndustrySlot) return null;

  // Buy price (10y threshold)
  const buyBelow = hasBuy && currentPrice <= (buyPrice as number);
  const buyColor = buyBelow ? "#10d97e" : "#f5a020";

  // DCF color based on delta vs current price
  const dcfDelta    = hasDCF ? (((dcf as number) - currentPrice) / currentPrice) * 100 : 0;
  const absDelta    = Math.abs(dcfDelta);
  const dcfColor    = dcfDelta > 0
    ? (absDelta > 25 ? "#10d97e" : absDelta > 10 ? "#5aad82" : "#8abfa8")
    : (absDelta > 25 ? "#FF4D00" : absDelta > 10 ? "#cc5533" : "#a07060");

  // Industry Growth comparison
  let industryColor = "#888";
  let industryLabel = "";
  let industryValue = "...";
  if (industryGrowthLoading) {
    industryColor = "#888";
    industryLabel = "Loading";
    industryValue = "...";
  } else if (hasIndustry) {
    const median = industryGrowth!.median;
    industryValue = `${median.toFixed(1)}%`;
    if (companyBlendedGrowth != null) {
      const diff = companyBlendedGrowth - median;
      if (diff > 2) {
        industryColor = "#10d97e";
        industryLabel = "Above Industry";
      } else if (diff < -2) {
        industryColor = "#FF4D00";
        industryLabel = "Below Industry";
      } else {
        industryColor = "#f5a020";
        industryLabel = industryGrowth!.industry;
      }
    } else {
      industryLabel = `n=${industryGrowth!.count}`;
    }
  }

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

  const industryPanel: PanelData | null = showIndustrySlot ? {
    key: "industry", title: "Industry Growth",
    value: industryValue,
    icon: null, color: industryColor, sub: industryLabel,
  } : null;

  const topRow = [sbPanel, buyPanel, dcfPanel].filter((p): p is PanelData => p != null);
  const peers: IndustryPeer[] = hasIndustry && industryGrowth!.peers ? industryGrowth!.peers.slice(0, 3) : [];
  const showBottomRow = industryPanel != null || peers.length > 0;

  if (topRow.length === 0 && !showBottomRow) return null;

  const divider = <div style={{ background: "rgba(255,255,255,0.06)", width: "1px" }} />;
  const hDivider = <div style={{ background: "rgba(255,255,255,0.06)", height: "1px", gridColumn: "1 / -1" }} />;

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

      {/* Row 2: Industry Growth + up to 3 peer companies */}
      {showBottomRow && (() => {
        const totalCols = (industryPanel ? 1 : 0) + peers.length;
        if (totalCols === 0) return null;
        return (
          <div style={{ display: "flex", alignItems: "stretch", gap: "0", paddingTop: "14px" }}>
            {industryPanel && <div style={{ paddingRight: "3px" }}><Panel p={industryPanel} mono={mono} /></div>}
            <div style={{ display: "flex", gap: "clamp(4px, 1.5vw, 9px)", paddingLeft: "4px", flex: 1, justifyContent: "center", minWidth: 0 }}>
              {peers.map((peer) => (
                <PeerCard key={peer.symbol} peer={peer} mono={mono} onSelect={onPeerSelect} />
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
