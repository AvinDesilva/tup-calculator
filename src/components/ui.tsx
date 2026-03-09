import { useRef, useCallback } from "react";
import type React from "react";

// ─── Hold-to-repeat hook ─────────────────────────────────────────────────────

export function useHoldRepeat(callback: () => void, delay = 400, interval = 80) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iv    = useRef<ReturnType<typeof setInterval> | null>(null);
  const cbRef = useRef(callback);
  cbRef.current = callback;

  const stop = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (iv.current)    { clearInterval(iv.current);   iv.current = null; }
  }, []);

  const start = useCallback(() => {
    cbRef.current();
    timer.current = setTimeout(() => {
      iv.current = setInterval(() => cbRef.current(), interval);
    }, delay);
  }, [delay, interval]);

  return { onPointerDown: start, onPointerUp: stop, onPointerLeave: stop };
}

// ─── Hold Button — single arrow with hold-to-repeat ─────────────────────────

export function HoldButton({ onStep, children, style }: {
  onStep: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const hold = useHoldRepeat(onStep);
  return (
    <button
      {...hold}
      onClick={e => e.preventDefault()}
      style={{
        userSelect: "none",
        WebkitTouchCallout: "none",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─── Stepper Row — ▼ value ▲ for editable numeric fields ────────────────────

export function StepperRow({ label, value, onStep, badge, stepSize = 1, suffix = "%" }: {
  label: string;
  value: number;
  onStep: (delta: number) => void;
  badge?: React.ReactNode;
  stepSize?: number;
  suffix?: string;
}) {
  const btnStyle: React.CSSProperties = {
    width: "22px", height: "22px",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
    color: "#e8e4dc", cursor: "pointer", fontSize: "10px",
    fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, lineHeight: 1,
    userSelect: "none",
    WebkitTouchCallout: "none",
    WebkitTapHighlightColor: "transparent",
  };
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#888888" }}>{label}</span>
        {badge}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <HoldButton onStep={() => onStep(-stepSize)} style={btnStyle}>▼</HoldButton>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 600, color: "#00BFA5", minWidth: "52px", textAlign: "center" }}>
          {value.toFixed(1)}{suffix}
        </span>
        <HoldButton onStep={() => onStep(stepSize)} style={btnStyle}>▲</HoldButton>
      </div>
    </div>
  );
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

interface SectionLabelProps {
  num: string;
  title: string;
}

export function SectionLabel({ num, title }: SectionLabelProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#C4A06E", fontSize: "14px", letterSpacing: "0.05em", fontWeight: 700 }}>{num}</span>
      <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888888" }}>{title}</span>
      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

interface FieldProps {
  label: string;
  value: number | string;
  onChange: (v: number) => void;
  suffix?: string;
  prefix?: string;
  tip?: string;
}

export function Field({ label, value, onChange, suffix, prefix, tip }: FieldProps) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888888", marginBottom: "6px" }}>
        {label}{tip && <span style={{ marginLeft: "4px", cursor: "help" }} title={tip}>ⓘ</span>}
      </label>
      <div style={{ position: "relative" }}>
        {prefix && (
          <span style={{ position: "absolute", left: "0", top: "50%", transform: "translateY(-50%)", color: "#888888", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>{prefix}</span>
        )}
        <input
          type="number" step="any" value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            paddingBottom: "6px",
            paddingLeft: prefix ? "14px" : "0",
            paddingRight: suffix ? "24px" : "0",
            fontSize: "13px",
            color: "#e8e4dc",
            fontFamily: "'JetBrains Mono', monospace",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.15s",
          }}
          onFocus={e => (e.target.style.borderBottomColor = "#FF4D00")}
          onBlur={e => (e.target.style.borderBottomColor = "rgba(255,255,255,0.07)")}
        />
        {suffix && (
          <span style={{ position: "absolute", right: "0", top: "50%", transform: "translateY(-50%)", color: "#888888", fontSize: "10px", fontFamily: "'JetBrains Mono', monospace" }}>{suffix}</span>
        )}
      </div>
    </div>
  );
}

interface DataRowProps {
  label: string;
  value: React.ReactNode;
  accent?: string;
}

export function DataRow({ label, value, accent }: DataRowProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#888888" }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 600, color: accent || "#e8e4dc" }}>{value}</span>
    </div>
  );
}

interface DerivedStatProps {
  label: string;
  value: React.ReactNode;
  accent?: string;
}

export function DerivedStat({ label, value, accent }: DerivedStatProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: "2px solid rgba(255,255,255,0.08)", paddingTop: "8px", marginTop: "8px" }}>
      <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#888888" }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 600, color: accent || "#00BFA5" }}>{value}</span>
    </div>
  );
}
