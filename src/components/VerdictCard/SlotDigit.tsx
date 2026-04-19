import { useState, useEffect } from "react";
import { C } from "../../lib/theme.ts";
import { useSpring } from "./useSpring.ts";

interface SlotDigitProps {
  digit: number;
  color: string;
  delay: number;
  spinKey: number;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function SlotDigit({ digit, color, delay, spinKey }: SlotDigitProps) {
  const [target, setTarget] = useState(10 + digit);
  const [prevSpinKey, setPrevSpinKey] = useState(spinKey);
  const [prevDigit, setPrevDigit] = useState(digit);

  // Adjust state during render based on prop changes
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  if (spinKey !== prevSpinKey) {
    setPrevSpinKey(spinKey);
    setPrevDigit(digit);
    setTarget(0);
  } else if (digit !== prevDigit) {
    setPrevDigit(digit);
    setTarget(10 + digit);
  }

  // After reset to 0, animate to final target after delay
  useEffect(() => {
    if (target !== 0) return;
    const timer = setTimeout(() => setTarget(10 + digit), Math.max(delay, 1));
    return () => clearTimeout(timer);
  }, [target, digit, delay]);

  const springVal = useSpring(target);
  const translateY = -(springVal * (100 / DIGITS.length));

  return (
    <span style={{ display: "inline-block", overflow: "hidden", height: "1em", lineHeight: 1, position: "relative" }}>
      <span
        className="slot-strip"
        aria-hidden="true"
        style={{
          display: "flex",
          flexDirection: "column",
          willChange: "transform",
          transform: `translateY(${translateY}%)`,
        }}
      >
        {DIGITS.map((d, i) => (
          <span
            key={i}
            style={{
              display: "block",
              height: "1em",
              lineHeight: 1,
              color,
              transition: "color 0.4s ease",
            }}
          >
            {d}
          </span>
        ))}
      </span>
      {/* Gradient vignettes */}
      <span style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "35%",
        background: `linear-gradient(to bottom, ${C.bg} 0%, transparent 100%)`,
        pointerEvents: "none",
      }} />
      <span style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "35%",
        background: `linear-gradient(to top, ${C.bg} 0%, transparent 100%)`,
        pointerEvents: "none",
      }} />
    </span>
  );
}
