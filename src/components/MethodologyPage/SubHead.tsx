import type React from "react";
import { C } from "../../lib/theme.ts";

export const SubHead = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: C.text3, marginBottom: "12px" }}>{children}</div>
);
