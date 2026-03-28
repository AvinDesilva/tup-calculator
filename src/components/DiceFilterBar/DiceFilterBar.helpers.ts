import type { RollFilters, MarketCapTier, ExchangeFilter, TupRangeFilter } from "../../lib/types.ts";

export const DEFAULT_FILTERS: RollFilters = { marketCap: [], sector: "", exchange: [], indexEtf: "", tupRange: [] };

export const CAPS: MarketCapTier[] = ["Micro", "Small", "Mid", "Large"];
export const EXCHANGES: ExchangeFilter[] = ["NYSE", "NASDAQ", "LSE", "TSX"];
export const TUP_RANGES: TupRangeFilter[] = ["≤7", "≤9", "10–12", "13–15", "15+"];

export function filtersEqual(a: RollFilters, b: RollFilters): boolean {
  return a.marketCap.length === b.marketCap.length && a.marketCap.every(c => b.marketCap.includes(c)) && a.sector === b.sector && a.exchange.length === b.exchange.length && a.exchange.every(e => b.exchange.includes(e)) && a.indexEtf === b.indexEtf && a.tupRange.length === b.tupRange.length && a.tupRange.every(r => b.tupRange.includes(r));
}

export function isDefault(f: RollFilters): boolean {
  return filtersEqual(f, DEFAULT_FILTERS);
}
