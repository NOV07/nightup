"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export interface Owned {
  events: Set<string>;
  spots: Set<string>;
}

// The current user's own events and spots, fetched once per page (keyed by
// pathname, like the saved-ids list) and shared by every card on it.
let cache: { path: string; data: Promise<Owned> } | null = null;

function loadOwned(path: string): Promise<Owned> {
  if (cache?.path !== path) {
    const data = fetch("/api/owned")
      .then((r) => (r.ok ? r.json() : { events: [], spots: [] }))
      .then((b: { events?: string[]; spots?: string[] }) => ({
        events: new Set(Array.isArray(b.events) ? b.events : []),
        spots: new Set(Array.isArray(b.spots) ? b.spots : []),
      }))
      .catch(() => ({ events: new Set<string>(), spots: new Set<string>() }));
    cache = { path, data };
  }
  return cache.data;
}

/** `null` until loaded; the buttons stay visible meanwhile, the API rejects
 *  own-content actions regardless. */
export function useOwned(): Owned | null {
  const pathname = usePathname();
  const [owned, setOwned] = useState<Owned | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadOwned(pathname).then((o) => { if (!cancelled) setOwned(o); });
    return () => { cancelled = true; };
  }, [pathname]);
  return owned;
}
