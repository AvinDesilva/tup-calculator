import { useState } from "react";
import { C } from "../../lib/theme.ts";

export type Tab = "analysis" | "metrics" | "profile" | "logic";

const TABS: { id: Tab; label: string }[] = [
  { id: "analysis", label: "Analysis" },
  { id: "metrics",  label: "Metrics"  },
  { id: "profile",  label: "Profile"  },
  { id: "logic",    label: "Logic"    },
];

interface TabNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function TabNav({ activeTab, onTabChange }: TabNavProps) {
  const [hoveredTab, setHoveredTab] = useState<Tab | null>(null);

  return (
    <div
      role="tablist"
      aria-label="Content sections"
      className="rsp-tab-nav"
      style={{
        display: "flex",
        borderBottom: `1px solid ${C.borderWeak}`,
        paddingBottom: "0",
        marginBottom: "0",
        gap: "0",
      }}
    >
      {TABS.map(({ id, label }) => {
        const isActive = activeTab === id;
        const isHovered = hoveredTab === id;
        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`tab-panel-${id}`}
            id={`tab-${id}`}
            onClick={() => onTabChange(id)}
            onMouseEnter={() => setHoveredTab(id)}
            onMouseLeave={() => setHoveredTab(null)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              borderBottom: isActive ? `2px solid ${C.accent}` : "2px solid transparent",
              color: isActive ? C.accent : isHovered ? C.text1 : C.text3,
              fontFamily: C.body,
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "10px 8px 8px",
              cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
              marginBottom: "-1px",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
