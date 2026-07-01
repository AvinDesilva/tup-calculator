interface SlotCounterProps {
  value: number | null;
  paybackNote: string | null;
  color: string;
  animationKey: number;
}

import { memo } from "react";
import { SlotDigit } from "./SlotDigit.tsx";

function SlotCounterImpl({ value, paybackNote, color, animationKey }: SlotCounterProps) {
  // N/A case
  if (paybackNote) {
    return (
      <span style={{ color, transition: "color 0.4s ease", animation: "slotFadeIn 0.4s ease" }} key={`na-${animationKey}`}>
        N/A
      </span>
    );
  }

  // 30+ case (null value, no paybackNote) — spin digits like normal numbers, fade "+" in after
  if (value == null) {
    return (
      <>
        <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center" }}>
          <SlotDigit digit={3} color={color} delay={0} spinKey={animationKey} />
          <SlotDigit digit={0} color={color} delay={120} spinKey={animationKey} />
          <span
            style={{
              color,
              transition: "color 0.4s ease",
              animation: "slotFadeIn 0.35s ease both",
              animationDelay: "480ms",
            }}
          >
            +
          </span>
        </span>
        <span className="sr-only">30+</span>
      </>
    );
  }

  // Numeric digits
  const tens = Math.floor(value / 10);
  const ones = value % 10;

  return (
    <>
      <span aria-hidden="true" style={{ display: "inline-flex" }}>
        {value >= 10 && (
          <SlotDigit digit={tens} color={color} delay={0} spinKey={animationKey} />
        )}
        <SlotDigit digit={ones} color={color} delay={value >= 10 ? 120 : 0} spinKey={animationKey} />
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}

export const SlotCounter = memo(SlotCounterImpl);
