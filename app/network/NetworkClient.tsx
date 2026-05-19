"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { NETWORK, CITIES } from "../lib/searchData";

type NetworkTab = "Plan Your Event" | "For Artists";

interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  network_tab: string | null;
  network_category: string | null;
  network_subcategory: string | null;
  is_featured: boolean | null;
  is_verified: boolean | null;
}

const AMBER = "#F59E0B";

// ─── Profile Card ────────────────────────────────────────────────────────────

function ProfileCard({ profile }: { profile: Profile }) {
  const featured = !!profile.is_featured;
  return (
    <Link
      href={`/profile/${profile.username}`}
      className="group block rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
      style={{
        backgroundColor: "#111120",
        border: featured
          ? `1px solid ${AMBER}`
          : "1px solid rgba(232,160,32,0.12)",
        boxShadow: featured ? "0 0 18px rgba(245,158,11,0.15)" : "none",
      }}
    >
      <div className="p-5">
        {/* Avatar + name row */}
        <div className="flex items-start gap-4 mb-3">
          <div
            className="relative flex-shrink-0 rounded-xl overflow-hidden"
            style={{ width: 52, height: 52, border: `2px solid ${AMBER}` }}
          >
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name}
                fill
                className="object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-lg font-bold"
                style={{ backgroundColor: "#1A1A2E", color: AMBER }}
              >
                {profile.display_name[0]?.toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <p className="font-semibold text-white text-sm leading-tight truncate">
                {profile.display_name}
              </p>
              {profile.is_verified && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: "rgba(232,160,32,0.15)",
                    color: AMBER,
                    border: "0.5px solid rgba(232,160,32,0.3)",
                  }}
                >
                  ✓
                </span>
              )}
              {featured && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 font-bold"
                  style={{ backgroundColor: AMBER, color: "#09090f" }}
                >
                  ★
                </span>
              )}
            </div>

            {profile.network_subcategory && (
              <span
                className="inline-block text-xs px-2.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: "rgba(245,158,11,0.1)",
                  color: AMBER,
                  border: "0.5px solid rgba(245,158,11,0.25)",
                }}
              >
                {profile.network_subcategory}
              </span>
            )}
          </div>
        </div>

        {/* Location */}
        {profile.location && (
          <p
            className="text-xs mb-2.5 flex items-center gap-1"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            <span>📍</span>
            <span>{profile.location}</span>
          </p>
        )}

        {/* Bio */}
        {profile.bio && (
          <p
            className="text-xs leading-relaxed line-clamp-2 mb-4"
            style={{ color: "rgba(255,255,255,0.5)" }}
          >
            {profile.bio}
          </p>
        )}

        {/* CTA */}
        <div
          className="w-full py-2 rounded-lg text-xs font-semibold text-center transition-opacity group-hover:opacity-90"
          style={{
            backgroundColor: featured ? AMBER : "rgba(245,158,11,0.08)",
            color: featured ? "#09090f" : AMBER,
            border: featured ? "none" : "1px solid rgba(245,158,11,0.25)",
          }}
        >
          View Profile →
        </div>
      </div>
    </Link>
  );
}

// ─── Main client ─────────────────────────────────────────────────────────────

