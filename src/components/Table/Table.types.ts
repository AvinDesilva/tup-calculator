import type { TUPResult } from "../../lib/types.ts";

export interface TableProps {
  result: TUPResult | null;
  growthOverrides: Record<number, number>;
  onGrowthChange: (year: number, val: number) => void;
}
