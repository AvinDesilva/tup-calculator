import type { IndustryGrowthData } from "../../lib/tickerSearch/api.ts";
import type { PriceMode } from "../../lib/types.ts";
import type { GuruRadarData } from "../../lib/guruRadar/types.ts";

export interface ValuationContextProps {
  strongBuyPrice: number | null;
  buyPrice: number | null;
  currentPrice: number;
  adjPrice?: number | null;
  industryGrowth?: IndustryGrowthData | null;
  industryGrowthLoading?: boolean;
  companyBlendedGrowth?: number | null;
  priceMode?: PriceMode;
  guruData?: GuruRadarData | null;
}

export interface PanelData {
  key: string;
  title: string;
  value: string;
  icon: string | null;
  color: string;
  sub: string;
}
