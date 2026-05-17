"use client";

import { type SearchTab } from "../../components/SearchBar";

interface NavSearchProps {
  activeTab: SearchTab | null;
  onTabClick: (tab: SearchTab) => void;
}

const MagnifyingGlass = ({ stroke }: { stroke: string }) => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round">
    <circle cx="5.5" cy="5.5" r="4" />
    <line x1="8.5" y1="8.5" x2="12" y2="12" />
  </svg>
);

export default function NavSearch({ activeTab, onTabClick }: NavSearchProps) {
  const isOpen = activeTab !== null;

  const segStyle = (seg: SearchTab): React.CSSProperties => ({
    height: "100%",
    padding: "0 11px",
    display: "flex",
    alignItems: "center",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontFamily: "var(--font-sans)",
    fontSize: "10px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: activeTab === seg ? "#E8A020" : "rgba(255,255,255,0.45)",
    borderRight: "1px solid rgba(255,255,255,0.06)",
    transition: "color 0.2s",
    flexShrink: 0,
    whiteSpace: "nowrap",
  });

  return (
    <div style={{ marginRight: "16px", flexShrink: 0 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: "34px",
          border: `1px solid ${isOpen ? "rgba(232,160,32,0.45)" : "rgba(255,255,255,0.1)"}`,
          background: isOpen ? "#0a0a14" : "rgba(255,255,255,0.04)",
          borderRadius: "8px",
          overflow: "hidden",
          transition: "border-color 0.2s, background 0.2s",
          width: "230px",
        }}
      >
        <button type="button" onClick={() => onTabClick("events")} style={segStyle("events")}>
          Events
        </button>
        <button type="button" onClick={() => onTabClick("network")} style={segStyle("network")}>
          Network
        </button>
        <button
          type="button"
          onClick={() => onTabClick("search")}
          style={{
            ...segStyle("search"),
            padding: "0 11px",
            borderRight: "none",
          }}
        >
          <MagnifyingGlass stroke={activeTab === "search" ? "#E8A020" : "rgba(255,255,255,0.4)"} />
        </button>
      </div>
    </div>
  );
}
