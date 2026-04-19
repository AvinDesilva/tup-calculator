import { C } from "../../lib/theme.ts";
import { SectionLabel } from "../primitives";
import type { IndustryGrowthData } from "../../lib/tickerSearch/api.ts";

export interface IndustryGrowthPanelProps {
  industryGrowth: IndustryGrowthData | null;
  industryGrowthLoading: boolean;
  companyBlendedGrowth: number | null;
}

export function IndustryGrowthPanel({ industryGrowth, industryGrowthLoading, companyBlendedGrowth }: IndustryGrowthPanelProps) {
  const mono = C.mono;
  let color = "#888", value = "...", sub = "";
  if (industryGrowthLoading) {
    sub = "Loading";
  } else if (industryGrowth && !industryGrowth.error && industryGrowth.median != null) {
    value = `${industryGrowth.median.toFixed(1)}%`;
    if (companyBlendedGrowth != null) {
      const diff = companyBlendedGrowth - industryGrowth.median;
      color = diff > 2 ? "#10d97e" : diff < -2 ? "#FF4D00" : "#f5a020";
      sub = industryGrowth.industry;
    } else {
      sub = `n=${industryGrowth.count}`;
    }
  }
  return (
    <div style={{ marginTop: 20 }}>
      <SectionLabel title="Industry Growth" />
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontFamily: mono, fontSize: "20px", fontWeight: 600, color, letterSpacing: "-0.02em" }}>
          {value}
        </span>
      </div>
      <div style={{ fontSize: "11px", color: "#888", marginTop: "4px", letterSpacing: "0.06em" }}>{sub}</div>
    </div>
  );
}
