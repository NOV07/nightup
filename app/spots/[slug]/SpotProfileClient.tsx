"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { spotPriceLabel, type Spot } from "../types";
import { spotCategoryLabel, spotSubLabel } from "../../lib/spotCategories";
import { useLanguage } from "../../components/LanguageContext";
import TranslatedText from "../../components/TranslatedText";
import CroppedImage from "../../../components/ui/CroppedImage";
import FollowButton from "../../../components/ui/FollowButton";
import SpotSaveButton from "../../../components/spots/SpotSaveButton";
import GalleryLightbox from "../../../components/ui/GalleryLightbox";
import type { GalleryItem } from "../../lib/types";
import type { CropBox } from "../../../components/ui/CroppedImage";
import HostedEventCard, { type HostedEvent } from "../../../components/profile/HostedEventCard";
import ProfileListings, { type ProfileListing } from "../../../components/profile/ProfileListings";
import { normalizeInstagram } from "../../lib/instagram";
import { spotMapUrl } from "../../lib/spotMapUrl";
import { getEventCoverImage, getEventCrop } from "../../lib/getEventCoverImage";
import { athensDayName, openNowInfo } from "../../lib/spotOpenNow";
import SpotMosaic from "./SpotMosaic";
import SpotPills from "./SpotPills";

// Leaflet touches window: client only.
const SpotMiniMap = dynamic(() => import("./SpotMiniMap"), { ssr: false });

/** The owner account's profile, for the profile-style header. */
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

const CSS = `
.sp-wrap { max-width: 72rem; margin: 0 auto; padding: 16px 16px 0; }
.sp-body { max-width: 72rem; margin: 0 auto; padding: 24px 16px 80px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
.sp-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 14px 20px; margin-top: 20px; margin-bottom: 18px; }
.sp-head-main { display: flex; align-items: flex-end; gap: 16px; min-width: 0; }
.sp-avatar { position: relative; flex-shrink: 0; width: 64px; height: 64px; border-radius: 14px; border: 3px solid #E8A020; overflow: hidden; background: #1A1A28; }
.sp-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
.sp-two { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
.sp-card { background: #1A1A28; border: 1px solid rgba(255,255,255,0.055); border-radius: 10px; padding: 20px; min-width: 0; }
.sp-eyebrow { font-size: 11px; letter-spacing: 1.4px; text-transform: uppercase; color: #E8A020; font-weight: 700; }
.sp-next { position: relative; overflow: hidden; border-radius: 10px; min-height: 260px; background: #1A1A28; border: 1px solid rgba(255,255,255,0.055); }
.sp-cta { display: inline-flex; align-items: center; justify-content: center; background: linear-gradient(100deg,#E8A020,#F5B335); color: #1a1407; font-weight: 700; font-size: 14px; padding: 11px 20px; border-radius: 6px; text-decoration: none; }
.sp-cta:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
@media (min-width: 700px) {
  .sp-wrap { padding: 20px 24px 0; }
  .sp-body { padding: 28px 24px 80px; gap: 20px; }
  .sp-avatar { width: 96px; height: 96px; border-radius: 16px; }
  .sp-next { min-height: 300px; }
}
@media (min-width: 900px) {
  .sp-head { flex-wrap: nowrap; }
  .sp-two.both { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
}
`;

