import { useState, useEffect } from "react";
import type React from "react";
import { DEFAULT_RETRY_AFTER_S } from "../../hooks/diceRoll.constants.ts";

// `retryAfter` is the seconds value the server asked us to wait. Comes from the
// Express middleware's Retry-After header / JSON body (`server/middleware.js`).
// Falls back to DEFAULT_RETRY_AFTER_S when null (nginx-emitted 429s and FMP
// upstream 429s don't carry the header).
export function ErrorDisplay({ error, retryAfter, style }: { error: string; retryAfter?: number | null; style?: React.CSSProperties }) {
  const isRateLimit = /rate limit/i.test(error);
  const initial = retryAfter && retryAfter > 0 ? retryAfter : DEFAULT_RETRY_AFTER_S;
  const [countdown, setCountdown] = useState(initial);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isRateLimit) { setCountdown(initial); return; }
    setCountdown(initial);
    const iv = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(iv); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [error, isRateLimit, initial]);

  if (!error) return null;

  if (!isRateLimit) {
    return <span role="alert" style={{ color: "#ff4136", ...style }}>{error}</span>;
  }

  const done = countdown === 0;

  return (
    <span role="alert" style={{ ...style, transition: "color 0.3s" }}>
      {done ? (
        <>
          <span style={{ color: "#10d97e" }}>API limit reset</span>
          <br />
          <span style={{ color: "#10d97e" }}>roll again!</span>
        </>
      ) : (
        <>
          <span style={{ color: "#ff4136" }}>API rate limit reached</span>
          <br />
          <span style={{ color: "#ff4136" }}>Try again in {countdown}s</span>
        </>
      )}
    </span>
  );
}
