import type React from "react";
import { C } from "../lib/theme.ts";

export const SubHead = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: "12px" }}>{children}</div>
);

export const FormulaBlock = ({ label, children }: { label?: string; children: React.ReactNode }) => (
  <div style={{ padding: "16px 20px", borderLeft: "2px solid rgba(196,160,110,0.4)", marginBottom: "20px" }}>
    {label && <SubHead>{label}</SubHead>}
    <div style={{ fontFamily: C.mono, fontSize: "14px", color: C.text1, lineHeight: 2.2 }}>{children}</div>
  </div>
);

export const CalloutBlock = ({ label, children }: { label?: string; children: React.ReactNode }) => (
  <div style={{ padding: "16px 20px", background: "rgba(255,255,255,0.02)", borderLeft: "2px solid rgba(255,255,255,0.06)", marginBottom: "20px" }}>
    {label && <SubHead>{label}</SubHead>}
    <p style={{ fontSize: "15px", color: C.text2, lineHeight: 1.85, margin: 0 }}>{children}</p>
  </div>
);

export const SectionNum = ({ n, title, sub }: { n: string; title: string; sub?: string }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: "20px", marginBottom: "28px" }}>
    <span style={{ fontFamily: C.serif, fontWeight: 400, fontSize: "clamp(3rem, 8vw, 5rem)", lineHeight: 1, color: C.accent, letterSpacing: "-0.03em", flexShrink: 0 }}>{n}</span>
    <div>
      <h2 style={{ fontFamily: C.display, fontWeight: 700, fontSize: "clamp(1.3rem, 3vw, 2rem)", color: C.text1, margin: 0, letterSpacing: "0.02em", textTransform: "uppercase" }}>{title}</h2>
      {sub && <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginTop: "4px" }}>{sub}</div>}
    </div>
  </div>
);
