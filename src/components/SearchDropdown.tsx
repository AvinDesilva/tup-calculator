import { createPortal } from "react-dom";
import type { SearchResult } from "../lib/api.ts";

interface SearchDropdownProps {
  results: SearchResult[];
  isLoading: boolean;
  activeIndex: number;
  onSelect: (symbol: string) => void;
  onHover: (index: number) => void;
  position: { top: number; left: number; width: number } | null;
  show: boolean;
  listRef: React.RefObject<HTMLDivElement | null>;
  listboxId: string;
}

export function SearchDropdown({
  results, isLoading, activeIndex, onSelect, onHover,
  position, show, listRef, listboxId,
}: SearchDropdownProps) {
  if (!show || !position) return null;

  return createPortal(
    <div
      ref={listRef}
      id={listboxId}
      role="listbox"
      aria-label="Search results"
      style={{
        position: "absolute",
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 99999,
        background: "#1a1a1a",
        border: "1px solid rgba(255,255,255,0.12)",
        borderTop: "none",
        maxHeight: "280px",
        overflowY: "auto",
        boxShadow: "0 8px 24px rgba(0,0,0,0.8)",
      }}
    >
      {isLoading ? (
        <div role="status" style={{ padding: "12px 16px", fontSize: "14px", color: "#888888", fontFamily: "'Space Grotesk', sans-serif", background: "#1a1a1a" }}>
          Searching...
        </div>
      ) : results.length === 0 ? (
        <div role="status" style={{ padding: "12px 16px", fontSize: "14px", color: "#888888", fontFamily: "'Space Grotesk', sans-serif", background: "#1a1a1a" }}>
          No results found
        </div>
      ) : results.map((r, i) => (
        <div
          key={r.symbol}
          role="option"
          id={`ticker-option-${i}`}
          aria-selected={i === activeIndex}
          tabIndex={-1}
          onMouseDown={e => { e.preventDefault(); onSelect(r.symbol); }}
          onMouseEnter={() => onHover(i)}
          style={{
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            cursor: "pointer",
            background: i === activeIndex ? "#2a2520" : "#1a1a1a",
            transition: "background 0.1s",
          }}
        >
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "16px",
            fontWeight: 600,
            color: "#00BFA5",
            minWidth: "60px",
            flexShrink: 0,
          }}>
            {r.symbol}
          </span>
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "15px",
            color: "#e8e4dc",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}>
            {r.name}
          </span>
          <span style={{
            fontSize: "13px",
            color: "#505050",
            flexShrink: 0,
          }}>
            {r.exchange}
          </span>
        </div>
      ))}
    </div>,
    document.body,
  );
}
