import { useRef, useCallback, useEffect } from "react";
import { C } from "../../../lib/theme.ts";
import { MetricContextCard } from "./MetricContextCard.tsx";
import type { MetricContext } from "../../../lib/guruRadar/metricHistory.ts";
import type { RadarMetricPoint } from "../../../lib/guruRadar/types.ts";

interface Props {
  contexts: MetricContext[];
  radar: RadarMetricPoint[];
  activeIndex: number;
  onIndexChange: (index: number) => void;
}

// Card takes up most of container width; side peek shows ~20px of adjacent cards
const PEEK_PX = 20;
const GAP_PX = 10;

export function ExpandedContextCarousel({ contexts, radar, activeIndex, onIndexChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollingProgrammaticRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to the active card when it changes programmatically (radar rotation)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.offsetWidth - PEEK_PX * 2;
    const targetLeft = activeIndex * (cardWidth + GAP_PX);
    if (Math.abs(el.scrollLeft - targetLeft) < 4) return; // already there
    scrollingProgrammaticRef.current = true;
    el.scrollTo({ left: targetLeft, behavior: "smooth" });
    // Reset flag after scroll settles
    const id = setTimeout(() => { scrollingProgrammaticRef.current = false; }, 700);
    return () => clearTimeout(id);
  }, [activeIndex]);

  const handleScroll = useCallback(() => {
    if (scrollingProgrammaticRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const cardWidth = el.offsetWidth - PEEK_PX * 2;
      if (cardWidth <= 0) return;
      const idx = Math.round(el.scrollLeft / (cardWidth + GAP_PX));
      const clamped = Math.max(0, Math.min(contexts.length - 1, idx));
      onIndexChange(clamped);
    }, 80);
  }, [contexts.length, onIndexChange]);

  const scrollToIndex = useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.offsetWidth - PEEK_PX * 2;
    scrollingProgrammaticRef.current = true;
    el.scrollTo({ left: idx * (cardWidth + GAP_PX), behavior: "smooth" });
    onIndexChange(idx);
    const id = setTimeout(() => { scrollingProgrammaticRef.current = false; }, 700);
    return () => clearTimeout(id);
  }, [onIndexChange]);

  return (
    <div>
      {/* Carousel scroll container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: "flex",
          gap: GAP_PX,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          paddingLeft: PEEK_PX,
          paddingRight: PEEK_PX,
          // Hide scrollbar
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        } as React.CSSProperties}
        className="rsp-metric-carousel"
      >
        {contexts.map((ctx, i) => {
          const radarPoint = radar.find(p => p.axis === ctx.key);
          return (
            <div
              key={ctx.key}
              style={{
                flex: `0 0 calc(100% - ${PEEK_PX * 2}px)`,
                scrollSnapAlign: "center",
                minWidth: 0,
              }}
            >
              <MetricContextCard
                context={ctx}
                radarPoint={radarPoint}
                isActive={i === activeIndex}
              />
            </div>
          );
        })}
      </div>

      {/* Dot pagination */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 5,
        marginTop: 10,
      }}>
        {contexts.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToIndex(i)}
            aria-label={`Go to metric ${i + 1}: ${contexts[i]?.title}`}
            aria-current={i === activeIndex ? "true" : undefined}
            style={{
              width: i === activeIndex ? 16 : 6,
              height: 6,
              borderRadius: 3,
              background: i === activeIndex ? C.accent : "rgba(255,255,255,0.12)",
              border: "none",
              padding: 0,
              cursor: "pointer",
              transition: "width 0.25s ease, background 0.25s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
