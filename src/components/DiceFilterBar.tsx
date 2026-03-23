import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { C } from "../lib/theme.ts";
import { GICS_SECTORS } from "../lib/constants.ts";
import type { RollFilters, MarketCapTier, ExchangeFilter } from "../lib/types.ts";

const DEFAULT_FILTERS: RollFilters = { marketCap: [], sector: "", exchange: [], indexEtf: "" };

interface DiceFilterBarProps {
  isOpen: boolean;
  activeFilters: RollFilters;
  onApply: (f: RollFilters) => void;
  onReset: () => void;
  variant?: "hero" | "compact";
}

const CAPS: MarketCapTier[] = ["Micro", "Small", "Mid", "Large"];
const EXCHANGES: ExchangeFilter[] = ["NYSE", "NASDAQ", "LSE", "TSX"];
const SECTOR_OPTIONS = ["", ...GICS_SECTORS] as const;

function SectorDropdown({ value, onChange, large }: { value: string; onChange: (v: string) => void; large?: boolean }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const width = Math.max(rect.width, large ? 260 : 180);
      setPos({ top: rect.bottom + window.scrollY, left: rect.right + window.scrollX - width, width });
    }
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, large]);

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const row = listRef.current.children[activeIndex] as HTMLElement | undefined;
    row?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const select = (v: string) => { onChange(v); setOpen(false); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(true); } return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => (i + 1) % SECTOR_OPTIONS.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => (i <= 0 ? SECTOR_OPTIONS.length - 1 : i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (activeIndex >= 0) select(SECTOR_OPTIONS[activeIndex]); }
    else if (e.key === "Escape") setOpen(false);
  };

  const dropdownFontSize = large ? "18px" : "13px";
  const dropdownPadding = large ? "12px 20px" : "8px 16px";

  const dropdown = open && pos ? createPortal(
    <div ref={listRef} role="listbox" aria-label="Sector options" style={{
      position: "absolute",
      top: pos.top,
      left: pos.left,
      width: pos.width,
      zIndex: 99999,
      background: "#1a1a1a",
      border: "1px solid rgba(255,255,255,0.12)",
      borderTop: "none",
      maxHeight: large ? "320px" : "240px",
      overflowY: "auto",
      boxShadow: "0 8px 24px rgba(0,0,0,0.8)",
    }}>
      {SECTOR_OPTIONS.map((s, i) => (
        <div
          key={s || "_all"}
          role="option"
          id={`sector-option-${i}`}
          aria-selected={s === value}
          tabIndex={-1}
          onMouseDown={e => { e.preventDefault(); select(s); }}
          onMouseEnter={() => setActiveIndex(i)}
          style={{
            padding: dropdownPadding,
            cursor: "pointer",
            background: i === activeIndex ? "#2a2520" : "#1a1a1a",
            transition: "background 0.1s",
            display: "flex", alignItems: "center",
          }}
        >
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: dropdownFontSize,
            color: (s === value) ? "#C4A06E" : "#e8e4dc",
            fontWeight: (s === value) ? 600 : 400,
          }}>
            {s || "All Sectors"}
          </span>
        </div>
      ))}
    </div>,
    document.body,
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Select sector: ${value || "All"}`}
        style={{
          background: "transparent",
          border: "none",
          borderBottom: `1px solid ${open ? "#C4A06E" : "rgba(255,255,255,0.1)"}`,
          color: value ? "#C4A06E" : "#666",
          fontFamily: C.mono,
          fontSize: large ? "18px" : "12.5px",
          padding: large ? "6px 0" : "4px 0",
          cursor: "pointer",
          textAlign: "left",
          whiteSpace: "nowrap",
          transition: "border-color 0.15s",
        }}
      >
        {value || "All"} <span style={{ fontSize: large ? "12px" : "9px", marginLeft: "2px", opacity: 0.5 }}>▼</span>
      </button>
      {dropdown}
    </>
  );
}

function filtersEqual(a: RollFilters, b: RollFilters): boolean {
  return a.marketCap.length === b.marketCap.length && a.marketCap.every(c => b.marketCap.includes(c)) && a.sector === b.sector && a.exchange.length === b.exchange.length && a.exchange.every(e => b.exchange.includes(e)) && a.indexEtf === b.indexEtf;
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

  // Compact is ~62.5% of hero (50% base + 25% increase)
  const labelSize = hero ? "clamp(10px, 3.5vw, 16px)" : "clamp(9px, 2.5vw, 11px)";
  const btnFontSize = hero ? "clamp(11px, 3.8vw, 18px)" : "clamp(10px, 2.5vw, 12.5px)";
  const btnPadding = hero ? "clamp(4px, 1.5vw, 8px) clamp(6px, 2vw, 16px)" : "clamp(4px, 1vw, 6px) clamp(6px, 1.5vw, 11px)";
  const etfInputSize = hero ? "clamp(12px, 3.8vw, 18px)" : "clamp(10px, 2.5vw, 12.5px)";
  const etfInputWidth = hero ? "clamp(60px, 12vw, 100px)" : "clamp(50px, 10vw, 75px)";
  const etfInputPadding = hero ? "6px 0" : "4px 0";
  const applyFontSize = hero ? "clamp(12px, 3.8vw, 18px)" : "clamp(10px, 2.5vw, 12.5px)";
  const applyPadding = hero ? "clamp(5px, 1.5vw, 8px) clamp(12px, 3vw, 20px)" : "clamp(4px, 1vw, 6px) clamp(10px, 2.25vw, 15px)";
  const resetFontSize = hero ? "clamp(12px, 3.8vw, 18px)" : "clamp(10px, 2.5vw, 12.5px)";

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

  const capButtons = (
    <div className="rsp-dice-btn-group" style={heroRowStyle} role="group" aria-label="Market cap filter">
      <div style={{ fontSize: labelSize, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: hero ? "8px" : "4px", textAlign: hero ? "center" : "left", marginLeft: hero ? undefined : "4px" }}>Cap</div>
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
      <div style={{ fontSize: labelSize, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: hero ? "8px" : "4px", textAlign: hero ? "center" : "left", marginLeft: hero ? undefined : "4px" }}>Exchange</div>
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
      <div style={{ fontSize: labelSize, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: hero ? "8px" : "4px" }}>Sector</div>
      <SectorDropdown value={pending.sector} onChange={v => setPending(p => ({ ...p, sector: v }))} large={hero} />
    </div>
  );

  const etfField = (
    <div>
      <div style={{ fontSize: labelSize, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: hero ? "8px" : "4px", textAlign: "right" }}>ETF</div>
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
    <div style={{ display: "flex", alignItems: "center", gap: hero ? "16px" : "10px" }}>
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
        maxHeight: isOpen ? "400px" : "0",
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
          {/* Row 2: Exchange */}
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
      maxHeight: isOpen ? "300px" : "0",
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
        <div className="rsp-dice-row">
          {sectorField}
          {etfField}
          <div style={{ marginLeft: "6px" }}>{applyResetButtons}</div>
        </div>
      </div>
    </div>
  );
}
