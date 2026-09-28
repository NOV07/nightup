"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLanguage } from "../components/LanguageContext";

/**
 * Save/unsave state for one event, shared by the event cards and the event
 * page so the heart behaves the same everywhere: optimistic flip, rollback on
 * failure, and a sign-in toast for logged-out visitors.
 */
export function useSaveEvent(eventId: string, initialSaved = false) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();

  const toggle = useCallback(async () => {
    if (pending) return;
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
      if (!res.ok) setSaved(!next);
    } catch {
      setSaved(!next);
    } finally {
      setPending(false);
    }
  }, [eventId, saved, pending, pathname, router, t]);

  return { saved, setSaved, pending, toggle };
}
