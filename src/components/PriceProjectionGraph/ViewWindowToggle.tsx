import { C } from "../../lib/theme.ts";

interface ViewWindowToggleProps {
  viewYears: 2 | 5 | 10;
  setViewYears: (v: 2 | 5 | 10) => void;
  body: string;
}

function toggleStyle(active: boolean, body: string): React.CSSProperties {
  return {
    padding: "2px 8px",
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    fontFamily: body,
    textTransform: "uppercase",
    background: active ? C.accent : "transparent",
    color: active ? "#080808" : "#666",
    border: `1px solid ${active ? C.accent : "rgba(255,255,255,0.12)"}`,
    cursor: "pointer",
    transition: "all 0.15s",
  };
}

export function ViewWindowToggle({ viewYears, setViewYears, body }: ViewWindowToggleProps) {
  return (
    <div style={{ marginBottom: "10px", flexShrink: 0 }}>
      <div role="group" aria-label="Chart time window" style={{ display: "flex", alignItems: "center", gap: "0" }}>
        <button onClick={() => setViewYears(2)}  aria-pressed={viewYears === 2}  aria-label="2 year view"  style={{ ...toggleStyle(viewYears === 2,  body), borderRight: "none" }}>2Y</button>
        <button onClick={() => setViewYears(5)}  aria-pressed={viewYears === 5}  aria-label="5 year view"  style={{ ...toggleStyle(viewYears === 5,  body), borderRight: "none" }}>5Y</button>
        <button onClick={() => setViewYears(10)} aria-pressed={viewYears === 10} aria-label="10 year view" style={toggleStyle(viewYears === 10, body)}>10Y</button>
      </div>
    </div>
  );
}
