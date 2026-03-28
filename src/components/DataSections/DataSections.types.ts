import type { InputState, EpsGrowthPoint, DecayMode, TUPResult } from "../../lib/types.ts";

export interface DataSectionsProps {
  inp: InputState;
  company: string;
  currencyMismatchWarning: string;
  growthPeriod: "5yr" | "10yr";
  growthYears: { short: number; long: number };
  epsGrowthHistory: EpsGrowthPoint[];
  onGrowthPeriodChange: (period: "5yr" | "10yr") => void;
  decayMode: DecayMode;
  onDecayModeToggle: (mode: "ff" | "vdr") => void;
  result: TUPResult | null;
  growthOverrides: Record<number, number>;
  onGrowthChange: (year: number, val: number) => void;
}
