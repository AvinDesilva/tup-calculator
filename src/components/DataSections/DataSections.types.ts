import type { InputState, EpsGrowthPoint } from "../../lib/types.ts";

export interface DataSectionsProps {
  inp: InputState;
  company: string;
  currencyMismatchWarning: string;
  growthPeriod: "5yr" | "10yr";
  growthYears: { short: number; long: number };
  epsGrowthHistory: EpsGrowthPoint[];
  onGrowthPeriodChange: (period: "5yr" | "10yr") => void;
}
