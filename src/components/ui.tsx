import { useRef, useCallback, useState, useEffect } from "react";
import type React from "react";

// ─── Hold-to-repeat hook ─────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export function useHoldRepeat(callback: () => void, delay = 400, interval = 80) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iv    = useRef<ReturnType<typeof setInterval> | null>(null);
  const cbRef = useRef(callback);
  useEffect(() => { cbRef.current = callback; });

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

export function HoldButton({ onStep, children, style, ...rest }: {
  onStep: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const hold = useHoldRepeat(onStep);
  return (
    <button
      {...hold}
      {...rest}
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
        <HoldButton onStep={() => onStep(-stepSize)} style={btnStyle} aria-label={`Decrease ${label}`}>▼</HoldButton>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "15px", fontWeight: 600, color: "#00BFA5", minWidth: "52px", textAlign: "center" }}>
          {value.toFixed(1)}{suffix}
        </span>
        <HoldButton onStep={() => onStep(stepSize)} style={btnStyle} aria-label={`Increase ${label}`}>▲</HoldButton>
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
      <h3 style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888888", margin: 0 }}>{title}</h3>
      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} aria-hidden="true" />
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
  const inputId = `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div>
      <label htmlFor={inputId} style={{ display: "block", fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888888", marginBottom: "6px" }}>
        {label}{tip && <span style={{ marginLeft: "4px", cursor: "help" }} title={tip}>ⓘ</span>}
      </label>
      <div style={{ position: "relative" }}>
        {prefix && (
          <span style={{ position: "absolute", left: "0", top: "50%", transform: "translateY(-50%)", color: "#888888", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace" }}>{prefix}</span>
        )}
        <input
          id={inputId}
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

// ─── Error display with rate-limit countdown ─────────────────────────────────

export function ErrorDisplay({ error, style }: { error: string; style?: React.CSSProperties }) {
  const isRateLimit = /rate limit/i.test(error);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isRateLimit) { setCountdown(5); return; }
    setCountdown(5);
    const iv = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(iv); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [error, isRateLimit]);

  if (!error) return null;

  if (!isRateLimit) {
    return <span role="alert" style={{ color: "#ff4136", ...style }}>{error}</span>;
  }

  const done = countdown === 0;

  return (
    <span role="alert" style={{ ...style, transition: "color 0.3s" }}>
      {done ? (
        <>
          <span style={{ color: "#10d97e" }}>API limit reset</span>
          <br />
          <span style={{ color: "#10d97e" }}>roll again!</span>
        </>
      ) : (
        <>
          <span style={{ color: "#ff4136" }}>API rate limit reached</span>
          <br />
          <span style={{ color: "#ff4136" }}>Try again in {countdown}s</span>
        </>
      )}
    </span>
  );
}
