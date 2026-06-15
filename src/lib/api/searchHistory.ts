const API = "/api/search-history";
const opts: RequestInit = { credentials: "include", headers: { "Content-Type": "application/json" } };

export interface DailySearchCount {
  date: string;
  count: number;
}

export async function logSearch(ticker: string): Promise<void> {
  await fetch(API, {
    ...opts,
    method: "POST",
    body: JSON.stringify({ ticker }),
  });
}

export async function getDailySearchCounts(days: number = 84): Promise<DailySearchCount[]> {
  const res = await fetch(`${API}/daily?days=${days}`, { ...opts });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data.days as DailySearchCount[];
}
