import type { PriceMode, FMPIncomeStatement, FMPCashFlow, FMPBalanceSheet, HistoricalPricePoint, EpsGrowthPoint } from "../../lib/types.ts";
import type { GuruRadarData } from "../../lib/guruRadar/types.ts";

export interface MetricHistoryBundle {
  incomeHistory: FMPIncomeStatement[];
  cashFlowHistory: FMPCashFlow[];
  balanceSheetHistory: FMPBalanceSheet[];
  priceHistory: HistoricalPricePoint[];
  epsGrowthHistory: EpsGrowthPoint[];
  shares: number;
}

export interface ValuationContextProps {
  strongBuyPrice: number | null;
  buyPrice: number | null;
  currentPrice: number;
  adjPrice?: number | null;
  priceMode?: PriceMode;
  guruData?: GuruRadarData | null;
  showPriceTargets?: boolean;
  metricHistory?: MetricHistoryBundle | null;
}

export interface PanelData {
  key: string;
  title: string;
  value: string;
  icon: string | null;
  color: string;
  sub: string;
}
