import { useState, useCallback } from "react";
import { useAuth } from "../contexts/useAuth.ts";

const SEARCH_COUNT_KEY = "tup_search_count";
const DISMISSED_KEY = "tup_signup_dismissed";
const COUNT_DAYS = 30;
const DISMISS_DAYS = 7;

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookieInt(name: string): number {
  return parseInt(getCookie(name) ?? "0", 10) || 0;
}

export const FORCE_PROMPT = new URLSearchParams(window.location.search).has("show_prompt");
export const URL_TICKER = new URLSearchParams(window.location.search).get("t")?.toUpperCase() ?? null;

export function useSearchCount() {
  const { isAuthenticated } = useAuth();
  const [searchCount, setSearchCount] = useState(() => getCookieInt(SEARCH_COUNT_KEY));
  const [dismissed, setDismissed] = useState(() => getCookie(DISMISSED_KEY) === "1");
  // The prompt is only armed by a search made in this session; otherwise a
  // stale count cookie (>= 5 from earlier visits) pops it on bare page load.
  const [searchedThisSession, setSearchedThisSession] = useState(false);

  const incrementSearchCount = useCallback(() => {
    const next = getCookieInt(SEARCH_COUNT_KEY) + 1;
    setCookie(SEARCH_COUNT_KEY, String(next), COUNT_DAYS);
    setSearchCount(next);
    setSearchedThisSession(true);
  }, []);

  const dismissPrompt = useCallback(() => {
    setCookie(DISMISSED_KEY, "1", DISMISS_DAYS);
    setDismissed(true);
    // Restart the count so the prompt re-arms only after 5 fresh searches
    // once the dismissal window expires, instead of staying >= 5 forever.
    setCookie(SEARCH_COUNT_KEY, "0", COUNT_DAYS);
    setSearchCount(0);
  }, []);

  const shouldShowPrompt = !isAuthenticated &&
    (FORCE_PROMPT || (searchedThisSession && searchCount >= 5 && !dismissed));

  return { searchCount, incrementSearchCount, shouldShowPrompt, dismissPrompt };
}
