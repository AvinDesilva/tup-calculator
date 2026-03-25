import { useState, useEffect } from "react";
import { C } from "../lib/theme.ts";
import { SectorDropdown } from "./SectorDropdown.tsx";
import type { RollFilters, MarketCapTier, ExchangeFilter, TupRangeFilter } from "../lib/types.ts";

const DEFAULT_FILTERS: RollFilters = { marketCap: [], sector: "", exchange: [], indexEtf: "", tupRange: [] };

interface DiceFilterBarProps {
  isOpen: boolean;
  activeFilters: RollFilters;
  onApply: (f: RollFilters) => void;
  onReset: () => void;
  variant?: "hero" | "compact";
}

const CAPS: MarketCapTier[] = ["Micro", "Small", "Mid", "Large"];
const EXCHANGES: ExchangeFilter[] = ["NYSE", "NASDAQ", "LSE", "TSX"];
const TUP_RANGES: TupRangeFilter[] = ["≤7", "≤9", "10–12", "13–15", "15+"];

function filtersEqual(a: RollFilters, b: RollFilters): boolean {
  return a.marketCap.length === b.marketCap.length && a.marketCap.every(c => b.marketCap.includes(c)) && a.sector === b.sector && a.exchange.length === b.exchange.length && a.exchange.every(e => b.exchange.includes(e)) && a.indexEtf === b.indexEtf && a.tupRange.length === b.tupRange.length && a.tupRange.every(r => b.tupRange.includes(r));
}

function isDefault(f: RollFilters): boolean {
  return filtersEqual(f, DEFAULT_FILTERS);
}

