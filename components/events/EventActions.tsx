"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FiHeart } from "react-icons/fi";
import { FaHeart } from "react-icons/fa";
import { toast } from "sonner";
import { useLanguage } from "@/app/components/LanguageContext";
import { useSaveEvent } from "@/app/lib/useSaveEvent";
import type { TranslationKey } from "@/app/lib/translations";
import { useOwned } from "@/app/lib/useOwned";

type Reaction = "going" | "interested";

interface Props {
  eventId: string;
  goingCount: number;
  interestedCount: number;
}

const GOLD = "#E8A020";
const NAVY = "#0F0F1A";

/**
 * Save / Going / Interested row for the event page. Going and Interested are
 * mutually exclusive (enforced server-side in /api/events/react); the counts
 * shown under the row move with the user's own clicks so they stay consistent
 * with the button state without a refetch.
 */
export default function EventActions({ eventId, goingCount, interestedCount }: Props) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const { saved, pending: savePending, toggle: toggleSave } = useSaveEvent(eventId);
  // On your own event the buttons are hidden (the API rejects them too); the counts stay.
  const isOwn = useOwned()?.events.has(eventId) ?? false;

  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [counts, setCounts] = useState({ going: goingCount, interested: interestedCount });
  const [reactPending, setReactPending] = useState(false);
  // Once the user has clicked, a slow initial load must not overwrite what they chose.
  const touched = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/events/react?eventId=${encodeURIComponent(eventId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { reactions?: string[] } | null) => {
        if (cancelled || touched.current || !body?.reactions) return;
        const current = body.reactions.find((r): r is Reaction => r === "going" || r === "interested");
        setReaction(current ?? null);
      })
      .catch(() => {});
    // The heart's initial state is loaded by useSaveEvent itself.
    return () => { cancelled = true; };
  }, [eventId]);

  async function handleReact(type: Reaction) {
    if (reactPending) return;
    touched.current = true;

    const prevReaction = reaction;
    const prevCounts = counts;
    const removing = reaction === type;

    // Optimistic update: toggle this one off, or switch to it (dropping the other).
    const nextCounts = { ...counts };
    if (removing) {
      nextCounts[type] = Math.max(0, nextCounts[type] - 1);
    } else {
      nextCounts[type] += 1;
      if (prevReaction) nextCounts[prevReaction] = Math.max(0, nextCounts[prevReaction] - 1);
    }
    setReaction(removing ? null : type);
    setCounts(nextCounts);
    setReactPending(true);

    const rollback = () => {
      setReaction(prevReaction);
      setCounts(prevCounts);
    };

    try {
      const res = removing
        ? await fetch(`/api/events/react?eventId=${encodeURIComponent(eventId)}&reactionType=${type}`, { method: "DELETE" })
        : await fetch("/api/events/react", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId, reactionType: type }),
          });

      if (res.status === 401) {
        rollback();
        toast(t("toast_sign_in_react"), {
          duration: 5000,
          action: {
            label: t("toast_sign_in"),
            onClick: () => router.push(`/sign-in?redirect=${encodeURIComponent(pathname)}`),
          },
        });
        return;
      }
      // 409: this reaction already existed (e.g. another tab), so the state we show is right.
      if (!res.ok && res.status !== 409) {
        rollback();
        toast(t("form_generic_error"));
      }
    } catch {
      rollback();
      toast(t("form_generic_error"));
    } finally {
      setReactPending(false);
    }
  }

  const pillStyle = (active: boolean): CSSProperties => ({
    flex: 1,
    height: 46,
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 700,
    cursor: reactPending ? "default" : "pointer",
    opacity: reactPending ? 0.7 : 1,
    transition: "background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease",
    backgroundColor: active ? GOLD : "rgba(255,255,255,0.06)",
    color: active ? NAVY : "#fff",
    border: `1px solid ${active ? GOLD : "rgba(255,255,255,0.12)"}`,
  });

  const countParts: string[] = [];
  const plural = (n: number, one: TranslationKey, other: TranslationKey) => `${n} ${t(n === 1 ? one : other)}`;
  if (counts.going > 0) countParts.push(plural(counts.going, "event_count_going_one", "event_count_going_other"));
  if (counts.interested > 0) countParts.push(plural(counts.interested, "event_count_interested_one", "event_count_interested_other"));

  return (
    <div style={{ marginBottom: 32 }}>
      {!isOwn && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={toggleSave}
            disabled={savePending}
            aria-label={t(saved ? "event_unsave_aria" : "event_save_aria")}
            aria-pressed={saved}
            style={{
              width: 46, height: 46, flexShrink: 0, borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.06)",
              border: `1px solid ${saved ? "rgba(232,160,32,0.5)" : "rgba(255,255,255,0.12)"}`,
              cursor: savePending ? "default" : "pointer",
              opacity: savePending ? 0.7 : 1,
            }}
          >
            {saved
              ? <FaHeart size={20} style={{ color: GOLD }} />
              : <FiHeart size={20} style={{ color: "rgba(255,255,255,0.9)" }} />}
          </button>
          <button
            type="button"
            onClick={() => handleReact("going")}
            disabled={reactPending}
            aria-pressed={reaction === "going"}
            style={pillStyle(reaction === "going")}
          >
            {t("events_going")}
          </button>
          <button
            type="button"
            onClick={() => handleReact("interested")}
            disabled={reactPending}
            aria-pressed={reaction === "interested"}
            style={pillStyle(reaction === "interested")}
          >
            {t("events_interested")}
          </button>
        </div>
      )}
      {countParts.length > 0 && (
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 10 }}>
          {countParts.join(" · ")}
        </p>
      )}
    </div>
  );
}
