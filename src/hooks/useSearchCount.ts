import { useState, useCallback } from "react";
import { useAuth } from "../contexts/useAuth.ts";

const SEARCH_COUNT_KEY = "tup_search_count";
const DISMISSED_KEY = "tup_signup_dismissed";

function getSessionInt(key: string): number {
  return parseInt(sessionStorage.getItem(key) || "0", 10) || 0;
}

export function useSearchCount() {
  const { isAuthenticated } = useAuth();
  const [searchCount, setSearchCount] = useState(() => getSessionInt(SEARCH_COUNT_KEY));
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISSED_KEY) === "1");

  const incrementSearchCount = useCallback(() => {
    const next = getSessionInt(SEARCH_COUNT_KEY) + 1;
    sessionStorage.setItem(SEARCH_COUNT_KEY, String(next));
    setSearchCount(next);
  }, []);

  const dismissPrompt = useCallback(() => {
    sessionStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }, []);

  const shouldShowPrompt = searchCount >= 5 && !isAuthenticated && !dismissed;

  return { searchCount, incrementSearchCount, shouldShowPrompt, dismissPrompt };
}
