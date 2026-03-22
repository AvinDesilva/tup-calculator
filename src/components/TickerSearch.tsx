import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type React from "react";
import { searchTickers } from "../lib/api.ts";
import type { SearchResult } from "../lib/api.ts";

interface TickerSearchProps {
  value: string;
  onChange: (v: string) => void;
  onSelect: (ticker: string) => void;
  onSubmit: () => void;
  inputStyle?: React.CSSProperties;
  placeholder?: string;
  autoFocus?: boolean;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export function TickerSearch({
  value, onChange, onSelect, onSubmit,
  inputStyle, placeholder, autoFocus, onFocus, onBlur,
}: TickerSearchProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const suppressRef = useRef(false);
  const hasFocusRef = useRef(false);
  const lastSearchedRef = useRef("");

  // Position the dropdown relative to the input
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, []);

  // Debounced search — only fires when input actually changes to a new value
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (suppressRef.current) { suppressRef.current = false; return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (value.trim().length < 2) { setResults([]); setIsOpen(false); setIsLoading(false); return; }
    if (value.trim() === lastSearchedRef.current) return;

    setIsLoading(true);
    timerRef.current = setTimeout(async () => {
      const q = value.trim();
      const r = await searchTickers(q);
      lastSearchedRef.current = q;
      setResults(r);
      setIsOpen(hasFocusRef.current);
      setActiveIndex(-1);
      setIsLoading(false);
    }, 300);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [value]);

  // Reposition on scroll/resize when open
  useEffect(() => {
    if (!isOpen && !isLoading) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen, isLoading, updatePosition]);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Auto-scroll active row into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const row = listRef.current.children[activeIndex] as HTMLElement | undefined;
    row?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const selectItem = useCallback((symbol: string) => {
    suppressRef.current = true;
    lastSearchedRef.current = symbol.toUpperCase();
    onSelect(symbol.toUpperCase());
    setIsOpen(false);
    setResults([]);
  }, [onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) {
      if (e.key === "Enter") { e.preventDefault(); onSubmit(); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < results.length) {
        selectItem(results[activeIndex].symbol);
      } else {
        onSubmit();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const showDropdown = isOpen || (isLoading && value.trim().length >= 2);
  const listboxId = "ticker-search-listbox";

  const dropdown = showDropdown && dropdownPos ? createPortal(
    <div
      ref={listRef}
      id={listboxId}
      role="listbox"
      aria-label="Search results"
      style={{
        position: "absolute",
        top: dropdownPos.top,
        left: dropdownPos.left,
        width: dropdownPos.width,
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
          onMouseDown={e => { e.preventDefault(); selectItem(r.symbol); }}
          onMouseEnter={() => setActiveIndex(i)}
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
  ) : null;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", flex: 1, minWidth: 0 }}>
      <input
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-activedescendant={activeIndex >= 0 ? `ticker-option-${activeIndex}` : undefined}
        aria-label="Search by company name or ticker symbol"
        value={value}
        onChange={e => onChange(e.target.value.toUpperCase())}
        onKeyDown={handleKeyDown}
        onFocus={e => {
          hasFocusRef.current = true;
          updatePosition();
          onFocus?.(e);
        }}
        onBlur={e => {
          hasFocusRef.current = false;
          onBlur?.(e);
        }}
        placeholder={placeholder}
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        style={inputStyle}
      />
      <div className="sr-only" aria-live="polite">
        {showDropdown && !isLoading && results.length > 0 ? `${results.length} results available` : ""}
      </div>
      {dropdown}
    </div>
  );
}
