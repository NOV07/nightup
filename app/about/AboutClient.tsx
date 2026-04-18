"use client";

import { useState, useRef, useEffect } from "react";
import type { LiveStats } from "./page";
import { useLanguage } from "../components/LanguageContext";

const socials = [
  {
    label: "Instagram", handle: "@nightup.gr", href: "https://instagram.com/nightup.gr",
    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>,
  },
  {
    label: "Facebook", handle: "Nightup.gr", href: "https://facebook.com/nightup.gr",
    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
  },
  {
    label: "TikTok", handle: "@nightup.gr", href: "https://tiktok.com/@nightup.gr",
    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.93a8.16 8.16 0 004.77 1.52V7.01a4.85 4.85 0 01-1-.32z" /></svg>,
  },
  {
    label: "Threads", handle: "@nightup.gr", href: "https://threads.net/@nightup.gr",
    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.5 12.01c0-3.313.866-5.896 2.744-8.103C6.07 1.778 8.748.503 12.172.503c3.304 0 5.939 1.218 7.856 3.62 1.82 2.277 2.682 5.147 2.473 8.516l-.027.433H6.044c.039 1.917.518 3.527 1.418 4.782.89 1.243 2.076 1.874 3.525 1.874.997 0 1.854-.247 2.545-.736.68-.483 1.278-1.263 1.778-2.319l.209-.449 3.685 1.641-.198.424c-.74 1.585-1.729 2.839-2.941 3.727-1.241.912-2.741 1.504-4.879 1.504zm.028-20.984c-2.666 0-4.761.832-6.227 2.472-1.202 1.343-1.947 3.082-2.265 5.286h16.03c-.166-2.146-.827-3.871-1.977-5.125-1.256-1.364-3.027-2.633-5.561-2.633z"/></svg>,
  },
  {
    label: "Discord", handle: "nightup", href: "https://discord.gg/nightup",
    icon: <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>,
  },
];

const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE_MB = 2;

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Count-up hook ──────────────────────────────────────────────
function useCountUp(target: number, duration = 1400) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const ran = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || ran.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || ran.current) return;
        ran.current = true;
        const start = performance.now();
        function tick(now: number) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          // Ease out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

function StatCard({
  label, icon, target, suffix = "", prefix = "",
}: {
  label: string;
  icon: string;
  target: number;
  suffix?: string;
  prefix?: string;
}) {
  const { count, ref } = useCountUp(target);
  return (
    <div
      ref={ref}
      className="text-center p-6 rounded-2xl"
      style={{ backgroundColor: "#111120", border: "1px solid rgba(232,160,32,0.12)" }}
    >
      <div className="text-3xl mb-2">{icon}</div>
      <div className="text-2xl font-bold mb-1 tabular-nums" style={{ color: "#E8A020" }}>
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div className="text-xs text-gray-400">{label}</div>
    </div>
  );
}

const MUSIC_GENRES_LIST = ["House", "Techno", "Deep House", "R&B", "Hip-Hop", "Other"];

