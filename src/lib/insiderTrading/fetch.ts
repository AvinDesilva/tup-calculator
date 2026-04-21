import { fetchFMP } from "../tickerSearch/api.ts";
import { analyzeInsiderTrades } from "./analyze.ts";
import type { FMPInsiderTrade, InsiderTradingData } from "./types.ts";

export async function fetchInsiderTrading(symbol: string): Promise<InsiderTradingData | null> {
  try {
    const raw = await fetchFMP<FMPInsiderTrade[]>(`insider-trading?symbol=${symbol}&limit=40`);
    if (!raw || !Array.isArray(raw) || raw.length === 0) return null;
    return analyzeInsiderTrades(raw);
  } catch {
    return null;
  }
}
