"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTonightModal } from "./TonightContext";
import NetworkGuidedModal from "@/components/network/NetworkGuidedModal";
import { useNetworkProfiles } from "./NetworkProfilesContext";

export default function TonightFAB() {
  const { open, isOpen } = useTonightModal();
  const [hidden, setHidden] = useState(false);
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const lastY = useRef(0);
  const pathname = usePathname();
  const isNetwork = pathname === "/network" || pathname?.startsWith("/network");
  const networkProfiles = useNetworkProfiles();

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      if (y < 200) setHidden(false);
      else if (y > lastY.current + 8) setHidden(true);
      else if (y < lastY.current - 8) setHidden(false);
      lastY.current = y;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <button
        onClick={isNetwork ? () => setShowNetworkModal(true) : open}
        style={{
          position: "fixed",
          bottom: 28,
          left: "50%",
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
          opacity: isOpen || showNetworkModal || hidden ? 0 : 1,
          pointerEvents: isOpen || showNetworkModal || hidden ? "none" : "auto",
          transform: hidden
            ? "translateX(-50%) translateY(120%)"
            : "translateX(-50%) translateY(0)",
          transition: "opacity 0.3s ease, transform 0.35s cubic-bezier(.22,.61,.36,1)",
        }}
        className="tonight-fab"
      >
        <span style={{ fontSize: 14 }}>✦</span> {isNetwork ? "Τι ετοιμάζεις;" : "Plan Your Exit"}
      </button>
      {isNetwork && showNetworkModal && (
        <NetworkGuidedModal onClose={() => setShowNetworkModal(false)} profiles={networkProfiles} />
      )}
    </>
  );
}
