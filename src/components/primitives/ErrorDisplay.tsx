import { useState, useEffect } from "react";
import type React from "react";

export function ErrorDisplay({ error, style }: { error: string; style?: React.CSSProperties }) {
  const isRateLimit = /rate limit/i.test(error);
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isRateLimit) { setCountdown(5); return; }
    setCountdown(5);
    const iv = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(iv); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [error, isRateLimit]);

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
