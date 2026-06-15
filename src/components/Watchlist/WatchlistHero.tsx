import { useMemo, useState } from "react";
import { C, toggleBtn } from "../../lib/theme.ts";
import type { DailySearchCount } from "../../lib/api/searchHistory.ts";

interface WatchlistHeroProps {
  displayName: string;
  dailyCounts: DailySearchCount[];
  onBack: () => void;
}

const PHRASES = [
  "What's caught your eye today?",
  "Ready to dig into a balance sheet?",
  "Let's hunt for an undervalued name.",
  "Any companies on your mind?",
  "Time to study some earnings.",
  "Spot a bargain in the noise?",
  "Which moats are looking strong?",
  "Let's find a quality compounder.",
  "Anything worth a closer look?",
  "What did the market get wrong?",
];

const WEEKS = 12;
const DAYS_PER_WEEK = 7;

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function cellColor(count: number): string {
  if (count <= 0) return C.borderWeak;
  if (count === 1) return "rgba(196,160,110,0.25)";
  if (count <= 3) return "rgba(196,160,110,0.5)";
  if (count <= 5) return "rgba(196,160,110,0.75)";
  return C.accent;
}

export function WatchlistHero({ displayName, dailyCounts, onBack }: WatchlistHeroProps) {
  const [phrase] = useState(
    () => PHRASES[Math.floor(Math.random() * PHRASES.length)],
  );

  const { cells, total } = useMemo(() => {
    const countMap = new Map<string, number>();
    let sum = 0;
    for (const d of dailyCounts) {
      countMap.set(d.date, d.count);
      sum += d.count;
    }

    // Anchor the rightmost column on the current week (Saturday end), so today
    // sits in the final column. Walk back WEEKS*DAYS-1 days from that anchor.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dow = today.getDay(); // 0 = Sunday
    const daysUntilSaturday = (6 - dow + 7) % 7;
    const anchor = new Date(today);
    anchor.setDate(anchor.getDate() + daysUntilSaturday);

    const totalCells = WEEKS * DAYS_PER_WEEK;
    const start = new Date(anchor);
    start.setDate(start.getDate() - (totalCells - 1));

    const result: { date: string; count: number; isFuture: boolean }[] = [];
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = toLocalDateKey(d);
      result.push({
        date: key,
        count: countMap.get(key) ?? 0,
        isFuture: d > today,
      });
    }
    return { cells: result, total: sum };
  }, [dailyCounts]);

  return (
    <section
      className="rsp-watchlist-hero"
      style={{
        paddingTop: "32px",
        paddingBottom: "28px",
        borderBottom: `2px solid ${C.accent}`,
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        animation: "fadeInUp 0.5s 0.1s ease both",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
        <div>
          <div
            style={{
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: C.text3,
              fontFamily: C.body,
              marginBottom: "10px",
            }}
          >
            Welcome back
          </div>
          <h2
            style={{
              fontFamily: C.serif,
              fontWeight: 400,
              fontSize: "clamp(1.8rem, 4.5vw, 3rem)",
              color: C.text1,
              margin: 0,
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
            }}
          >
            Hello,{" "}
            <em style={{ color: C.accent, fontStyle: "normal" }}>{displayName}</em>.
          </h2>
          <p
            style={{
              fontFamily: C.body,
              fontSize: "14px",
              color: C.text2,
              margin: "10px 0 0",
              lineHeight: 1.5,
            }}
          >
            {phrase}
          </p>
        </div>
        <button onClick={onBack} style={{ ...toggleBtn(false), flexShrink: 0 }}>
          &larr; Back
        </button>
      </div>

      <div
        className="rsp-wl-heatmap-wrap"
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}
      >
        <div
          style={{
            fontSize: "9px",
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: C.text3,
            fontFamily: C.body,
          }}
        >
          {total} {total === 1 ? "search" : "searches"} · last 12 weeks
        </div>
        <div
          role="img"
          aria-label={`Search activity heatmap: ${total} total searches over the last 12 weeks`}
          className="rsp-wl-heatmap"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${WEEKS}, 12px)`,
            gridTemplateRows: `repeat(${DAYS_PER_WEEK}, 12px)`,
            gridAutoFlow: "column",
            gap: "3px",
          }}
        >
          {cells.map((cell, i) => (
            <div
              key={i}
              title={cell.isFuture ? "" : `${cell.count} on ${cell.date}`}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "2px",
                background: cell.isFuture ? "transparent" : cellColor(cell.count),
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
