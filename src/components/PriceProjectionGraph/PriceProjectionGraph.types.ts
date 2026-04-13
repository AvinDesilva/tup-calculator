import type { GrowthScenario, HistoricalPricePoint, TUPResult } from "../../lib/types.ts";

export interface PriceProjectionGraphProps {
  priceHistory: HistoricalPricePoint[];
  currentPrice: number;
  ticker: string;
  scenarioValues: Record<GrowthScenario, { y1: number; y2: number | null; cagr: number | null }>;
  growthScenario: GrowthScenario;
  result: TUPResult | null;
}
