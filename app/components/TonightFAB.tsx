"use client";
import { useTonightModal } from "./TonightContext";

export default function TonightFAB() {
  const { open, isOpen } = useTonightModal();
  return (
    <button
      onClick={open}
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 22px",
        borderRadius: 999,
        background: "linear-gradient(135deg, #E8A020, #F5B335)",
        color: "#0A0A12",
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        border: "none",
        cursor: "pointer",
        boxShadow: "0 4px 24px rgba(232,160,32,0.35)",
        whiteSpace: "nowrap",
        opacity: isOpen ? 0 : 1,
        pointerEvents: isOpen ? "none" : "auto",
        transition: "opacity 0.3s ease",
      }}
      className="tonight-fab"
    >
      <span style={{ fontSize: 14 }}>✦</span> Plan Your Exit
    </button>
  );
}