export function DiceFilterBar({ isOpen, activeFilters, onApply, onReset, variant = "compact" }: DiceFilterBarProps) {
  const [pending, setPending] = useState<RollFilters>(activeFilters);
  const [applied, setApplied] = useState(false);
  const hero = variant === "hero";

  // Sync pending when activeFilters change externally (e.g. reset)
  useEffect(() => { setPending(activeFilters); }, [activeFilters]);

  const hasPendingChanges = !filtersEqual(pending, activeFilters);
  const pendingIsDefault = isDefault(pending);
  const showReset = !isDefault(activeFilters) || !pendingIsDefault;

  const handleApply = () => {
    onApply(pending);
    setApplied(true);
    setTimeout(() => setApplied(false), 1500);
  };

  const handleReset = () => {
    setPending(DEFAULT_FILTERS);
    onReset();
  };

  const labelSize = "clamp(9px, 2.5vw, 11px)";
  const btnFontSize = "clamp(10px, 2.5vw, 12.5px)";
  const btnPadding = "clamp(4px, 1vw, 6px) clamp(6px, 1.5vw, 11px)";
  const etfInputSize = "clamp(10px, 2.5vw, 12.5px)";
  const etfInputWidth = "clamp(50px, 10vw, 75px)";
  const etfInputPadding = "4px 0";
  const applyFontSize = "clamp(10px, 2.5vw, 12.5px)";
  const applyPadding = "clamp(4px, 1vw, 6px) clamp(10px, 2.25vw, 15px)";
  const resetFontSize = "clamp(10px, 2.5vw, 12.5px)";

  const heroRowStyle: React.CSSProperties = hero ? { width: "100%", maxWidth: "100%", padding: "0 12px", boxSizing: "border-box" } : {};

  const allCapLabels = ["All", ...CAPS] as const;

  const toggleCap = (cap: MarketCapTier) => {
    setPending(p => {
      if (p.marketCap.includes(cap)) {
        return { ...p, marketCap: p.marketCap.filter(c => c !== cap) };
      }
      return { ...p, marketCap: [...p.marketCap, cap] };
    });
  };

  const isCapSelected = (label: string) => label === "All" ? pending.marketCap.length === 0 : pending.marketCap.includes(label as MarketCapTier);

  const toggleTupRange = (range: TupRangeFilter) => {
    setPending(p => {
      if (p.tupRange.includes(range)) {
        return { ...p, tupRange: p.tupRange.filter(r => r !== range) };
      }
      return { ...p, tupRange: [...p.tupRange, range] };
    });
  };

  const isTupSelected = (label: string) => label === "All" ? pending.tupRange.length === 0 : pending.tupRange.includes(label as TupRangeFilter);

  const allTupLabels = ["All", ...TUP_RANGES] as const;

  const tupRangeButtons = (
    <div className="rsp-dice-btn-group" style={heroRowStyle} role="group" aria-label="TUP range filter">
      <div style={{ fontSize: labelSize, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: "4px", textAlign: hero ? "center" : "left", marginLeft: hero ? undefined : "4px" }}>TUP Range</div>
      <div style={{ display: "flex", justifyContent: hero ? "center" : undefined }}>
        {allTupLabels.map((label, i) => {
          const active = isTupSelected(label);
          return (
            <button key={label} aria-pressed={active} onClick={() => label === "All" ? setPending(p => ({ ...p, tupRange: [] })) : toggleTupRange(label as TupRangeFilter)} style={{
              fontSize: btnFontSize,
              fontWeight: 700,
              fontFamily: C.mono,
              letterSpacing: "0.05em",
              padding: btnPadding,
              ...(hero ? { flex: "1 1 0", minWidth: 0 } : {}),
              background: active ? "rgba(196,160,110,0.2)" : "transparent",
              border: `1px solid ${active ? "#C4A06E" : "rgba(255,255,255,0.1)"}`,
              color: active ? "#C4A06E" : "#666",
              cursor: "pointer",
              borderRadius: i === 0 ? "3px 0 0 3px" : i === allTupLabels.length - 1 ? "0 3px 3px 0" : "0",
              marginLeft: i > 0 ? "-1px" : "0",
            }}>{label}</button>
          );
        })}
      </div>
    </div>
  );

  const capButtons = (
    <div className="rsp-dice-btn-group" style={heroRowStyle} role="group" aria-label="Market cap filter">
      <div style={{ fontSize: labelSize, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: "4px", textAlign: hero ? "center" : "left", marginLeft: hero ? undefined : "4px" }}>Cap</div>
      <div style={{ display: "flex", justifyContent: hero ? "center" : undefined }}>
        {allCapLabels.map((cap, i) => {
          const active = isCapSelected(cap);
          return (
            <button key={cap} aria-pressed={active} onClick={() => cap === "All" ? setPending(p => ({ ...p, marketCap: [] })) : toggleCap(cap as MarketCapTier)} style={{
              fontSize: btnFontSize,
              fontWeight: 700,
              fontFamily: C.mono,
              letterSpacing: "0.05em",
              padding: btnPadding,
              ...(hero ? { flex: "1 1 0", minWidth: 0 } : {}),
              background: active ? "rgba(196,160,110,0.2)" : "transparent",
              border: `1px solid ${active ? "#C4A06E" : "rgba(255,255,255,0.1)"}`,
              color: active ? "#C4A06E" : "#666",
              cursor: "pointer",
              borderRadius: i === 0 ? "3px 0 0 3px" : i === allCapLabels.length - 1 ? "0 3px 3px 0" : "0",
              marginLeft: i > 0 ? "-1px" : "0",
            }}>{cap}</button>
          );
        })}
      </div>
    </div>
  );

  // Wider labels get more flex share so "NASDAQ" doesn't overflow
  const exchangeFlex: Record<string, string> = { All: "1.4 1 0", NYSE: "1.4 1 0", NASDAQ: "1.8 1 0", LSE: "1 1 0", TSX: "1 1 0" };
  const allExLabels = ["All", ...EXCHANGES] as const;

  const toggleExchange = (ex: ExchangeFilter) => {
    setPending(p => {
      // NYSE and NASDAQ can be multi-selected together
      if (ex === "NYSE" || ex === "NASDAQ") {
        if (p.exchange.includes(ex)) {
          return { ...p, exchange: p.exchange.filter(e => e !== ex) };
        }
        return { ...p, exchange: [...p.exchange.filter(e => e === "NYSE" || e === "NASDAQ"), ex] };
      }
      // LSE/TSX: single-select toggle
      if (p.exchange.length === 1 && p.exchange[0] === ex) {
        return { ...p, exchange: [] };
      }
      return { ...p, exchange: [ex] };
    });
  };

  const isExSelected = (label: string) => label === "All" ? pending.exchange.length === 0 : pending.exchange.includes(label as ExchangeFilter);

  const exchangeButtons = (
    <div className="rsp-dice-btn-group" style={heroRowStyle} role="group" aria-label="Exchange filter">
      <div style={{ fontSize: labelSize, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: "4px", textAlign: hero ? "center" : "left", marginLeft: hero ? undefined : "4px" }}>Exchange</div>
      <div style={{ display: "flex", justifyContent: hero ? "center" : "flex-end" }}>
        {allExLabels.map((ex, i) => {
          const active = isExSelected(ex);
          return (
            <button key={ex} aria-pressed={active} onClick={() => ex === "All" ? setPending(p => ({ ...p, exchange: [] })) : toggleExchange(ex as ExchangeFilter)} style={{
              fontSize: btnFontSize,
              fontWeight: 700,
              fontFamily: C.mono,
              letterSpacing: "0.05em",
              padding: btnPadding,
              ...(hero ? { flex: exchangeFlex[ex] || "1 1 0", minWidth: 0 } : {}),
              background: active ? "rgba(196,160,110,0.2)" : "transparent",
              border: `1px solid ${active ? "#C4A06E" : "rgba(255,255,255,0.1)"}`,
              color: active ? "#C4A06E" : "#666",
              cursor: "pointer",
              borderRadius: i === 0 ? "3px 0 0 3px" : i === allExLabels.length - 1 ? "0 3px 3px 0" : "0",
              marginLeft: i > 0 ? "-1px" : "0",
            }}>{ex}</button>
          );
        })}
      </div>
    </div>
  );

  const sectorField = (
    <div>
      <div style={{ fontSize: labelSize, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: "4px" }}>Sector</div>
      <SectorDropdown value={pending.sector} onChange={v => setPending(p => ({ ...p, sector: v }))} />
    </div>
  );

  const etfField = (
    <div>
      <div style={{ fontSize: labelSize, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: "4px", textAlign: "right" }}>ETF</div>
      <input
        type="text"
        placeholder="VTI"
        aria-label="Filter by ETF ticker"
        value={pending.indexEtf}
        onChange={e => setPending(p => ({ ...p, indexEtf: e.target.value.toUpperCase() }))}
        style={{
          background: "transparent",
          border: "none",
          borderBottom: `1px solid rgba(255,255,255,0.1)`,
          color: pending.indexEtf ? "#C4A06E" : C.text1,
          fontFamily: C.mono,
          fontSize: etfInputSize,
          padding: etfInputPadding,
          width: etfInputWidth,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      />
    </div>
  );

  const applyResetButtons = (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <button onClick={handleApply} disabled={!hasPendingChanges && !applied} style={{
        fontSize: applyFontSize,
        fontWeight: 700,
        fontFamily: C.mono,
        letterSpacing: "0.08em",
        padding: applyPadding,
        background: "transparent",
        border: `1px solid ${applied ? "rgba(0,191,165,0.5)" : hasPendingChanges ? "rgba(0,191,165,0.5)" : "transparent"}`,
        color: applied ? "#00BFA5" : hasPendingChanges ? "#00BFA5" : "#444",
        cursor: hasPendingChanges ? "pointer" : "default",
        textTransform: "uppercase",
        transition: "all 0.15s",
        borderRadius: "3px",
        marginBottom: "3px",
      }}>
        {applied ? "Applied \u2713" : "Apply"}
      </button>
      {showReset && (
        <button onClick={handleReset} style={{
          fontSize: resetFontSize,
          fontWeight: 600,
          fontFamily: C.mono,
          letterSpacing: "0.05em",
          padding: "0",
          background: "transparent",
          border: "none",
          color: "#666",
          cursor: "pointer",
          textTransform: "uppercase",
          transition: "color 0.15s",
        }}>Reset</button>
      )}
    </div>
  );

  if (hero) {
    return (
      <div className={`rsp-dice-filter-wrap${isOpen ? " rsp-dice-filter-open" : ""}`} inert={!isOpen || undefined} style={{
        overflow: "hidden",
        maxHeight: isOpen ? "480px" : "0",
        transition: "max-height 0.3s ease",
      }}>
        <div style={{
          paddingTop: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          width: "100%",
        }}>
          {/* Row 1: Cap */}
          {capButtons}
          {/* Row 2: TUP Range */}
          {tupRangeButtons}
          {/* Row 3: Exchange */}
          {exchangeButtons}
          {/* Row 3: Sector + ETF + Apply */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "24px", flexWrap: "wrap", justifyContent: "center", padding: "0 12px" }}>
            {sectorField}
            {etfField}
            {applyResetButtons}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rsp-dice-filter-wrap${isOpen ? " rsp-dice-filter-open" : ""}`} inert={!isOpen || undefined} style={{
      overflow: "hidden",
      maxHeight: isOpen ? "380px" : "0",
      transition: "max-height 0.25s ease",
    }}>
      <div className="rsp-dice-filter" style={{
        paddingTop: "12px",
        paddingRight: "10px",
        display: "flex",
        flexWrap: "wrap",
        gap: "16px",
        alignItems: "flex-end",
        justifyContent: "flex-end",
      }}>
        <div className="rsp-dice-row">{capButtons}{exchangeButtons}</div>
        <div className="rsp-dice-row">{tupRangeButtons}</div>
        <div className="rsp-dice-row">
          {sectorField}
          {etfField}
          <div style={{ marginLeft: "6px" }}>{applyResetButtons}</div>
        </div>
      </div>
    </div>
  );
}
