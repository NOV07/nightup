"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLanguage } from "../components/LanguageContext";

// The current user's saved event ids, fetched once per page (keyed by pathname)
// and shared by every card on it, instead of one request per card. A new page
// refetches, so a sign-in or a save made elsewhere is picked up on navigation.
let savedIdsCache: { path: string; ids: Promise<Set<string>> } | null = null;

function loadSavedIds(path: string): Promise<Set<string>> {
  if (savedIdsCache?.path !== path) {
    const ids = fetch("/api/saved/events")
      // 401 for logged-out visitors: nothing is saved.
      .then((r) => (r.ok ? r.json() : []))
      .then((list: unknown) => new Set(Array.isArray(list) ? (list as string[]) : []))
      .catch(() => new Set<string>());
    savedIdsCache = { path, ids };
  }
  return savedIdsCache.ids;
}

function rememberSaved(eventId: string, saved: boolean) {
  savedIdsCache?.ids.then((ids) => (saved ? ids.add(eventId) : ids.delete(eventId)));
}

/**
 * Save/unsave state for one event, shared by the event cards and the event
 * page so the heart behaves the same everywhere: optimistic flip, rollback on
 * failure, and a sign-in toast for logged-out visitors.
 *
 * Without `initialSaved` the hook looks the event up in the page's shared
 * saved-ids list, so the heart shows filled for events already saved.
 */
export function useSaveEvent(eventId: string, initialSaved?: boolean) {
  const [saved, setSaved] = useState(initialSaved ?? false);
  const [pending, setPending] = useState(false);
  // Once the user has clicked, a slow initial load must not overwrite what they chose.
  const touched = useRef(false);
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    if (initialSaved !== undefined) return;
    let cancelled = false;
    loadSavedIds(pathname).then((ids) => {
      if (!cancelled && !touched.current) setSaved(ids.has(eventId));
    });
    return () => { cancelled = true; };
  }, [eventId, initialSaved, pathname]);

  const toggle = useCallback(async () => {
    if (pending) return;
    touched.current = true;
    const next = !saved;
    setSaved(next);
    setPending(true);
    try {
      const res = next
        ? await fetch("/api/saved/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ event_id: eventId }),
          })
        : await fetch(`/api/saved/events?event_id=${eventId}`, { method: "DELETE" });

      if (res.status === 401) {
        setSaved(false);
        toast(t("toast_sign_in_save"), {
          duration: 5000,
          action: {
            label: t("toast_sign_in"),
            onClick: () => router.push(`/sign-in?redirect=${encodeURIComponent(pathname)}`),
          },
        });
        return;
      }
      if (res.ok) rememberSaved(eventId, next);
      else setSaved(!next);
    } catch {
      setSaved(!next);
    } finally {
      setPending(false);
    }
  }, [eventId, saved, pending, pathname, router, t]);

  return { saved, pending, toggle };
}
