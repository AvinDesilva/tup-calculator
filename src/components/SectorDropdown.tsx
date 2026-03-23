import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { C } from "../lib/theme.ts";
import { GICS_SECTORS } from "../lib/constants.ts";

const SECTOR_OPTIONS = ["", ...GICS_SECTORS] as const;

export function SectorDropdown({ value, onChange, large }: { value: string; onChange: (v: string) => void; large?: boolean }) {
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
