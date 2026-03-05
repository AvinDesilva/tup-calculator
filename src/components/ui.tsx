import type React from "react";

// ─── Shared UI primitives ─────────────────────────────────────────────────────

interface SectionLabelProps {
  num: string;
  title: string;
}

export function SectionLabel({ num, title }: SectionLabelProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "#C4A06E", fontSize: "11px", letterSpacing: "0.05em", fontWeight: 700 }}>{num}</span>
      <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "#888888" }}>{title}</span>
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
      <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#888888" }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", fontWeight: 600, color: accent || "#e8e4dc" }}>{value}</span>
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
      <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#888888" }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", fontWeight: 600, color: accent || "#00BFA5" }}>{value}</span>
    </div>
  );
}
