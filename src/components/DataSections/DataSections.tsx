import { EnterpriseValue } from "./EnterpriseValue";
import { GrowthAssumptions } from "./GrowthAssumptions";
import { TechnicalValidation } from "./TechnicalValidation";
import { YearByYearBreakdown } from "./YearByYearBreakdown";
import type { DataSectionsProps } from "./DataSections.types.ts";

export function DataSections({
  inp, company, currencyMismatchWarning, growthPeriod, growthYears,
  epsGrowthHistory, onGrowthPeriodChange,
  decayMode, onDecayModeToggle, result, growthOverrides, onGrowthChange,
}: DataSectionsProps) {
  return (
    <div className="rsp-data-wrap" style={{ display: "flex", flexDirection: "row" }}>
      <div className="rsp-left-data" style={{ paddingRight: "40px", paddingTop: "12px", paddingBottom: "40px", animation: "fadeInUp 0.5s 0.15s ease both" }}>
        <EnterpriseValue inp={inp} company={company} currencyMismatchWarning={currencyMismatchWarning} />
        <GrowthAssumptions inp={inp} growthPeriod={growthPeriod} growthYears={growthYears} epsGrowthHistory={epsGrowthHistory} onGrowthPeriodChange={onGrowthPeriodChange} />
        <TechnicalValidation inp={inp} company={company} />
      </div>
      <div className="rsp-right-bottom" style={{ paddingLeft: "40px", paddingTop: "12px", paddingBottom: "40px" }}>
        <YearByYearBreakdown decayMode={decayMode} onDecayModeToggle={onDecayModeToggle} result={result} growthOverrides={growthOverrides} onGrowthChange={onGrowthChange} />
      </div>
    </div>
  );
}
