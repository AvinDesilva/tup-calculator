import { C } from "../../lib/theme.ts";

export const SectionNum = ({ n, title, sub }: { n: string; title: string; sub?: string }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: "20px", marginBottom: "28px" }}>
    <span style={{ fontFamily: C.serif, fontWeight: 400, fontSize: "clamp(3rem, 8vw, 5rem)", lineHeight: 1, color: C.accent, letterSpacing: "-0.03em", flexShrink: 0 }}>{n}</span>
    <div>
      <h2 style={{ fontFamily: C.display, fontWeight: 700, fontSize: "clamp(1.3rem, 3vw, 2rem)", color: C.text1, margin: 0, letterSpacing: "0.02em", textTransform: "uppercase" }}>{title}</h2>
      {sub && <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginTop: "4px" }}>{sub}</div>}
    </div>
  </div>
);
