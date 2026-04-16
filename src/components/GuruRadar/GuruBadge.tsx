import type { GuruScore } from "../../lib/guruRadar/types.ts";

interface Props {
  guru: GuruScore;
  style?: React.CSSProperties;
  className?: string;
}

const VERDICT_STYLE: Record<string, { border: string; bg: string; color: string }> = {
  Yes:   { border: "rgba(16,217,126,0.5)",  bg: "rgba(16,217,126,0.12)",  color: "#10d97e" },
  Maybe: { border: "rgba(90,173,130,0.4)",  bg: "rgba(90,173,130,0.10)",  color: "#5aad82" },
  No:    { border: "rgba(255,255,255,0.12)", bg: "rgba(255,255,255,0.04)", color: "#888" },
};

export function GuruBadge({ guru, style, className }: Props) {
  const vs = VERDICT_STYLE[guru.verdict] ?? VERDICT_STYLE.No;
  return (
    <div className={className} style={{
      border: `1px solid ${vs.border}`,
      background: vs.bg,
      borderRadius: 8,
      padding: "6px 8px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 3,
      minWidth: 72,
      ...style,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#ccc", fontFamily: "Space Grotesk, sans-serif", textAlign: "center", lineHeight: 1.2 }}>
        {guru.name}
      </span>
      <span style={{ fontSize: 10, color: vs.color, fontWeight: 700 }}>
        {guru.verdict}
      </span>
      <span style={{ fontSize: 10, color: "#666" }}>
        {guru.score}/10
      </span>
    </div>
  );
}
