import { useState, useEffect, useRef, useCallback } from "react";
import type React from "react";
import { searchTickers } from "../../lib/api.ts";
import type { SearchResult } from "../../lib/api.ts";
import { SearchDropdown } from "./SearchDropdown.tsx";
import type { TickerSearchProps } from "./TickerSearch.types.ts";

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
    const sym = symbol.toUpperCase();
    suppressRef.current = true;
    lastSearchedRef.current = sym;
    onSelect(sym);
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
      const selected = activeIndex >= 0 && activeIndex < results.length
        ? results[activeIndex].symbol : undefined;
      if (selected) selectItem(selected);
      else onSubmit();
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const showDropdown = isOpen || (isLoading && value.trim().length >= 2);
  const listboxId = "ticker-search-listbox";

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
      <SearchDropdown
        results={results}
        isLoading={isLoading}
        activeIndex={activeIndex}
        onSelect={selectItem}
        onHover={setActiveIndex}
        position={dropdownPos}
        show={showDropdown}
        listRef={listRef}
        listboxId={listboxId}
      />
    </div>
  );
}
