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

  return (
    <div style={{ marginRight: "16px", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => onTabClick("search")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "34px",
          height: "34px",
          background: isOpen ? "#0a0a14" : "rgba(255,255,255,0.04)",
          border: `1px solid ${isOpen ? "rgba(232,160,32,0.45)" : "rgba(255,255,255,0.1)"}`,
          borderRadius: "8px",
          cursor: "pointer",
          transition: "border-color 0.2s, background 0.2s",
        }}
      >
        <MagnifyingGlass stroke={isOpen ? "#E8A020" : "rgba(255,255,255,0.4)"} />
      </button>
    </div>
  );
}