export default function SpotProfileClient({ spot, owner = null, events = [], pastEvents = [], listings = [] }: { spot: FullSpot; owner?: SpotOwner | null; events?: HostedEvent[]; pastEvents?: HostedEvent[]; listings?: ProfileListing[] }) {
  const { t, lang } = useLanguage();
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // Computed after mount so server and client markup match; null until then.
  const [clock, setClock] = useState<{ today: string; open: { until: string | null } | null } | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock({ today: athensDayName(now), open: openNowInfo(spot.openingHours, now) });
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [spot.openingHours]);

  // Every category (primary first), then the subcategories.
  const catLine = spot.categories.map((c) => spotCategoryLabel(c, lang)).join(" / ");
  const subLine = spot.subcategories.map((k) => spotSubLabel(k, lang)).join(", ");
  const taxonomyLabel = subLine ? `${catLine} · ${subLine}` : catLine;
  const cover = spot.coverImage || PLACE;
  // A stored crop was set against spot.coverImage — don't apply it to the PLACE fallback.
  const coverCrop = spot.coverImage ? spot.crop ?? null : null;
  const price = spotPriceLabel(spot, t("spots_price_per_person"));
  const instagram = normalizeInstagram(spot.instagram);
  const hours = spot.openingHours
    ? Object.entries(spot.openingHours).sort(([a], [b]) => dayRank(a) - dayRank(b))
    : [];
  const mapUrl = spotMapUrl(spot);
  const hasCoords = typeof spot.lat === "number" && typeof spot.lng === "number" && Number.isFinite(spot.lat) && Number.isFinite(spot.lng);
  // Lightbox order: the cover first (a real one only, never the placeholder), then the gallery.
  // A cover that is also a gallery photo is not added twice; it opens that photo.
  const gallery = spot.gallery ?? [];
  const coverInGallery = spot.coverImage ? gallery.findIndex((g) => g.url === spot.coverImage) : -1;
  const prependCover = !!spot.coverImage && coverInGallery === -1;
  const lightboxItems: GalleryItem[] = prependCover ? [{ url: spot.coverImage as string, type: "image" }, ...gallery] : gallery;
  const coverIndex = !spot.coverImage ? null : prependCover ? 0 : coverInGallery;
  const [nextEvent, ...moreEvents] = events;
  const dateLocale = lang === "en" ? "en-GB" : "el-GR";

  return (
    <div style={{ background: "#0F0F1A", minHeight: "100vh" }}>
      <style>{CSS}</style>

      <div className="sp-wrap">
        <SpotMosaic cover={cover} coverCrop={coverCrop} name={spot.name} gallery={gallery} total={lightboxItems.length} coverIndex={coverIndex} offset={prependCover ? 1 : 0} sponsored={!!spot.isSponsored} onOpen={setLightboxIndex} />

        {/* Header */}
        <div className="sp-head">
          <div className="sp-head-main">
            {owner && (
              <div className="sp-avatar">
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: "#E8A020" }}>
                  {(spot.name[0] ?? "?").toUpperCase()}
                </div>
                {owner.avatarUrl && <CroppedImage src={owner.avatarUrl} alt={spot.name} crop={owner.avatarCrop} sizes="96px" />}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, letterSpacing: "2px", textTransform: "uppercase", color: "#E8A020", fontWeight: 700 }}>{taxonomyLabel}</div>
              <h1 style={{ fontFamily: "var(--font-spectral),serif", fontWeight: 700, fontSize: "clamp(26px, 6vw, 40px)", letterSpacing: "-1px", marginTop: 6, lineHeight: 1.05, overflowWrap: "anywhere" }}>{spot.name}</h1>
              {owner && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", overflowWrap: "anywhere" }}>@{owner.username}</span>
                  <span style={{ fontSize: 12, padding: "2px 8px", borderRadius: 99, backgroundColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}>{t("spots_profile_badge")}</span>
                </div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 14px", marginTop: 10, fontSize: 14, color: "#A1A1AA" }}>
                {spot.rating != null && <span style={{ color: "#E8A020", fontWeight: 600 }}>★ {spot.rating}</span>}
                {price && <span>{price}</span>}
                {spot.neighborhood && <span>📍 {spot.neighborhood}</span>}
                {clock?.open && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#D4D4D8" }}>
                    <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: "#34D399", boxShadow: "0 0 0 3px rgba(52,211,153,0.18)" }} />
                    {t("spots_open_now")}{clock.open.until ? ` · ${t("spots_open_until")} ${clock.open.until}` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="sp-actions">
            {owner && <FollowButton profileId={owner.id} showCount />}
            <SpotSaveButton spotId={String(spot.id)} />
          </div>
        </div>

        <SpotPills mapUrl={mapUrl} address={spot.address || null} phone={spot.phone || null} website={spot.website || null} instagram={instagram} />
      </div>

      <div className="sp-body">
        {/* a. Next event, then the rest of the upcoming ones */}
        {nextEvent && (
          <div className="sp-next">
            <CroppedImage src={getEventCoverImage(nextEvent)} alt="" crop={getEventCrop(nextEvent)} sizes="(min-width: 1200px) 1100px, 100vw" />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,15,26,0.95), rgba(15,15,26,0.35) 60%, rgba(15,15,26,0.5))" }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 20, display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 14 }}>
              <div style={{ minWidth: 0 }}>
                <div className="sp-eyebrow">{t("spots_next_event")}</div>
                <h2 style={{ fontFamily: "var(--font-spectral),serif", fontWeight: 700, fontSize: "clamp(22px, 4vw, 30px)", lineHeight: 1.1, marginTop: 6, color: "#fff", overflowWrap: "anywhere" }}>{nextEvent.title}</h2>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", marginTop: 6 }}>
                  {new Date(nextEvent.date).toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" })}{nextEvent.time ? ` · ${nextEvent.time}` : ""}
                </p>
              </div>
              <Link href={`/events/${nextEvent.id}`} className="sp-cta" aria-label={`${t("spots_see_event")}: ${nextEvent.title}`}>{t("spots_see_event")}</Link>
            </div>
          </div>
        )}
        {moreEvents.length > 0 && (
          <div>
            <h2 style={sectionTitle}>{t("spots_upcoming_events")}</h2>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              {moreEvents.map((e) => <HostedEventCard key={e.id} event={e} />)}
            </div>
          </div>
        )}

        {/* b. Description */}
        {spot.description && (
          <div className="sp-card">
            <p style={{ fontSize: 16, lineHeight: 1.65, color: "#D4D4D8", overflowWrap: "anywhere", whiteSpace: "pre-line" }}><TranslatedText text={spot.description} /></p>
          </div>
        )}

        {/* c. Hours + map */}
        {(hours.length > 0 || mapUrl) && (
          <div className={`sp-two${hours.length > 0 && mapUrl ? " both" : ""}`}>
            {hours.length > 0 && (
              <div className="sp-card">
                <h2 style={sectionTitle}>{t("spots_hours")}</h2>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 2 }}>
                  {hours.map(([day, hrs]) => {
                    const isToday = clock?.today === day;
                    return (
                      <div key={day} aria-current={isToday ? "date" : undefined}
                        style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14, padding: "7px 8px", borderRadius: 6, color: isToday ? "#E8A020" : "#A1A1AA", fontWeight: isToday ? 700 : 400, background: isToday ? "rgba(232,160,32,0.08)" : undefined }}>
                        <span>{lang === "en" ? DAY_EN[day] ?? day : day}</span>
                        <span style={{ color: isToday ? "#F5B335" : "#F4F4F5" }}>{lang === "en" && String(hrs) === "Κλειστά" ? "Closed" : String(hrs)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {mapUrl && (
              <div style={{ position: "relative", isolation: "isolate", minHeight: 280, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.055)", background: "#1A1A28" }}>
                {hasCoords && <SpotMiniMap lat={spot.lat as number} lng={spot.lng as number} label={spot.address || spot.name} />}
                <div style={{ position: "relative", zIndex: 1100, pointerEvents: "none", padding: 16, background: hasCoords ? "linear-gradient(to bottom, rgba(15,15,26,0.92), rgba(15,15,26,0))" : undefined, paddingBottom: hasCoords ? 36 : 16 }}>
                  {spot.address && <p style={{ fontSize: 14.5, color: "#F4F4F5", overflowWrap: "anywhere", marginBottom: 10 }}>{spot.address}</p>}
                  <a href={mapUrl} target="_blank" rel="noopener noreferrer" aria-label={`${t("spots_open_in_maps")} ${spot.name}`}
                    style={{ pointerEvents: "auto", display: "inline-flex", color: "#E8A020", fontWeight: 700, fontSize: 14, background: "rgba(15,15,26,0.8)", border: "1px solid rgba(232,160,32,0.35)", padding: "8px 14px", borderRadius: 6 }}>
                    {t("spots_open_in_maps")}
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* d. Past events */}
        {pastEvents.length > 0 && (
          <div>
            <h2 style={sectionTitle}>{t("spots_past_events")}</h2>
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
              {pastEvents.map((e) => <HostedEventCard key={e.id} event={e} hideTicket />)}
            </div>
          </div>
        )}

        {/* e. Listings published by the spot's owner */}
        <ProfileListings listings={listings} />
      </div>

      {lightboxIndex !== null && (
        <GalleryLightbox items={lightboxItems} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  );
}

const sectionTitle: React.CSSProperties = {
  fontFamily: "var(--font-spectral),serif", fontWeight: 600, fontSize: 22, letterSpacing: "-0.4px", color: "#F4F4F5",
};
