import { useLayoutEffect, useRef } from "react";

/**
 * Shrinks the inner element's font-size so its content fits within the container.
 *
 * - Measures the rendered (CSS) font-size and natural scroll width.
 * - If overflow, sets `font-size` inline as `!important` proportional to the ratio,
 *   so it wins over any `!important` responsive class rules.
 * - Re-measures on container resize.
 *
 * Pass deps for content that should trigger re-measurement (e.g. text strings).
 */
export function useFitText(deps: React.DependencyList, minFontSize: number = 7) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const inner = innerRef.current;
      if (!container || !inner) return;
      const containerWidth = container.clientWidth;
      if (containerWidth === 0) return;

      // Reset any previous fit adjustment so we measure at the CSS-defined size.
      inner.style.removeProperty("font-size");
      const cs = window.getComputedStyle(inner);
      const naturalFontSize = parseFloat(cs.fontSize);
      if (!Number.isFinite(naturalFontSize) || naturalFontSize <= 0) return;
      const naturalWidth = inner.scrollWidth;

      if (naturalWidth > containerWidth) {
        const target = Math.max(
          minFontSize,
          (naturalFontSize * containerWidth) / naturalWidth,
        );
        inner.style.setProperty("font-size", `${target}px`, "important");
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, minFontSize]);

  return { containerRef, innerRef };
}
