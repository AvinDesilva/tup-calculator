import type { TUPResult, GrowthScenario, PriceMode } from "../../lib/types.ts";

export interface VerdictCardProps {
  result: TUPResult | null;
  noiseFilter: boolean;
  onGrowthStep: (delta: number) => void;
  onGrowthSet: (val: number) => void;
  currentPrice: number;
  growthScenario: GrowthScenario;
  onScenarioChange: (s: GrowthScenario) => void;
  hasScenarioData: boolean;
  priceMode: PriceMode;
  onPriceModeToggle: () => void;
}
