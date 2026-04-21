// Raw FMP API response shape for /insider-trading endpoint
export interface FMPInsiderTrade {
  symbol: string;
  filingDate: string;
  transactionDate: string;
  reportingName: string;
  reportingCik: string;
  typeOfOwner: string;             // "officer", "director", "ten percent owner"
  acquistionOrDisposition: string; // "A" (acquisition/buy) or "D" (disposition/sell)
  transactionType: string;         // "P-Purchase", "S-Sale", "A-Award", "F-Tax", "M-Exercise", "G-Gift"
  securitiesOwned: number;
  securitiesTransacted: number;
  price: number;
  link: string;
  formType: string;                // "4", "3", "5"
}

export interface SuspiciousFlags {
  discretionary: boolean;       // S-Sale (voluntary, not tax/exercise/award)
  clusterSell: boolean;         // part of a 30-day window with 3+ unique insider sellers
  clusterIncludesCFO: boolean;  // cluster window includes a CFO-role seller
  likelyNon10b51: boolean;      // best-effort: true for all discretionary sells (FMP doesn't expose 10b5-1 status)
}

export interface InsiderTrade extends FMPInsiderTrade {
  totalValue: number;
  isBuy: boolean;
  flags: SuspiciousFlags;
}

export interface InsiderTradingSummary {
  totalBuys: number;
  totalSells: number;
  discretionarySells: number;
  clusterAlert: boolean;
  netDirection: "buying" | "selling" | "neutral";
}

export interface InsiderTradingData {
  trades: InsiderTrade[];
  summary: InsiderTradingSummary;
}
