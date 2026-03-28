import type { FMPEarningSurprise, FMPIncomeStatement, FMPCashFlow } from "../../lib/types.ts";

export interface CompanyScorecardProps {
  earnings: FMPEarningSurprise[];
  cashFlows?: FMPCashFlow[];
  incomeHistory: FMPIncomeStatement[];
  description?: string;
  exchange?: string;
  lifecycleOnly?: boolean;
  dividendYield?: number;
}

export interface ProcessedQuarter {
  status: "beat" | "miss" | "inline";
  pct: number;
  date: string | undefined;
}
