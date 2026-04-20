import { useState, useEffect, useRef } from "react";
import { LC_CURVE } from "../../lib/constants.ts";

// ─── Animation tuning ───────────────────────────────────────────────────────
// ANIM_DURATION controls BOTH line draw speed and label highlight timing.
export const ANIM_DURATION = 1600;
export const ANIM_DELAY = 400;

// ─── Label state machine ────────────────────────────────────────────────────
export type LabelState = "idle" | "lit" | "settled";

/** A label is "lit" while the line is in its zone (center → nextCenter). */
export function getLabelState(
  center: number,
  nextCenter: number | null,
  xPos: number,
  done: boolean,
): LabelState {
  if (done) return "settled";
  if (xPos < center) return "idle";
  if (nextCenter === null || xPos < nextCenter) return "lit";
  return "settled";
}

// ─── Arc-length lookup table ────────────────────────────────────────────────
// Precomputed cumulative arc-length fractions for the S-curve, used to convert
// "fraction of path drawn" → "x-position reached on the chart".
const ARC_LENGTHS: number[] = (() => {
  const pts = LC_CURVE.map(([x, y]) => ({ x: x * 100, y: (1 - y) * 100 }));
  const segs: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    segs.push(Math.sqrt(dx * dx + dy * dy));
  }
  const total = segs.reduce((a, b) => a + b, 0);
  const cumulative: number[] = [];
  let sum = 0;
  for (const s of segs) {
    sum += s;
    cumulative.push(sum / total);
  }
  return cumulative;
})();

const CURVE_XS = LC_CURVE.map(([x]) => x);

function arcFractionToX(fraction: number): number {
  for (let i = 1; i < ARC_LENGTHS.length; i++) {
    if (fraction <= ARC_LENGTHS[i]) {
      const prev = ARC_LENGTHS[i - 1];
      const segFrac = (fraction - prev) / (ARC_LENGTHS[i] - prev);
      return CURVE_XS[i - 1] + segFrac * (CURVE_XS[i] - CURVE_XS[i - 1]);
    }
  }
  return 1;
}

// ─── Hook ───────────────────────────────────────────────────────────────────
export interface LifecycleAnimState {
  /** Current x-position (0–1) the line has reached, accounting for curve shape. */
  xPos: number;
  /** Eased fraction of total path length visible (0–1). */
  easedFraction: number;
  /** True once the animation has fully completed. */
  done: boolean;
  /** stroke-dasharray / dashoffset base value (actual path length, or 9999 fallback). */
  dashLen: number;
  /** Callback: set actual SVG path length once measured. */
  setPathLen: (len: number) => void;
}

/**
 * Drives the lifecycle S-curve line-draw animation.
 * Returns derived values that control both the stroke reveal and label highlights.
 */
export function useLifecycleAnimation(active: boolean): LifecycleAnimState {
  const [t, setT] = useState(0);
  const [pathLen, setPathLen] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const start = performance.now() + ANIM_DELAY;
    const tick = (now: number) => {
      const elapsed = now - start;
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      const raw = Math.min(elapsed / ANIM_DURATION, 1);
      setT(raw);
      if (raw < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      setT(0);
    };
  }, [active]);

  const easedFraction = 2 * t - t * t;
  const xPos = arcFractionToX(easedFraction);
  const done = t >= 1;
  const dashLen = pathLen || 9999;

  return { xPos, easedFraction, done, dashLen, setPathLen };
}