export default function NetworkClient({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derive filter state from URL — single source of truth
  const tabSlug = searchParams.get("tab") ?? "plan-your-event";
  const activeTab: NetworkTab =
    tabSlug === "for-artists" ? "For Artists" : "Plan Your Event";
  const activeCategory = searchParams.get("category") ?? "";
  const activeSubcategory = searchParams.get("subcategory") ?? "";
  const activeCity = searchParams.get("city") ?? "";

  function pushFilters({
    tab = activeTab,
    category = activeCategory,
    subcategory = activeSubcategory,
    city = activeCity,
  }: {
    tab?: NetworkTab;
    category?: string;
    subcategory?: string;
    city?: string;
  }) {
    const p = new URLSearchParams();
    p.set("tab", tab === "Plan Your Event" ? "plan-your-event" : "for-artists");
    if (category) p.set("category", category);
    if (subcategory) p.set("subcategory", subcategory);
    if (city) p.set("city", city);
    router.push(`/network?${p}`);
  }

  const categories = Object.keys(NETWORK[activeTab]);
  const subcategories = activeCategory
    ? ((NETWORK[activeTab] as Record<string, string[]>)[activeCategory] ?? [])
    : [];
  const hasFilters = !!(activeCategory || activeSubcategory || activeCity);

  // pill/chip shared style helper
  const pillStyle = (active: boolean) => ({
    backgroundColor: active ? AMBER : "rgba(255,255,255,0.06)",
    color: active ? "#09090f" : "rgba(255,255,255,0.5)",
    border: `1px solid ${active ? AMBER : "rgba(255,255,255,0.1)"}`,
    cursor: "pointer" as const,
  });

  const chipStyle = (active: boolean) => ({
    backgroundColor: active ? "rgba(245,158,11,0.15)" : "transparent",
    color: active ? AMBER : "rgba(255,255,255,0.4)",
    border: `1px solid ${active ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.08)"}`,
    cursor: "pointer" as const,
  });

  return (
    <div style={{ backgroundColor: "#09090f", minHeight: "100vh" }}>
      {/* ── Hero ── */}
      <div style={{ padding: "40px 32px 32px", maxWidth: "860px" }}>
        <h1 style={{
          fontFamily: "var(--font-sans)",
          fontSize: "clamp(28px, 4vw, 42px)",
          fontWeight: 700,
          color: "#F4F4F5",
          lineHeight: 1.2,
          marginBottom: "12px",
          letterSpacing: "-0.02em",
        }}>
          The people behind the night.
        </h1>
        <p style={{
          fontFamily: "var(--font-sans)",
          fontSize: "15px",
          color: "rgba(255,255,255,0.45)",
          lineHeight: 1.6,
          maxWidth: "480px",
          margin: 0,
        }}>
          Venues, DJs, sound engineers, photographers and studios. Everything you need to build your event or release your music.
        </p>
      </div>

      {/* ── Sticky filter bar ── */}
      <div
        className="sticky z-30 border-b"
        style={{
          top: "56px",
          backgroundColor: "rgba(9,9,15,0.94)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderColor: "rgba(255,255,255,0.06)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4">
          {/* Row 1: tab switcher + city dropdown */}
          <div className="flex items-center justify-between gap-4 py-3">
            <div className="flex gap-1.5 flex-shrink-0">
              {(["Plan Your Event", "For Artists"] as NetworkTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() =>
                    pushFilters({ tab, category: "", subcategory: "" })
                  }
                  className="text-xs px-4 py-2 rounded-lg font-semibold transition-all"
                  style={pillStyle(activeTab === tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            <select
              value={activeCity}
              onChange={(e) =>
                pushFilters({ city: e.target.value })
              }
              className="text-xs rounded-lg px-3 py-2 outline-none cursor-pointer flex-shrink-0"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: activeCity ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)",
                colorScheme: "dark",
                fontFamily: "var(--font-sans)",
              }}
            >
              <option value="">All Cities</option>
              {CITIES.slice(1).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Row 2: category pills */}
          <div className="flex items-center gap-2 pb-3 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() =>
                pushFilters({ category: "", subcategory: "" })
              }
              className="whitespace-nowrap text-xs px-4 py-1.5 rounded-full font-medium transition-all flex-shrink-0"
              style={pillStyle(!activeCategory)}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  pushFilters({
                    category: activeCategory === cat ? "" : cat,
                    subcategory: "",
                  })
                }
                className="whitespace-nowrap text-xs px-4 py-1.5 rounded-full font-medium transition-all flex-shrink-0"
                style={pillStyle(activeCategory === cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Row 3: subcategory chips (conditional) */}
          {activeCategory && subcategories.length > 0 && (
            <div className="flex items-center gap-2 pb-3 overflow-x-auto no-scrollbar">
              {subcategories.map((sub) => (
                <button
                  key={sub}
                  type="button"
                  onClick={() =>
                    pushFilters({
                      subcategory: activeSubcategory === sub ? "" : sub,
                    })
                  }
                  className="whitespace-nowrap text-xs px-3 py-1 rounded-md transition-all flex-shrink-0"
                  style={chipStyle(activeSubcategory === sub)}
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Result count + active filter labels */}
        <p className="text-xs mb-6" style={{ color: "rgba(255,255,255,0.3)" }}>
          {profiles.length} profile{profiles.length !== 1 ? "s" : ""}
          {activeCategory && (
            <>
              {" in "}
              <span style={{ color: AMBER }}>{activeCategory}</span>
            </>
          )}
          {activeSubcategory && (
            <>
              {" · "}
              <span style={{ color: AMBER }}>{activeSubcategory}</span>
            </>
          )}
          {activeCity && (
            <>
              {" · "}
              <span style={{ color: AMBER }}>{activeCity}</span>
            </>
          )}
        </p>

        {profiles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {profiles.map((p) => (
              <ProfileCard key={p.id} profile={p} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-xl font-semibold text-white mb-2">
              No profiles found
            </p>
            <p
              className="text-sm mb-8 max-w-xs"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              {hasFilters
                ? "No one matches these filters yet. Try a broader search."
                : "No profiles have joined the network yet."}
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={() =>
                  pushFilters({ category: "", subcategory: "", city: "" })
                }
                className="text-sm px-6 py-2.5 rounded-xl font-medium transition-opacity hover:opacity-80"
                style={{ backgroundColor: AMBER, color: "#09090f" }}
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
