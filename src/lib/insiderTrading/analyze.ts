import type { FMPInsiderTrade, InsiderTrade, InsiderTradingData, SuspiciousFlags } from "./types.ts";

// Transaction types that are automatic/obligatory (not discretionary sells)
const NON_DISCRETIONARY_TYPES = new Set(["F-Tax", "M-Exercise", "A-Award", "G-Gift", "J-Other"]);

function isCFO(name: string, typeOfOwner: string): boolean {
  const n = name.toUpperCase();
  const t = typeOfOwner.toUpperCase();
  return n.includes("CFO") || n.includes("CHIEF FINANCIAL") || t.includes("CFO") || t.includes("CHIEF FINANCIAL");
}

export function analyzeInsiderTrades(raw: FMPInsiderTrade[]): InsiderTradingData {
  // Only form 4 is relevant for regular insider trading reports
  const form4 = raw.filter(t => t.formType === "4" || t.formType === "");

  // Use all trades if no form 4 (some FMP responses omit formType)
  const trades = (form4.length > 0 ? form4 : raw)
    .filter(t => t.transactionDate && t.securitiesTransacted > 0);

  // Sort descending by transaction date
  const sorted = [...trades].sort(
    (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
  );

  // ── Cluster detection: find 30-day windows with 3+ unique sellers ─────────
  const sellTrades = sorted.filter(t =>
    t.acquistionOrDisposition === "D" && !NON_DISCRETIONARY_TYPES.has(t.transactionType)
  );

  // For each sell, count how many unique insiders sold within 30 days of it
  const clusterDates = new Set<string>(); // transaction dates that are in a cluster
  const clusterHasCFO = new Set<string>(); // transaction dates whose cluster includes a CFO

  for (let i = 0; i < sellTrades.length; i++) {
    const anchor = new Date(sellTrades[i].transactionDate).getTime();
    const window = sellTrades.filter(t => {
      const d = new Date(t.transactionDate).getTime();
      return Math.abs(d - anchor) <= 30 * 24 * 60 * 60 * 1000;
    });
    const uniqueSellers = new Set(window.map(t => t.reportingCik || t.reportingName));
    if (uniqueSellers.size >= 3) {
      const hasCFO = window.some(t => isCFO(t.reportingName, t.typeOfOwner));
      window.forEach(t => {
        clusterDates.add(t.transactionDate + t.reportingCik);
        if (hasCFO) clusterHasCFO.add(t.transactionDate + t.reportingCik);
      });
    }
  }

  // ── Map each trade to InsiderTrade with flags ─────────────────────────────
  const mapped: InsiderTrade[] = sorted.map(t => {
    const isBuy = t.acquistionOrDisposition === "A";
    const isSell = t.acquistionOrDisposition === "D";
    const isDiscretionary = isSell && !NON_DISCRETIONARY_TYPES.has(t.transactionType);
    const clusterKey = t.transactionDate + (t.reportingCik || t.reportingName);

    const flags: SuspiciousFlags = {
      discretionary: isDiscretionary,
      clusterSell: isSell && clusterDates.has(clusterKey),
      clusterIncludesCFO: isSell && clusterHasCFO.has(clusterKey),
      likelyNon10b51: isDiscretionary, // conservative heuristic: all discretionary sells are assumed non-10b5-1
    };

    return {
      ...t,
      totalValue: (t.price || 0) * (t.securitiesTransacted || 0),
      isBuy,
      flags,
    };
  });

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalBuys = mapped.filter(t => t.isBuy).length;
  const totalSells = mapped.filter(t => !t.isBuy).length;
  const discretionarySells = mapped.filter(t => t.flags.discretionary).length;
  const clusterAlert = clusterDates.size > 0;
  const netDirection = totalBuys > totalSells * 1.5
    ? "buying"
    : totalSells > totalBuys * 1.5
      ? "selling"
      : "neutral";

  return {
    trades: mapped,
    summary: { totalBuys, totalSells, discretionarySells, clusterAlert, netDirection },
  };
}