function SubmitMusicSection() {
  const [form, setForm] = useState({
    artist_name: "", email: "", title: "", type: "Single", genre: "House",
    description: "", spotify_url: "", soundcloud_url: "", bandcamp_url: "",
  });
  const [coverImage, setCoverImage] = useState<string>("");
  const [coverError, setCoverError] = useState("");
  const coverRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setCoverError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setCoverError("Image must be under 5MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setCoverImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "music_releases",
          data: {
            title: form.title,
            artist: form.artist_name,
            type: form.type,
            genre: form.genre,
            description: form.description || null,
            spotify_url: form.spotify_url || null,
            soundcloud_url: form.soundcloud_url || null,
            cover_image: coverImage || null,
            status: "pending",
          },
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error ?? "Submission failed. Please try again.");
        return;
      }
      setSubmitted(true);
      setForm({ artist_name: "", email: "", title: "", type: "Single", genre: "House", description: "", spotify_url: "", soundcloud_url: "", bandcamp_url: "" });
      setCoverImage("");
      if (coverRef.current) coverRef.current.value = "";
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full px-4 py-3 rounded-xl outline-none text-sm focus-gold";
  const inputStyle = { backgroundColor: "#0d0d1a", color: "#fff", border: "1px solid rgba(232,160,32,0.15)" };
  const labelCls = "block text-xs text-gray-400 mb-1";

  return (
    <section className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="section-divider" />
          <h2 className="text-2xl font-bold tracking-tight">Submit Your Music</h2>
        </div>
        <p className="text-gray-400 text-sm">Are you an artist? Get your music on Nightup.</p>
      </div>

      {submitted ? (
        <div className="p-6 rounded-2xl text-center" style={{ backgroundColor: "#0F1F0F", border: "1px solid #20E860" }}>
          <p className="text-lg font-semibold mb-2" style={{ color: "#20E860" }}>Submission received!</p>
          <p className="text-sm text-gray-400">Your submission has been received! We&apos;ll review it and get back to you.</p>
          <button
            onClick={() => setSubmitted(false)}
            className="mt-4 text-xs px-4 py-2 rounded-lg"
            style={{ backgroundColor: "#111120", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(232,160,32,0.12)" }}
          >
            Submit another
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-2xl" style={{ backgroundColor: "#111120", border: "1px solid #1e1e30" }}>
          {error && (
            <div className="p-3 rounded-xl text-sm text-center" style={{ backgroundColor: "#2E1A1A", color: "#E86020", border: "1px solid #E86020" }}>
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Artist Name *</label>
              <input required type="text" value={form.artist_name} onChange={set("artist_name")} placeholder="Your artist name" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls}>Email *</label>
              <input required type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls}>Release Title *</label>
              <input required type="text" value={form.title} onChange={set("title")} placeholder="Track or release name" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls}>Type *</label>
              <select required value={form.type} onChange={set("type")} className={inputCls} style={inputStyle}>
                {["Single", "EP", "Album"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Genre *</label>
              <select required value={form.genre} onChange={set("genre")} className={inputCls} style={inputStyle}>
                {MUSIC_GENRES_LIST.map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Description (optional)</label>
            <textarea value={form.description} onChange={set("description")} placeholder="Tell us about this release..." rows={3} className={`${inputCls} resize-none`} style={inputStyle} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest pt-1" style={{ color: "#666" }}>Links (optional)</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Spotify URL</label>
              <input type="text" value={form.spotify_url} onChange={set("spotify_url")} placeholder="https://open.spotify.com/..." className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls}>SoundCloud URL</label>
              <input type="text" value={form.soundcloud_url} onChange={set("soundcloud_url")} placeholder="https://soundcloud.com/..." className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className={labelCls}>Bandcamp URL</label>
              <input type="text" value={form.bandcamp_url} onChange={set("bandcamp_url")} placeholder="https://yourname.bandcamp.com/..." className={inputCls} style={inputStyle} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Cover Image (optional, max 5MB)</label>
            <div
              className="w-full px-4 py-3 rounded-xl text-sm cursor-pointer"
              style={{ backgroundColor: "#0d0d1a", border: "1px dashed rgba(232,160,32,0.25)" }}
              onClick={() => coverRef.current?.click()}
            >
              <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={handleCover} />
              <p className="text-gray-400 text-center text-sm">
                {coverImage ? "Image selected — click to change" : "Click to upload cover art"}
              </p>
            </div>
            {coverError && <p className="text-xs mt-1" style={{ color: "#E86020" }}>{coverError}</p>}
            {coverImage && (
              <div className="mt-2 flex items-center gap-3">
                <img src={coverImage} alt="Cover preview" className="w-16 h-16 rounded-xl object-cover" />
                <button
                  type="button"
                  onClick={() => { setCoverImage(""); if (coverRef.current) coverRef.current.value = ""; }}
                  className="text-xs px-2 py-1 rounded-lg"
                  style={{ backgroundColor: "#0F0F1A", color: "#E86020", border: "1px solid #E86020" }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
          >
            {submitting ? "Submitting..." : "Submit Release"}
          </button>
        </form>
      )}
    </section>
  );
}

export default function AboutClient({ liveStats }: { liveStats: LiveStats }) {
  const { t } = useLanguage();
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [eventForm, setEventForm] = useState({
    title: "", venue: "", date: "", time: "", city: "", genre: "", contact: "",
    instagram: "", facebook: "", tiktok: "", website: "",
  });
  const [profileForm, setProfileForm] = useState({
    name: "", category: "", location: "", bio: "", contact: "",
    instagram: "", facebook: "", tiktok: "", website: "",
  });
  const [eventPhoto, setEventPhoto] = useState<string>("");
  const [eventPhotoError, setEventPhotoError] = useState("");
  const eventPhotoRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"contact" | "event" | "profile">("contact");
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Track visit once per session
  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    fetch("/api/track-visit", { method: "POST" }).catch(() => {});
  }, []);

  const handleEventPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setEventPhotoError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setEventPhotoError("Photo must be under 5MB.");
      return;
    }
    setEventPhoto(await readFileAsBase64(file));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError("");
    const files = Array.from(e.target.files ?? []);
    if (photos.length + files.length > MAX_PHOTOS) {
      setPhotoError(`Max ${MAX_PHOTOS} photos allowed.`);
      return;
    }
    const oversized = files.find((f) => f.size > MAX_PHOTO_SIZE_MB * 1024 * 1024);
    if (oversized) {
      setPhotoError(`Each photo must be under ${MAX_PHOTO_SIZE_MB}MB.`);
      return;
    }
    const bases = await Promise.all(files.map(readFileAsBase64));
    setPhotos((prev) => [...prev, ...bases].slice(0, MAX_PHOTOS));
  };

  const removePhoto = (i: number) => setPhotos((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    try {
      if (activeTab === "event") {
        const { contact, ...rest } = eventForm;
        const res = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table: "events",
            data: {
              title: rest.title,
              venue: rest.venue,
              date: rest.date,
              time: rest.time || null,
              city: rest.city,
              genre: rest.genre,
              contact_email: contact,
              instagram: rest.instagram || null,
              facebook: rest.facebook || null,
              tiktok: rest.tiktok || null,
              website: rest.website || null,
              image_url: eventPhoto || null,
            },
          }),
        });
        if (!res.ok) {
          const json = await res.json();
          setSubmitError(json.error ?? "Submission failed. Please try again.");
          return;
        }
      } else if (activeTab === "profile") {
        const res = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table: "professionals",
            data: {
              name: profileForm.name,
              category: profileForm.category,
              location: profileForm.location,
              description: profileForm.bio,
              contact: profileForm.contact,
              instagram: profileForm.instagram || null,
              facebook: profileForm.facebook || null,
              tiktok: profileForm.tiktok || null,
              website: profileForm.website || null,
              photos: photos.length > 0 ? photos : null,
            },
          }),
        });
        if (!res.ok) {
          const json = await res.json();
          setSubmitError(json.error ?? "Submission failed. Please try again.");
          return;
        }
      }
    } catch {
      setSubmitError("Network error. Please try again.");
      return;
    }
    setSubmitted(true);
    setEventPhoto("");
    if (eventPhotoRef.current) eventPhotoRef.current.value = "";
    setPhotos([]);
    if (photoInputRef.current) photoInputRef.current.value = "";
    setTimeout(() => setSubmitted(false), 6000);
  };

  return (
    <div>
      {/* Hero */}
      <section
        className="py-20 text-center px-4"
        style={{ background: "linear-gradient(180deg, #0a0a14 0%, #0F0F1A 100%)" }}
      >
        <div className="flex items-baseline justify-center gap-1 mb-4">
          <span className="font-thin tracking-[0.3em] text-5xl uppercase">Night</span>
          <span className="font-thin tracking-[0.3em] text-5xl uppercase" style={{ color: "#E8A020" }}>up</span>
        </div>
        <p className="tracking-[0.5em] uppercase text-gray-400 mb-8 text-sm">{t("home_tagline")}</p>
        <p className="text-xl md:text-2xl font-semibold text-white max-w-2xl mx-auto mb-4 leading-snug">
          {t("about_hero_title")}
        </p>
        <p className="text-gray-300 max-w-2xl mx-auto text-base leading-relaxed">
          {t("about_hero_body")}
        </p>
      </section>

      {/* Stats — live data with count-up animation */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Events Listed" icon="🎉" target={liveStats.events} suffix="+" />
          <StatCard label="Professionals" icon="🎧" target={liveStats.professionals} suffix="+" />
          <StatCard label="Cities Covered" icon="🌆" target={liveStats.cities} />
          <StatCard
            label="Monthly Visitors"
            icon="👥"
            target={liveStats.visitors}
            suffix={liveStats.visitors >= 1000 ? "+" : ""}
          />
        </div>
      </section>

      {/* Social Links */}
      <section className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="section-divider" />
          <h2 className="text-xl font-bold tracking-tight">Follow Us</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl transition-opacity hover:opacity-80 card-hover"
              style={{ backgroundColor: "#111120", border: "1px solid rgba(232,160,32,0.12)", color: "#E8A020" }}
            >
              {s.icon}
              <div>
                <p className="text-xs font-semibold text-white">{s.label}</p>
                <p className="text-xs text-gray-400">{s.handle}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Forms Section */}
      <section className="max-w-2xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold text-center mb-8">{t("about_get_in_touch")}</h2>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden mb-6" style={{ backgroundColor: "#111120", border: "1px solid rgba(232,160,32,0.12)" }}>
          {(["contact", "event", "profile"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-3 text-sm font-medium capitalize transition-all"
              style={{
                backgroundColor: activeTab === tab ? "#E8A020" : "transparent",
                color: activeTab === tab ? "#0F0F1A" : "#aaa",
              }}
            >
              {tab === "contact" ? t("about_contact_tab") : tab === "event" ? t("about_event_tab") : t("about_profile_tab")}
            </button>
          ))}
        </div>

        {submitted && (
          <div
            className="mb-6 p-4 rounded-xl text-center text-sm font-medium"
            style={{ backgroundColor: "#1A2E1A", border: "1px solid #20E860", color: "#20E860" }}
          >
            Η αίτησή σας υποβλήθηκε επιτυχώς! Θα επικοινωνήσουμε μαζί σας σύντομα.
          </div>
        )}
        {submitError && (
          <div
            className="mb-6 p-4 rounded-xl text-center text-sm font-medium"
            style={{ backgroundColor: "#2E1A1A", border: "1px solid #E86020", color: "#E86020" }}
          >
            {submitError}
          </div>
        )}

        {/* Contact Form */}
        {activeTab === "contact" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: "Your Name", key: "name", type: "text", placeholder: "Kostas Papadopoulos" },
              { label: "Email", key: "email", type: "email", placeholder: "kostas@example.com" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <input
                  type={type}
                  placeholder={placeholder}
                  value={contactForm[key as keyof typeof contactForm]}
                  onChange={(e) => setContactForm((f) => ({ ...f, [key]: e.target.value }))}
                  required
                  className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: "#0d0d1a", color: "#fff", border: "1px solid rgba(232,160,32,0.15)" }}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Message</label>
              <textarea
                placeholder="How can we help you?"
                value={contactForm.message}
                onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))}
                required
                rows={5}
                className="w-full px-4 py-3 rounded-xl outline-none text-sm resize-none"
                style={{ backgroundColor: "#0d0d1a", color: "#fff", border: "1px solid rgba(232,160,32,0.15)" }}
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
            >
              Send Message
            </button>
          </form>
        )}

        {/* Event Form */}
        {activeTab === "event" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: "Event Title *", key: "title", placeholder: "Amazing Techno Night", required: true },
              { label: "Venue", key: "venue", placeholder: "Fuzz Club", required: false },
              { label: "City", key: "city", placeholder: "Athens", required: false },
              { label: "Genre", key: "genre", placeholder: "Techno, House, etc.", required: false },
              { label: "Your Contact", key: "contact", placeholder: "email@example.com", required: false },
            ].map(({ label, key, placeholder, required }) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={eventForm[key as keyof typeof eventForm]}
                  onChange={(e) => setEventForm((f) => ({ ...f, [key]: e.target.value }))}
                  required={required}
                  className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: "#0d0d1a", color: "#fff", border: "1px solid rgba(232,160,32,0.15)" }}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Event Date *</label>
              <input
                type="date"
                value={eventForm.date}
                onChange={(e) => setEventForm((f) => ({ ...f, date: e.target.value }))}
                required
                className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                style={{ backgroundColor: "#0d0d1a", color: "#fff", border: "1px solid rgba(232,160,32,0.15)" }}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Ώρα Έναρξης</label>
              <input
                type="time"
                value={eventForm.time}
                onChange={(e) => setEventForm((f) => ({ ...f, time: e.target.value }))}
                placeholder="23:00"
                className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                style={{ backgroundColor: "#0d0d1a", color: "#fff", border: "1px solid rgba(232,160,32,0.15)" }}
              />
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-2">Social Media (optional)</p>
            {[
              { label: "Instagram", key: "instagram", placeholder: "https://instagram.com/yourevent" },
              { label: "Facebook", key: "facebook", placeholder: "https://facebook.com/yourevent" },
              { label: "TikTok", key: "tiktok", placeholder: "https://tiktok.com/@yourevent" },
              { label: "Website", key: "website", placeholder: "https://yourevent.com" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={eventForm[key as keyof typeof eventForm]}
                  onChange={(e) => setEventForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: "#0d0d1a", color: "#fff", border: "1px solid rgba(232,160,32,0.15)" }}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Event Photo (optional, max 5MB)</label>
              <div
                className="w-full px-4 py-3 rounded-xl text-sm cursor-pointer"
                style={{ backgroundColor: "#0d0d1a", border: "1px dashed rgba(232,160,32,0.25)" }}
                onClick={() => eventPhotoRef.current?.click()}
              >
                <input
                  ref={eventPhotoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleEventPhotoChange}
                />
                <p className="text-gray-400 text-center">
                  {eventPhoto ? "Photo selected — click to change" : "Click to upload an event photo"}
                </p>
              </div>
              {eventPhotoError && <p className="text-xs mt-1" style={{ color: "#E86020" }}>{eventPhotoError}</p>}
              {eventPhoto && (
                <div className="mt-2 relative rounded-xl overflow-hidden" style={{ maxHeight: "200px" }}>
                  <img src={eventPhoto} alt="Event preview" className="w-full object-cover rounded-xl" style={{ maxHeight: "200px" }} />
                  <button
                    type="button"
                    onClick={() => { setEventPhoto(""); if (eventPhotoRef.current) eventPhotoRef.current.value = ""; }}
                    className="absolute top-2 right-2 px-2 py-0.5 rounded-lg text-xs font-semibold"
                    style={{ backgroundColor: "#0F0F1A", color: "#E86020", border: "1px solid #E86020" }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
            >
              Submit Event
            </button>
          </form>
        )}

        {/* Profile Form  */}
        {activeTab === "profile" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: "Your Name / Business Name *", key: "name", placeholder: "DJ Alex or SoundPro Athens", required: true },
              { label: "Category *", key: "category", placeholder: "Music & Artists, Venues, etc.", required: true },
              { label: "Location", key: "location", placeholder: "Athens", required: false },
              { label: "Contact", key: "contact", placeholder: "+30 69x xxx xxxx", required: false },
            ].map(({ label, key, placeholder, required }) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={profileForm[key as keyof typeof profileForm]}
                  onChange={(e) => setProfileForm((f) => ({ ...f, [key]: e.target.value }))}
                  required={required}
                  className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: "#0d0d1a", color: "#fff", border: "1px solid rgba(232,160,32,0.15)" }}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Bio / Description</label>
              <textarea
                placeholder="Tell us about yourself or your business..."
                value={profileForm.bio}
                onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))}
                rows={4}
                className="w-full px-4 py-3 rounded-xl outline-none text-sm resize-none"
                style={{ backgroundColor: "#0d0d1a", color: "#fff", border: "1px solid rgba(232,160,32,0.15)" }}
              />
            </div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest pt-2">Social Media (optional)</p>
            {[
              { label: "Instagram", key: "instagram", placeholder: "https://instagram.com/yourprofile" },
              { label: "Facebook", key: "facebook", placeholder: "https://facebook.com/yourprofile" },
              { label: "TikTok", key: "tiktok", placeholder: "https://tiktok.com/@yourprofile" },
              { label: "Website", key: "website", placeholder: "https://yoursite.com" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={profileForm[key as keyof typeof profileForm]}
                  onChange={(e) => setProfileForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: "#0d0d1a", color: "#fff", border: "1px solid rgba(232,160,32,0.15)" }}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Gallery Photos (optional, max {MAX_PHOTOS}, up to {MAX_PHOTO_SIZE_MB}MB each)
              </label>
              <div
                className="w-full px-4 py-3 rounded-xl text-sm cursor-pointer"
                style={{ backgroundColor: "#0d0d1a", border: "1px dashed rgba(232,160,32,0.25)" }}
                onClick={() => photoInputRef.current?.click()}
              >
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <p className="text-gray-400 text-center">
                  {photos.length === 0
                    ? "Click to upload photos"
                    : `${photos.length} photo${photos.length !== 1 ? "s" : ""} selected`}
                </p>
              </div>
              {photoError && <p className="text-xs mt-1" style={{ color: "#E86020" }}>{photoError}</p>}
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {photos.map((src, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full text-xs font-bold flex items-center justify-center"
                        style={{ backgroundColor: "#0F0F1A", color: "#E86020" }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-3 rounded-xl font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
            >
              Submit Profile
            </button>
          </form>
        )}
      </section>

      {/* Submit Your Music */}
      <div className="border-t" style={{ borderColor: "rgba(232,160,32,0.08)" }}>
        <SubmitMusicSection />
      </div>
    </div>
  );
}
