interface SlotCounterProps {
  value: number | null;
  paybackNote: string | null;
  color: string;
  animationKey: number;
}

import { SlotDigit } from "./SlotDigit.tsx";

export function SlotCounter({ value, paybackNote, color, animationKey }: SlotCounterProps) {
  // N/A case
  if (paybackNote) {
    return (
      <span style={{ color, transition: "color 0.4s ease", animation: "slotFadeIn 0.4s ease" }} key={`na-${animationKey}`}>
        N/A
      </span>
    );
  }

  // 30+ case (null value, no paybackNote)
  if (value == null) {
    return (
      <span style={{ color, transition: "color 0.4s ease", animation: "slotFadeIn 0.4s ease" }} key={`30p-${animationKey}`}>
        30+
      </span>
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
