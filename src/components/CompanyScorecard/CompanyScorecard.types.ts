import type { FMPIncomeStatement, FMPCashFlow } from "../../lib/types.ts";

export interface CompanyScorecardProps {
  cashFlows?: FMPCashFlow[];
  incomeHistory: FMPIncomeStatement[];
  description?: string;
  exchange?: string;
  lifecycleOnly?: boolean;
  dividendYield?: number;
}
