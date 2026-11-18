"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const KEY = "nu_visit_tracked";

// Counts one visit per browser session, site-wide. Admin pages are skipped.
export default function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch {
      return;
    }
    fetch("/api/track-visit", { method: "POST" }).catch(() => {});
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
