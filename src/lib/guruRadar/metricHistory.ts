import type {
  FMPIncomeStatement,
  FMPCashFlow,
  FMPBalanceSheet,
  HistoricalPricePoint,
  EpsGrowthPoint,
} from "../types.ts";

export interface MetricHistoryBundle {
  incomeHistory: FMPIncomeStatement[];
  cashFlowHistory: FMPCashFlow[];
  balanceSheetHistory: FMPBalanceSheet[];
  priceHistory: HistoricalPricePoint[];
  epsGrowthHistory: EpsGrowthPoint[];
  shares: number; // for FCF per share calculation
}

export interface MetricHistoryPoint {
  year: string;
  value: number | null;
  label: string;
}

export interface MetricContext {
  key: string;          // matches radar axis name exactly
  title: string;
  description: string;
  formula: string;
  history: MetricHistoryPoint[];
  hasHistory: boolean;  // false if only current value available
}

function pct(v: number | null): string {
  if (v == null) return "N/A";
  return `${(v * 100).toFixed(1)}%`;
}

function ratio(v: number | null): string {
  if (v == null) return "N/A";
  return v.toFixed(2);
}

function fmt(v: number | null, formatter: (x: number) => string): string {
  return v == null ? "N/A" : formatter(v);
}

/** Extract a 4-digit year string from a calendarYear or date field */
function yearOf(row: { calendarYear?: string | number; date?: string }): string {
  if (row.calendarYear != null) return String(row.calendarYear).slice(0, 4);
  if (row.date) return row.date.slice(0, 4);
  return "";
}

/** Find the closing price closest to Dec 31 of the given year from monthly price history */
function yearEndPrice(priceHistory: HistoricalPricePoint[], year: string): number | null {
  const target = `${year}-12-31`;
  // Walk backwards from Dec 31 to find the nearest available price
  let best: HistoricalPricePoint | null = null;
  for (const pt of priceHistory) {
    if (pt.date <= target) {
      if (!best || pt.date > best.date) best = pt;
    }
  }
  return best?.close ?? null;
}

/** Build history of up to 5 years from most recent, sorted oldest→newest for charts */
function buildHistory(
  points: { year: string; value: number | null; label: string }[]
): MetricHistoryPoint[] {
  // Filter out empty years, take most recent 5, sort oldest→newest
  return points
    .filter(p => p.year !== "")
    .slice(0, 5)
    .reverse();
}

