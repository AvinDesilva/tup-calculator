import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { C } from "../lib/theme.ts";
import { GICS_SECTORS } from "../lib/constants.ts";
import type { RollFilters, MarketCapTier, ExchangeFilter } from "../lib/types.ts";

const DEFAULT_FILTERS: RollFilters = { marketCap: "All", sector: "", exchange: "All", indexEtf: "" };

interface DiceFilterBarProps {
  isOpen: boolean;
  activeFilters: RollFilters;
  onApply: (f: RollFilters) => void;
  onReset: () => void;
}

const CAPS: MarketCapTier[] = ["All", "Micro", "Small", "Mid", "Large"];
const EXCHANGES: ExchangeFilter[] = ["All", "NYSE", "NASDAQ", "OTC", "LSE", "TSX"];
const SECTOR_OPTIONS = ["", ...GICS_SECTORS] as const;

function SectorDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const width = Math.max(rect.width, 180);
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
  }, [open]);

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

  const dropdown = open && pos ? createPortal(
    <div ref={listRef} style={{
      position: "absolute",
      top: pos.top,
      left: pos.left,
      width: pos.width,
      zIndex: 99999,
      background: "#1a1a1a",
      border: "1px solid rgba(255,255,255,0.12)",
      borderTop: "none",
      maxHeight: "240px",
      overflowY: "auto",
      boxShadow: "0 8px 24px rgba(0,0,0,0.8)",
    }}>
      {SECTOR_OPTIONS.map((s, i) => (
        <div
          key={s || "_all"}
          onMouseDown={e => { e.preventDefault(); select(s); }}
          onMouseEnter={() => setActiveIndex(i)}
          style={{
            padding: "8px 16px",
            cursor: "pointer",
            background: i === activeIndex ? "#2a2520" : "#1a1a1a",
            transition: "background 0.1s",
            display: "flex", alignItems: "center",
          }}
        >
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "13px",
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
        style={{
          background: "transparent",
          border: "none",
          borderBottom: `1px solid ${open ? "#C4A06E" : "rgba(255,255,255,0.1)"}`,
          color: value ? "#C4A06E" : "#666",
          fontFamily: C.mono,
          fontSize: "10px",
          padding: "3px 0",
          cursor: "pointer",
          textAlign: "left",
          outline: "none",
          whiteSpace: "nowrap",
          transition: "border-color 0.15s",
        }}
      >
        {value || "All"} <span style={{ fontSize: "7px", marginLeft: "2px", opacity: 0.5 }}>▼</span>
      </button>
      {dropdown}
    </>
  );
}

function filtersEqual(a: RollFilters, b: RollFilters): boolean {
  return a.marketCap === b.marketCap && a.sector === b.sector && a.exchange === b.exchange && a.indexEtf === b.indexEtf;
}

function isDefault(f: RollFilters): boolean {
  return filtersEqual(f, DEFAULT_FILTERS);
}

export function DiceFilterBar({ isOpen, activeFilters, onApply, onReset }: DiceFilterBarProps) {
  const [pending, setPending] = useState<RollFilters>(activeFilters);
  const [applied, setApplied] = useState(false);

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

  return (
    <div className={`rsp-dice-filter-wrap${isOpen ? " rsp-dice-filter-open" : ""}`} style={{
      overflow: "hidden",
      maxHeight: isOpen ? "120px" : "0",
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
        {/* Market Cap */}
        <div>
          <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: "4px" }}>Cap</div>
          <div style={{ display: "flex" }}>
            {CAPS.map((cap, i) => (
              <button key={cap} onClick={() => setPending(p => ({ ...p, marketCap: cap }))} style={{
                fontSize: "9px",
                fontWeight: 700,
                fontFamily: C.mono,
                letterSpacing: "0.05em",
                padding: "3px 7px",
                background: pending.marketCap === cap ? "rgba(196,160,110,0.2)" : "transparent",
                border: `1px solid ${pending.marketCap === cap ? "#C4A06E" : "rgba(255,255,255,0.1)"}`,
                color: pending.marketCap === cap ? "#C4A06E" : "#666",
                cursor: "pointer",
                borderRadius: i === 0 ? "3px 0 0 3px" : i === CAPS.length - 1 ? "0 3px 3px 0" : "0",
                marginLeft: i > 0 ? "-1px" : "0",
              }}>{cap}</button>
            ))}
          </div>
        </div>

        {/* Exchange */}
        <div>
          <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: "4px" }}>Exchange</div>
          <div style={{ display: "flex" }}>
            {EXCHANGES.map((ex, i) => (
              <button key={ex} onClick={() => setPending(p => ({ ...p, exchange: ex }))} style={{
                fontSize: "9px",
                fontWeight: 700,
                fontFamily: C.mono,
                letterSpacing: "0.05em",
                padding: "3px 7px",
                background: pending.exchange === ex ? "rgba(196,160,110,0.2)" : "transparent",
                border: `1px solid ${pending.exchange === ex ? "#C4A06E" : "rgba(255,255,255,0.1)"}`,
                color: pending.exchange === ex ? "#C4A06E" : "#666",
                cursor: "pointer",
                borderRadius: i === 0 ? "3px 0 0 3px" : i === EXCHANGES.length - 1 ? "0 3px 3px 0" : "0",
                marginLeft: i > 0 ? "-1px" : "0",
              }}>{ex}</button>
            ))}
          </div>
        </div>

        {/* Sector */}
        <div>
          <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: "4px" }}>Sector</div>
          <SectorDropdown value={pending.sector} onChange={v => setPending(p => ({ ...p, sector: v }))} />
        </div>

        {/* ETF */}
        <div>
          <div style={{ fontSize: "8px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: "4px" }}>ETF</div>
          <input
            type="text"
            placeholder="VTI"
            value={pending.indexEtf}
            onChange={e => setPending(p => ({ ...p, indexEtf: e.target.value.toUpperCase() }))}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: `1px solid rgba(255,255,255,0.1)`,
              color: pending.indexEtf ? "#C4A06E" : C.text1,
              fontFamily: C.mono,
              fontSize: "10px",
              padding: "3px 0",
              width: "50px",
              outline: "none",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          />
        </div>

        {/* Apply + Reset */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={handleApply} disabled={!hasPendingChanges && !applied} style={{
            fontSize: "9px",
            fontWeight: 700,
            fontFamily: C.mono,
            letterSpacing: "0.08em",
            padding: "4px 10px",
            background: "transparent",
            border: `1px solid ${applied ? "rgba(0,191,165,0.5)" : hasPendingChanges ? "rgba(0,191,165,0.5)" : "rgba(255,255,255,0.1)"}`,
            color: applied ? "#00BFA5" : hasPendingChanges ? "#00BFA5" : "#444",
            cursor: hasPendingChanges ? "pointer" : "default",
            textTransform: "uppercase",
            transition: "all 0.15s",
            borderRadius: "3px",
          }}>
            {applied ? "Applied \u2713" : "Apply"}
          </button>
          {showReset && (
            <button onClick={handleReset} style={{
              fontSize: "9px",
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
      </div>
    </div>
  );
}
