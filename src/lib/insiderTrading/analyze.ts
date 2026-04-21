import type { FMPInsiderTrade, InsiderTrade, InsiderTradingData, SuspiciousFlags } from "./types.ts";

// Transaction types that are automatic/obligatory (not discretionary sells)
const NON_DISCRETIONARY_TYPES = new Set(["F-InKind", "M-Exempt", "A-Award", "G-Gift", "J-Other"]);

// Only these transaction types are meaningful to display
const DISPLAY_TYPES = new Set(["P-Purchase", "S-Sale", "S-Sale+OE"]);

function isCFO(name: string, typeOfOwner: string): boolean {
  const combined = `${name} ${typeOfOwner}`.toUpperCase();
  return combined.includes("CFO") || combined.includes("CHIEF FINANCIAL");
}

export function analyzeInsiderTrades(raw: FMPInsiderTrade[]): InsiderTradingData {
  // Filter to form 4 (standard insider filings) and valid trades
  const form4 = raw.filter(t => t.formType === "4" || t.formType === "");
  const trades = (form4.length > 0 ? form4 : raw)
    .filter(t => t.transactionDate && t.securitiesTransacted > 0);

  // Sort descending by transaction date
  const sorted = [...trades].sort(
    (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
  );

  // ── Cluster detection: find 30-day windows with 3+ unique discretionary sellers
  const discretionarySells = sorted.filter(t =>
    t.acquisitionOrDisposition === "D" && !NON_DISCRETIONARY_TYPES.has(t.transactionType)
  );

  const clusterKeys = new Set<string>();
  const clusterCFOKeys = new Set<string>();

  for (let i = 0; i < discretionarySells.length; i++) {
    const anchor = new Date(discretionarySells[i].transactionDate).getTime();
    const window = discretionarySells.filter(t => {
      const d = new Date(t.transactionDate).getTime();
      return Math.abs(d - anchor) <= 30 * 24 * 60 * 60 * 1000;
    });
    const uniqueSellers = new Set(window.map(t => t.reportingCik || t.reportingName));
    if (uniqueSellers.size >= 3) {
      const hasCFO = window.some(t => isCFO(t.reportingName, t.typeOfOwner));
      for (const t of window) {
        const key = t.transactionDate + t.reportingCik;
        clusterKeys.add(key);
        if (hasCFO) clusterCFOKeys.add(key);
      }
    }
  }

  // ── Map each trade to InsiderTrade with flags (display-worthy types only)
  const mapped: InsiderTrade[] = sorted.filter(t => DISPLAY_TYPES.has(t.transactionType)).map(t => {
    const isBuy = t.acquisitionOrDisposition === "A" && t.transactionType === "P-Purchase";
    const isSell = t.acquisitionOrDisposition === "D";
    const isDiscretionary = isSell && !NON_DISCRETIONARY_TYPES.has(t.transactionType);
    const clusterKey = t.transactionDate + (t.reportingCik || t.reportingName);

    const flags: SuspiciousFlags = {
      discretionary: isDiscretionary,
      clusterSell: isSell && clusterKeys.has(clusterKey),
      clusterIncludesCFO: isSell && clusterCFOKeys.has(clusterKey),
      likelyNon10b51: isDiscretionary,
    };

    return {
      ...t,
      totalValue: (t.price || 0) * (t.securitiesTransacted || 0),
      isBuy,
      flags,
    };
  });

  // ── Summary
  const totalBuys = mapped.filter(t => t.isBuy).length;
  const totalSells = mapped.filter(t => !t.isBuy).length;
  const discSells = mapped.filter(t => t.flags.discretionary).length;
  const clusterAlert = clusterKeys.size > 0;
  const netDirection = totalBuys > totalSells * 1.5
    ? "buying"
    : totalSells > totalBuys * 1.5
      ? "selling"
      : "neutral";

  return {
    trades: mapped,
    summary: { totalBuys, totalSells, discretionarySells: discSells, clusterAlert, netDirection },
  };
}