export function computeMetricContexts(bundle: MetricHistoryBundle): MetricContext[] {
  const { incomeHistory, cashFlowHistory, balanceSheetHistory, priceHistory, epsGrowthHistory, shares } = bundle;

  // Align balance sheet years with income years for cross-source metrics
  function bsForYear(year: string): FMPBalanceSheet | undefined {
    return balanceSheetHistory.find(b => yearOf(b) === year);
  }
  function cfForYear(year: string): FMPCashFlow | undefined {
    return cashFlowHistory.find(c => yearOf(c) === year);
  }

  // Income-based margin metrics use the income statement years directly (up to 5)
  const incomeYears = incomeHistory.slice(0, 5);

  // ── 0: Op Margin ─────────────────────────────────────────────────────────────
  const opMarginHistory = buildHistory(
    incomeYears.map(inc => {
      const rev = inc.revenue ?? 0;
      const val = rev > 0 ? (inc.operatingIncome ?? 0) / rev : null;
      return { year: yearOf(inc), value: val, label: pct(val) };
    })
  );

  // ── 1: Gross Margin ───────────────────────────────────────────────────────────
  const grossMarginHistory = buildHistory(
    incomeYears.map(inc => {
      const rev = inc.revenue ?? 0;
      const val = rev > 0 ? (inc.grossProfit ?? 0) / rev : null;
      return { year: yearOf(inc), value: val, label: pct(val) };
    })
  );

  // ── 2: Net Margin ─────────────────────────────────────────────────────────────
  const netMarginHistory = buildHistory(
    incomeYears.map(inc => {
      const rev = inc.revenue ?? 0;
      const ni = inc.netIncome ?? 0;
      const val = rev > 0 ? ni / rev : null;
      return { year: yearOf(inc), value: val, label: pct(val) };
    })
  );

  // ── 3: ROE ────────────────────────────────────────────────────────────────────
  const roeHistory = buildHistory(
    incomeYears.map(inc => {
      const yr = yearOf(inc);
      const bs = bsForYear(yr);
      if (!bs) return { year: yr, value: null, label: "N/A" };
      const eq = bs.totalStockholdersEquity ?? 0;
      const ni = inc.netIncome ?? 0;
      const val = eq > 0 ? ni / eq : null;
      return { year: yr, value: val, label: pct(val) };
    })
  );

  // ── 4: ROA ────────────────────────────────────────────────────────────────────
  const roaHistory = buildHistory(
    incomeYears.map(inc => {
      const yr = yearOf(inc);
      const bs = bsForYear(yr);
      if (!bs) return { year: yr, value: null, label: "N/A" };
      const ta = bs.totalAssets ?? 0;
      const ni = inc.netIncome ?? 0;
      const val = ta > 0 ? ni / ta : null;
      return { year: yr, value: val, label: pct(val) };
    })
  );

  // ── 5: Low Beta ────────────────────────────────────────────────────────────────
  // No historical data; history will be empty and card shows current value only

  // ── 6: Low D/E ────────────────────────────────────────────────────────────────
  const bsYears = balanceSheetHistory.slice(0, 5);
  const deHistory = buildHistory(
    bsYears.map(bs => {
      const eq = bs.totalStockholdersEquity ?? 0;
      const debt = bs.totalDebt ?? 0;
      const val = eq > 0 ? debt / eq : null;
      return { year: yearOf(bs), value: val, label: fmt(val, v => v.toFixed(2)) };
    })
  );

  // ── 7: Current Ratio ──────────────────────────────────────────────────────────
  const currentRatioHistory = buildHistory(
    bsYears.map(bs => {
      const ca = bs.totalCurrentAssets ?? 0;
      const cl = bs.totalCurrentLiabilities ?? 0;
      const val = cl > 0 ? ca / cl : null;
      return { year: yearOf(bs), value: val, label: fmt(val, v => v.toFixed(2)) };
    })
  );

  // ── 8: FCF Margin ─────────────────────────────────────────────────────────────
  const fcfMarginHistory = buildHistory(
    incomeYears.map(inc => {
      const yr = yearOf(inc);
      const cf = cfForYear(yr);
      const rev = inc.revenue ?? 0;
      const fcf = cf?.freeCashFlow ?? null;
      const val = fcf != null && rev > 0 ? fcf / rev : null;
      return { year: yr, value: val, label: pct(val) };
    })
  );

  // ── 9: FCF Yield ──────────────────────────────────────────────────────────────
  const fcfYieldHistory = buildHistory(
    incomeYears.map(inc => {
      const yr = yearOf(inc);
      const cf = cfForYear(yr);
      const price = yearEndPrice(priceHistory, yr);
      const fcf = cf?.freeCashFlow ?? null;
      const fcfPerShare = fcf != null && shares > 0 ? fcf / shares : null;
      const val = fcfPerShare != null && price != null && price > 0 ? fcfPerShare / price : null;
      return { year: yr, value: val, label: pct(val) };
    })
  );

  // ── 10: EPS Growth ────────────────────────────────────────────────────────────
  const epsGrowthHistoryPoints = buildHistory(
    epsGrowthHistory.slice(0, 5).map(eg => ({
      year: eg.year,
      value: eg.growth,
      label: pct(eg.growth),
    }))
  );

  // ── 11: Rev Growth ────────────────────────────────────────────────────────────
  // Need pairs: incomeHistory[i] vs [i+1]
  const revGrowthPoints: MetricHistoryPoint[] = [];
  for (let i = 0; i < Math.min(incomeYears.length - 1, 5); i++) {
    const rev0 = incomeYears[i].revenue ?? 0;
    const rev1 = incomeYears[i + 1].revenue ?? 0;
    const val = rev1 > 0 ? (rev0 - rev1) / rev1 : null;
    revGrowthPoints.push({ year: yearOf(incomeYears[i]), value: val, label: pct(val) });
  }
  const revGrowthHistory = revGrowthPoints.reverse();

  // ── 12: Value (P/E) ───────────────────────────────────────────────────────────
  const peHistory = buildHistory(
    incomeYears.map(inc => {
      const yr = yearOf(inc);
      const price = yearEndPrice(priceHistory, yr);
      const eps = inc.eps ?? inc.epsDiluted ?? null;
      const val = eps != null && eps > 0 && price != null ? price / eps : null;
      return { year: yr, value: val, label: fmt(val, v => v.toFixed(1)) };
    })
  );

  // ── 13: Piotroski ─────────────────────────────────────────────────────────────
  // No historical data; history will be empty and card shows current value only

  return [
    {
      key: "Op Margin",
      title: "Operating Margin",
      description: "How much profit remains from each dollar of revenue after paying operating costs. Higher margins indicate a company with pricing power or cost efficiency.",
      formula: "Operating Income ÷ Revenue",
      history: opMarginHistory,
      hasHistory: opMarginHistory.length > 0,
    },
    {
      key: "Gross Margin",
      title: "Gross Margin",
      description: "Revenue minus cost of goods sold, as a percentage. A wide gross margin signals that the core product or service commands a strong price premium over production cost.",
      formula: "Gross Profit ÷ Revenue",
      history: grossMarginHistory,
      hasHistory: grossMarginHistory.length > 0,
    },
    {
      key: "Net Margin",
      title: "Net Profit Margin",
      description: "What percent of revenue becomes bottom-line profit after all expenses, taxes, and interest. The most complete picture of profitability.",
      formula: "Net Income ÷ Revenue",
      history: netMarginHistory,
      hasHistory: netMarginHistory.length > 0,
    },
    {
      key: "ROE",
      title: "Return on Equity",
      description: "How much profit the company generates for every dollar of shareholder equity. High ROE suggests management is efficiently deploying capital owned by shareholders.",
      formula: "Net Income ÷ Shareholders' Equity",
      history: roeHistory,
      hasHistory: roeHistory.some(p => p.value != null),
    },
    {
      key: "ROA",
      title: "Return on Assets",
      description: "Profit generated per dollar of total assets. A high ROA means the business extracts strong earnings from its asset base, regardless of how it's financed.",
      formula: "Net Income ÷ Total Assets",
      history: roaHistory,
      hasHistory: roaHistory.some(p => p.value != null),
    },
    {
      key: "Low Beta",
      title: "Beta (Volatility)",
      description: "How much the stock moves relative to the broader market. Beta < 1 means less volatile than the market; beta > 1 means more volatile. Lower beta scores higher.",
      formula: "Covariance(Stock, Market) ÷ Variance(Market)",
      history: [],
      hasHistory: false,
    },
    {
      key: "Low D/E",
      title: "Debt-to-Equity",
      description: "Total debt relative to equity. Lower is safer — it means the company relies less on borrowed money. High D/E amplifies both gains and losses.",
      formula: "Total Debt ÷ Shareholders' Equity",
      history: deHistory,
      hasHistory: deHistory.length > 0,
    },
    {
      key: "Current Ratio",
      title: "Current Ratio",
      description: "Can the company pay its short-term bills? A ratio above 1.5 means current assets comfortably cover liabilities due within a year. Below 1 is a warning sign.",
      formula: "Current Assets ÷ Current Liabilities",
      history: currentRatioHistory,
      hasHistory: currentRatioHistory.length > 0,
    },
    {
      key: "FCF Margin",
      title: "Free Cash Flow Margin",
      description: "What fraction of revenue converts to free cash flow — cash left after maintaining and growing the business. FCF is harder to manipulate than earnings.",
      formula: "Free Cash Flow ÷ Revenue",
      history: fcfMarginHistory,
      hasHistory: fcfMarginHistory.some(p => p.value != null),
    },
    {
      key: "FCF Yield",
      title: "Free Cash Flow Yield",
      description: "Annual free cash flow per share divided by the stock price. Like an earnings yield but based on actual cash generated. Higher yields suggest better value.",
      formula: "FCF per Share ÷ Stock Price",
      history: fcfYieldHistory,
      hasHistory: fcfYieldHistory.some(p => p.value != null),
    },
    {
      key: "EPS Growth",
      title: "EPS Growth",
      description: "Year-over-year growth in earnings per share. Sustained EPS growth is the primary driver of long-term stock price appreciation.",
      formula: "(EPS This Year − EPS Last Year) ÷ |EPS Last Year|",
      history: epsGrowthHistoryPoints,
      hasHistory: epsGrowthHistoryPoints.length > 0,
    },
    {
      key: "Rev Growth",
      title: "Revenue Growth",
      description: "Year-over-year change in total revenue. Consistent top-line growth signals expanding market share or pricing power, feeding future earnings potential.",
      formula: "(Revenue This Year − Revenue Last Year) ÷ Revenue Last Year",
      history: revGrowthHistory,
      hasHistory: revGrowthHistory.length > 0,
    },
    {
      key: "Value (P/E)",
      title: "Price-to-Earnings (P/E)",
      description: "How many years of current earnings you pay per share. Lower P/E typically means better value. Scored inversely — a P/E of 5 scores 100, P/E of 40+ scores 0.",
      formula: "Stock Price ÷ Trailing EPS",
      history: peHistory,
      hasHistory: peHistory.some(p => p.value != null),
    },
    {
      key: "Piotroski",
      title: "Piotroski F-Score",
      description: "A 9-point composite quality score covering profitability, leverage/liquidity, and operating efficiency trends. A score of 8–9 indicates a financially strong company.",
      formula: "9-point checklist: profitability (4 pts) + leverage/liquidity (3 pts) + efficiency (2 pts)",
      history: [],
      hasHistory: false,
    },
  ];
}

/** Convenience: format a raw RadarMetricPoint value for use in the card header */
export { ratio, pct };
