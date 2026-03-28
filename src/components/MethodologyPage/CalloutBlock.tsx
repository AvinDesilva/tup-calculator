import type React from "react";
import { C } from "../../lib/theme.ts";
import { SubHead } from "./SubHead.tsx";

export const CalloutBlock = ({ label, children }: { label?: string; children: React.ReactNode }) => (
  <div style={{ padding: "16px 20px", background: "rgba(255,255,255,0.02)", borderLeft: "2px solid rgba(255,255,255,0.06)", marginBottom: "20px" }}>
    {label && <SubHead>{label}</SubHead>}
    <p style={{ fontSize: "15px", color: C.text2, lineHeight: 1.85, margin: 0 }}>{children}</p>
  </div>
);
