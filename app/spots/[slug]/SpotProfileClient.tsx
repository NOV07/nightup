"use client";

import { useState } from "react";
import Link from "next/link";
import { spotPriceLabel, type Spot } from "../types";
import { spotCategoryLabel, spotSubLabel } from "../../lib/spotCategories";
import { useLanguage } from "../../components/LanguageContext";
import TranslatedText from "../../components/TranslatedText";
import CroppedImage from "../../../components/ui/CroppedImage";
import FollowButton from "../../../components/ui/FollowButton";
import SpotSaveButton from "../../../components/spots/SpotSaveButton";
import GalleryLightbox, { GalleryPlayBadge } from "../../../components/ui/GalleryLightbox";
import type { GalleryItem } from "../../lib/types";
import type { CropBox } from "../../../components/ui/CroppedImage";
import HostedEventCard, { type HostedEvent } from "../../../components/profile/HostedEventCard";
import ProfileListings, { type ProfileListing } from "../../../components/profile/ProfileListings";
import { normalizeInstagram } from "../../lib/instagram";

/** The owner account's profile, for the profile-style hero. */
export interface SpotOwner {
  id: string;
  username: string;
  avatarUrl: string | null;
  avatarCrop: CropBox | null;
}

type FullSpot = Spot & { gallery: GalleryItem[]; openingHours: Record<string, string> | null };

const PLACE = "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80";

// Opening-hours day keys and the "closed" marker are stored in Greek in the DB.
const DAY_EN: Record<string, string> = {
  "Δευτέρα": "Monday", "Τρίτη": "Tuesday", "Τετάρτη": "Wednesday", "Πέμπτη": "Thursday",
  "Παρασκευή": "Friday", "Σάββατο": "Saturday", "Κυριακή": "Sunday",
};

// Display order for the hours table. Unknown keys sort after Sunday, keeping their stored order.
const DAY_ORDER = Object.keys(DAY_EN);
const dayRank = (day: string) => {
  const i = DAY_ORDER.indexOf(day);
  return i === -1 ? DAY_ORDER.length : i;
};

