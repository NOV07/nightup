"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import EventCard from "./EventCard";

interface EventCardData {
  id: string;
  title: string;
  image: string;
  genre: string;
  price: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  interestedCount: number;
  goingCount: number;
  featured?: boolean;
  badge?: string;
}

export default function HomeEventsSection({
  hotCards,
  popularCards,
}: {
  hotCards: EventCardData[];
  popularCards: EventCardData[];
}) {
  const [activeTab, setActiveTab] = useState<"thisweek" | "hotpopular">("thisweek");

  const thisWeekCards = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return [...hotCards, ...popularCards].filter((e) => {
      const eventDate = new Date(e.date);
      return eventDate >= monday && eventDate <= sunday;
    });
  }, [hotCards, popularCards]);

  const hotPopularCards = useMemo(() => [...hotCards, ...popularCards], [hotCards, popularCards]);

  const displayCards = activeTab === "thisweek" ? thisWeekCards : hotPopularCards;

  return (
    <section className="events" style={{ padding: "32px" }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-end", marginBottom: "14px",
      }}>
        <div>
          <p style={{
            fontFamily: "var(--font-sans)", fontSize: "11px",
            letterSpacing: "0.15em", textTransform: "uppercase",
            color: "var(--text-muted)", margin: 0,
          }}>Events</p>
          <div style={{ width: "20px", height: "1px", background: "var(--gold)", marginTop: "5px" }} />
        </div>
        <Link href="/events" style={{
          fontFamily: "var(--font-sans)", fontSize: "11px",
          color: "var(--text-muted)", letterSpacing: "0.05em",
          textDecoration: "none",
        }}>View all →</Link>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        marginBottom: "20px",
      }}>
        {(["thisweek", "hotpopular"] as const).map((tab) => {
          const label = tab === "thisweek" ? "Αυτή την εβδομάδα" : "Πιο δημοφιλή";
          const isActive = activeTab === tab;
          return (
            <span
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                fontFamily: "var(--font-sans)", fontSize: "11px",
                letterSpacing: "0.1em", textTransform: "uppercase",
                color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                paddingBottom: "10px", marginRight: "20px",
                borderBottom: isActive ? "1px solid var(--gold)" : "1px solid transparent",
                cursor: "pointer",
                transition: "color 0.2s",
              }}
            >
              {label}
            </span>
          );
        })}
      </div>

      {/* Animated content */}
      <div
        key={activeTab}
        style={{ animation: "tabFadeIn 250ms ease-out forwards" }}
      >
        {displayCards.length > 0 ? (
          <div className="ev-grid-responsive" style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: "8px",
          }}>
            {displayCards.slice(0, 5).map((e, i) => (
              <div
                key={e.id}
                className="fade-card"
                style={{ transitionDelay: `${i * 80}ms`, position: "relative", overflow: "visible" }}
              >
                <EventCard {...e} />
              </div>
            ))}
          </div>
        ) : (
          <p style={{
            color: "var(--text-muted)", fontFamily: "var(--font-mono)",
            fontSize: "11px", letterSpacing: "0.08em",
            textTransform: "uppercase", padding: "40px 0",
          }}>
            {activeTab === "thisweek" ? "No events this week" : "No events"}
          </p>
        )}
      </div>

      <style>{`
        @keyframes tabFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
