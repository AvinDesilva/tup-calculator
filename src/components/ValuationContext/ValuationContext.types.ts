import type { IndustryGrowthData } from "../../lib/api.ts";
import type { PriceMode } from "../../lib/types.ts";

export interface ValuationContextProps {
  strongBuyPrice: number | null;
  buyPrice: number | null;
  dcf: number | null;
  currentPrice: number;
  adjPrice?: number | null;
  industryGrowth?: IndustryGrowthData | null;
  industryGrowthLoading?: boolean;
  companyBlendedGrowth?: number | null;
  priceMode?: PriceMode;
}

export interface PanelData {
  key: string;
  title: string;
  value: string;
  icon: string | null;
  color: string;
  sub: string;
}
