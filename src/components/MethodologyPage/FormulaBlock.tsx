import type React from "react";
import { C } from "../../lib/theme.ts";
import { SubHead } from "./SubHead.tsx";

export const FormulaBlock = ({ label, children }: { label?: string; children: React.ReactNode }) => (
  <div style={{ padding: "16px 20px", borderLeft: "2px solid rgba(196,160,110,0.4)", marginBottom: "20px" }}>
    {label && <SubHead>{label}</SubHead>}
    <div style={{ fontFamily: C.mono, fontSize: "14px", color: C.text1, lineHeight: 2.2 }}>{children}</div>
  </div>
);