export default function SpotProfileClient({ spot, owner = null, events = [], listings = [] }: { spot: FullSpot; owner?: SpotOwner | null; events?: HostedEvent[]; listings?: ProfileListing[] }) {
  const { t, lang } = useLanguage();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Every category (primary first), then the subcategories.
  const catLine = spot.categories.map((c) => spotCategoryLabel(c, lang)).join(" / ");
  const subLine = spot.subcategories.map((k) => spotSubLabel(k, lang)).join(", ");
  const taxonomyLabel = subLine ? `${catLine} · ${subLine}` : catLine;
  const cover = spot.coverImage || PLACE;
  // A stored crop was set against spot.coverImage — don't apply it to the PLACE fallback.
  const coverCrop = spot.coverImage ? spot.crop : null;
  const price = spotPriceLabel(spot, t("spots_price_per_person"));
  const instagram = normalizeInstagram(spot.instagram);
  const hours = spot.openingHours
    ? Object.entries(spot.openingHours).sort(([a], [b]) => dayRank(a) - dayRank(b))
    : [];
  const mapUrl = spot.lat && spot.lng
    ? `https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}`
    : spot.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(spot.address + " " + spot.city)}` : null;

  return (
    <div style={{ background: "#0F0F1A", minHeight: "100vh" }}>
      {owner ? (
        <>
          {/* Cover — same banner + overlapping avatar layout as /profile/[username] */}
          <div style={{ position: "relative", height: 240, overflow: "hidden" }}>
            <CroppedImage src={cover} alt={spot.name} crop={coverCrop} sizes="100vw" priority />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(15,15,26,0.45), transparent 35%, rgba(15,15,26,0.85))" }} />
            <Link href="/spots" style={{ position: "absolute", top: 20, left: 24, color: "#fff", fontSize: 14, fontWeight: 600, background: "rgba(0,0,0,0.4)", padding: "8px 14px", borderRadius: 6, backdropFilter: "blur(8px)" }}>‹ Spots</Link>
            {spot.isSponsored && (
              <span style={{ position: "absolute", left: 24, bottom: 16, background: "rgba(10,10,18,0.78)", color: "#E8A020", fontSize: 10, fontWeight: 700, letterSpacing: "0.6px", padding: "5px 10px", borderRadius: 4, border: "1px solid rgba(232,160,32,0.15)" }}>{t("spots_sponsored")}</span>
            )}
          </div>

          <div style={{ position: "relative", maxWidth: "56rem", margin: "0 auto", padding: "0 24px", marginTop: -48 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 20, marginBottom: 14 }}>
              {/* Avatar: square with gold border, initial as fallback (as on the profile page) */}
              <div style={{ position: "relative", flexShrink: 0, width: 96, height: 96, borderRadius: 16, border: "3px solid #E8A020", overflow: "hidden", backgroundColor: "#1A1A2E" }}>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 700, color: "#E8A020" }}>
                  {(spot.name[0] ?? "?").toUpperCase()}
                </div>
                {owner.avatarUrl && (
                  <CroppedImage src={owner.avatarUrl} alt={spot.name} crop={owner.avatarCrop} sizes="96px" />
                )}
              </div>

              <div style={{ minWidth: 0, paddingBottom: 6 }}>
                <div style={{ fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "#E8A020", fontWeight: 700 }}>
                  {taxonomyLabel}
                </div>
                <h1 style={{ fontFamily: "var(--font-spectral),serif", fontWeight: 700, fontSize: "clamp(26px, 7vw, 40px)", letterSpacing: "-1px", marginTop: 6, lineHeight: 1.05, overflowWrap: "anywhere" }}>{spot.name}</h1>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", overflowWrap: "anywhere" }}>@{owner.username}</span>
                  <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 99, backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}>{t("spots_profile_badge")}</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, fontSize: 14, color: "#A1A1AA" }}>
              {spot.rating != null && <span style={{ color: "#E8A020", fontWeight: 600 }}>★ {spot.rating}</span>}
              {price && <span>{price}</span>}
              {spot.neighborhood && <span>📍 {spot.neighborhood}</span>}
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginTop: 16 }}>
              <FollowButton profileId={owner.id} showCount />
              <SpotSaveButton spotId={String(spot.id)} />
            </div>
          </div>
        </>
      ) : (
        /* No owner account: the original cover hero */
        <div style={{ position: "relative", height: 340, overflow: "hidden" }}>
          <CroppedImage src={cover} alt={spot.name} crop={coverCrop} sizes="100vw" priority />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0F0F1A, rgba(15,15,26,0.3) 55%, rgba(15,15,26,0.5))" }} />
          <div style={{ position: "relative", maxWidth: "56rem", margin: "0 auto", padding: "0 24px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 28 }}>
            <Link href="/spots" style={{ position: "absolute", top: 20, left: 24, color: "#fff", fontSize: 14, fontWeight: 600, background: "rgba(0,0,0,0.4)", padding: "8px 14px", borderRadius: 6, backdropFilter: "blur(8px)" }}>‹ Spots</Link>
            {spot.isSponsored && (
              <span style={{ alignSelf: "flex-start", marginBottom: 12, background: "rgba(10,10,18,0.78)", color: "#E8A020", fontSize: 10, fontWeight: 700, letterSpacing: "0.6px", padding: "5px 10px", borderRadius: 4, border: "1px solid rgba(232,160,32,0.15)" }}>{t("spots_sponsored")}</span>
            )}
            <div style={{ fontSize: 11, letterSpacing: "2.5px", textTransform: "uppercase", color: "#E8A020", fontWeight: 700 }}>
              {taxonomyLabel}
            </div>
            <h1 style={{ fontFamily: "var(--font-spectral),serif", fontWeight: 700, fontSize: 44, letterSpacing: "-1.2px", marginTop: 8, lineHeight: 1 }}>{spot.name}</h1>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, marginTop: 14, fontSize: 14, color: "#A1A1AA" }}>
              {spot.rating != null && <span style={{ color: "#E8A020", fontWeight: 600 }}>★ {spot.rating}</span>}
              {price && <span>{price}</span>}
              {spot.neighborhood && <span>📍 {spot.neighborhood}</span>}
            </div>
            <div style={{ marginTop: 16 }}>
              <SpotSaveButton spotId={String(spot.id)} />
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: "56rem", margin: "0 auto", padding: "32px 24px 80px", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 28 }}>
        {/* Description */}
        {spot.description && (
          <p style={{ fontSize: 16, lineHeight: 1.65, color: "#D4D4D8", maxWidth: 640, minWidth: 0, overflowWrap: "anywhere", whiteSpace: "pre-line" }}><TranslatedText text={spot.description} /></p>
        )}

        {/* Gallery */}
        {spot.gallery && spot.gallery.length > 0 && (
          <div>
            <h2 style={sectionTitle}>{t("spots_gallery")}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 12, marginTop: 14 }}>
              {spot.gallery.map((g, i) => {
                const thumb = g.type === "video" ? g.poster : g.url;
                return (
                  <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    aria-label={`${g.type === "video" ? t("media_video") : t("media_photo")} ${i + 1}`}
                    onClick={() => setLightboxIndex(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setLightboxIndex(i); }
                    }}
                    style={{ position: "relative", cursor: "pointer", height: 130, borderRadius: 6, backgroundImage: thumb ? `url('${thumb}')` : undefined, backgroundColor: thumb ? undefined : "rgba(255,255,255,0.06)", backgroundSize: "cover", backgroundPosition: "center" }}
                  >
                    {g.type === "video" && <GalleryPlayBadge size={38} />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 14 }}>
          {spot.address && <InfoCard label={t("spots_address")} value={spot.address} />}
          {spot.phone && <InfoCard label={t("spots_phone")} value={spot.phone} href={`tel:${spot.phone}`} />}
          {spot.website && <InfoCard label="Website" value={spot.website.replace(/^https?:\/\//, "")} href={spot.website} />}
          {instagram && <InfoCard label="Instagram" value={`@${instagram}`} href={`https://instagram.com/${instagram}`} />}
        </div>

        {/* Opening hours */}
        {hours.length > 0 && (
          <div>
            <h2 style={sectionTitle}>{t("spots_hours")}</h2>
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6, maxWidth: 320 }}>
              {hours.map(([day, hrs]) => (
                <div key={day} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#A1A1AA", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span>{lang === "en" ? DAY_EN[day] ?? day : day}</span><span style={{ color: "#F4F4F5" }}>{lang === "en" && String(hrs) === "Κλειστά" ? "Closed" : String(hrs)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming events + listings published by the spot's owner */}
        {events.length > 0 && (
          <div>
            <h2 style={sectionTitle}>{t("spots_upcoming_events")}</h2>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              {events.map((e) => <HostedEventCard key={e.id} event={e} />)}
            </div>
          </div>
        )}
        <ProfileListings listings={listings} />

        {/* Map button */}
        {mapUrl && (
          <a href={mapUrl} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, background: "linear-gradient(100deg,#E8A020,#F5B335)", color: "#1a1407", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 15, padding: "14px 24px", borderRadius: 6, maxWidth: 280, boxShadow: "0 12px 30px rgba(232,160,32,0.25)" }}>
            {t("spots_map")}
          </a>
        )}
      </div>

      {lightboxIndex !== null && (
        <GalleryLightbox items={spot.gallery} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontFamily: "var(--font-spectral),serif", fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "#F4F4F5",
};

function InfoCard({ label, value, href }: { label: string; value: string; href?: string }) {
  const inner = (
    <div style={{ background: "#1A1A28", border: "1px solid rgba(255,255,255,0.055)", borderRadius: 6, padding: "14px 16px" }}>
      <div style={{ fontSize: 11, letterSpacing: "1px", textTransform: "uppercase", color: "#71717A", fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 14.5, color: href ? "#E8A020" : "#F4F4F5", marginTop: 6, wordBreak: "break-word" }}>{value}</div>
    </div>
  );
  return href ? <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a> : inner;
}
