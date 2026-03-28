import type { DecayMode, TUPResult } from "../../../lib/types.ts";

export interface YearByYearBreakdownProps {
  decayMode: DecayMode;
  onDecayModeToggle: (mode: "ff" | "vdr") => void;
  result: TUPResult | null;
  growthOverrides: Record<number, number>;
  onGrowthChange: (year: number, val: number) => void;
}
