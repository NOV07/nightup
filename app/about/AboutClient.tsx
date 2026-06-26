"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import type { LiveStats } from "./page";
import { useLanguage } from "../components/LanguageContext";
import { Spectral } from "next/font/google";

const spectral = Spectral({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const socials = [
  {
    label: "Instagram",
    href: "https://instagram.com/nightup.gr",
    icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>,
  },
  {
    label: "TikTok",
    href: "https://tiktok.com/@nightup.gr",
    icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.93a8.16 8.16 0 004.77 1.52V7.01a4.85 4.85 0 01-1-.32z" /></svg>,
  },
  {
    label: "Facebook",
    href: "https://facebook.com/nightup.gr",
    icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>,
  },
  {
    label: "Threads",
    href: "https://threads.net/@nightup.gr",
    icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.5 12.01c0-3.313.866-5.896 2.744-8.103C6.07 1.778 8.748.503 12.172.503c3.304 0 5.939 1.218 7.856 3.62 1.82 2.277 2.682 5.147 2.473 8.516l-.027.433H6.044c.039 1.917.518 3.527 1.418 4.782.89 1.243 2.076 1.874 3.525 1.874.997 0 1.854-.247 2.545-.736.68-.483 1.278-1.263 1.778-2.319l.209-.449 3.685 1.641-.198.424c-.74 1.585-1.729 2.839-2.941 3.727-1.241.912-2.741 1.504-4.879 1.504zm.028-20.984c-2.666 0-4.761.832-6.227 2.472-1.202 1.343-1.947 3.082-2.265 5.286h16.03c-.166-2.146-.827-3.871-1.977-5.125-1.256-1.364-3.027-2.633-5.561-2.633z" /></svg>,
  },
  {
    label: "Discord",
    href: "https://discord.gg/nightup",
    icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>,
  },
  {
    label: "Spotify",
    href: "#",
    icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>,
  },
  {
    label: "SoundCloud",
    href: "#",
    icon: <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M1.175 12.225c-.017 0-.032.001-.047.003l-.078.01c-.38.056-.665.337-.715.696a.917.917 0 00-.01.13c0 .507.41.919.917.919.507 0 .918-.412.918-.919V12.225H1.175zm1.893-.39c-.01.065-.016.131-.016.198 0 .51.413.922.923.922.51 0 .922-.413.922-.922 0-.51-.412-.922-.922-.922a.925.925 0 00-.162.015 3.347 3.347 0 00-6.458 1.153.922.922 0 00.001.115H3.068zm16.964.39H5.998v2.01h14.034a2.01 2.01 0 000-4.02 2.01 2.01 0 00-2.01 2.01zm0 0a5.504 5.504 0 10-10.927-1.03 2.876 2.876 0 000 5.744h10.927a2.876 2.876 0 000-5.744l.000.03z" /></svg>,
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

function useCountUp<T extends HTMLElement>(target: number, duration = 1400) {
  const [count, setCount] = useState(0);
  const ref = useRef<T>(null);
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

function StatItem({ target, label }: { target: number; label: string }) {
  const { count, ref } = useCountUp<HTMLDivElement>(target);
  const display =
    count >= 1000
      ? `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`
      : count.toLocaleString();
  return (
    <div ref={ref}>
      <div
        className={spectral.className}
        style={{ fontSize: "28px", color: "#fff", lineHeight: 1, fontWeight: 300 }}
      >
        {display}
      </div>
      <div
        style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.1em", color: "#5A5A6A", marginTop: "5px" }}
      >
        {label}
      </div>
    </div>
  );
}

function SectionHeader({ num, title, sub }: { num: string; title: string; sub: string }) {
  return (
    <div
      className="flex items-baseline gap-3 pb-5 mb-8"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
    >
      <span
        className={spectral.className}
        style={{ fontStyle: "italic", color: "#E8A020", fontSize: "13px", flexShrink: 0 }}
      >
        {num}
      </span>
      <h2
        className={spectral.className}
        style={{ fontWeight: 300, fontSize: "30px", color: "#fff", lineHeight: 1 }}
      >
        {title}
      </h2>
      <p
        className={spectral.className}
        style={{ fontStyle: "italic", color: "#5A5A6A", fontSize: "14px", marginLeft: "auto", flexShrink: 0 }}
      >
        {sub}
      </p>
    </div>
  );
}

const MUSIC_GENRES_LIST = ["House", "Techno", "Deep House", "R&B", "Hip-Hop", "Other"];

// ── Kept for backward compatibility — not rendered ──────────────
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

  void handleSubmit; void set; void handleCover; void coverRef; void submitted; void error; void submitting; void coverImage; void coverError;
  return null;
}

const CARDS: Array<{ label: string; title: React.ReactNode; desc: string; href: string }> = [
  {
    label: "Καταχώρηση",
    title: <>Πρόσθεσε <em style={{ fontStyle: "italic", color: "#E8A020" }}>event</em></>,
    desc: "Διοργανώνεις party, live, festival; Το προσθέτεις στον χάρτη της νύχτας.",
    href: "/submit/event",
  },
  {
    label: "Καταχώρηση",
    title: <>Φτιάξε <em style={{ fontStyle: "italic", color: "#E8A020" }}>προφίλ</em></>,
    desc: "DJ, artist, venue, sound engineer — γίνε μέρος του network.",
    href: "/submit/professional",
  },
  {
    label: "Καταχώρηση",
    title: <>Στείλε <em style={{ fontStyle: "italic", color: "#E8A020" }}>μουσική</em></>,
    desc: "Νέο release ή mix; Στείλ' το για το Nightwaves.",
    href: "/submit/release",
  },
];

export default function AboutClient({ liveStats }: { liveStats: LiveStats }) {
  const { t } = useLanguage();

  // ── Form state — kept for backward compat ──
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

  void eventForm; void profileForm; void eventPhoto; void setEventPhoto;
  void eventPhotoError; void setEventPhotoError; void eventPhotoRef;
  void photos; void setPhotos; void photoError; void setPhotoError;
  void photoInputRef; void activeTab; void setActiveTab; void submitError;

  const tracked = useRef(false);
  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    fetch("/api/track-visit", { method: "POST" }).catch(() => {});
  }, []);

  // ── Handlers — kept for backward compat ──
  const handleEventPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setEventPhotoError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setEventPhotoError("Photo must be under 5MB."); return; }
    setEventPhoto(await readFileAsBase64(file));
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError("");
    const files = Array.from(e.target.files ?? []);
    if (photos.length + files.length > MAX_PHOTOS) { setPhotoError(`Max ${MAX_PHOTOS} photos allowed.`); return; }
    const oversized = files.find((f) => f.size > MAX_PHOTO_SIZE_MB * 1024 * 1024);
    if (oversized) { setPhotoError(`Each photo must be under ${MAX_PHOTO_SIZE_MB}MB.`); return; }
    const bases = await Promise.all(files.map(readFileAsBase64));
    setPhotos((prev) => [...prev, ...bases].slice(0, MAX_PHOTOS));
  };

  const removePhoto = (i: number) => setPhotos((prev) => prev.filter((_, idx) => idx !== i));

  void handleEventPhotoChange; void handlePhotoChange; void removePhoto;

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
              title: rest.title, venue: rest.venue, date: rest.date,
              time: rest.time || null, city: rest.city, genre: rest.genre,
              contact_email: contact,
              instagram: rest.instagram || null, facebook: rest.facebook || null,
              tiktok: rest.tiktok || null, website: rest.website || null,
              image_url: eventPhoto || null,
            },
          }),
        });
        if (!res.ok) { const json = await res.json(); setSubmitError(json.error ?? "Submission failed."); return; }
      } else if (activeTab === "profile") {
        const res = await fetch("/api/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            table: "professionals",
            data: {
              name: profileForm.name, category: profileForm.category,
              location: profileForm.location, description: profileForm.bio,
              contact: profileForm.contact,
              instagram: profileForm.instagram || null, facebook: profileForm.facebook || null,
              tiktok: profileForm.tiktok || null, website: profileForm.website || null,
              photos: photos.length > 0 ? photos : null,
            },
          }),
        });
        if (!res.ok) { const json = await res.json(); setSubmitError(json.error ?? "Submission failed."); return; }
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

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: "6px", outline: "none",
    fontSize: "14px", backgroundColor: "#0F0F1A", color: "#fff",
    border: "1px solid rgba(255,255,255,0.1)",
  };

  void t;

  useEffect(() => {
    const segments: [string, boolean][] = [
      ['Nightup. ', false],
      ['Made for nightlife.', true],
    ]
    const fullText = segments.map(s => s[0]).join('')
    const goldStart = segments[0][0].length
    const typed = document.getElementById('hero-typed')
    const cursor = document.getElementById('hero-cursor')
    const eyebrow = document.getElementById('hero-eyebrow')
    if (!typed || !cursor || !eyebrow) return
    let i = 0
    const interval = setInterval(() => {
      if (i >= fullText.length) {
        clearInterval(interval)
        setTimeout(() => { eyebrow.style.animation = 'cn-eyebrow 0.8s ease-out forwards' }, 200)
        setTimeout(() => { if (cursor) cursor.style.display = 'none' }, 1700)
        return
      }
      typed.innerHTML = ''
      const before = fullText.slice(0, Math.min(i + 1, goldStart))
      const after = i >= goldStart ? fullText.slice(goldStart, i + 1) : ''
      before.split('\n').forEach((line, idx) => {
        if (idx > 0) typed.appendChild(document.createElement('br'))
        typed.appendChild(document.createTextNode(line))
      })
      if (after) {
        const span = document.createElement('span')
        span.style.cssText = 'color:#E8A020;font-style:italic'
        span.textContent = after
        typed.appendChild(span)
      }
      i++
    }, 38)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ backgroundColor: "#0F0F1A", minHeight: "100vh" }}>
      <style>{`
        .about-card { border: 1px solid rgba(255,255,255,0.07); transition: border-color 0.2s; }
        .about-card:hover { border-color: rgba(232,160,32,0.30); }
        .about-social-btn { border: 1px solid rgba(255,255,255,0.07); transition: border-color 0.2s; }
        .about-social-btn:hover { border-color: rgba(232,160,32,0.30); }
        .legal-link { color: #5A5A6A; text-decoration: none; transition: color 0.15s; font-size: 10px; text-transform: uppercase; letter-spacing: 0.18em; }
        .legal-link:hover { color: #E8A020; }
        .contact-input:focus { border-color: rgba(232,160,32,0.4); }
        @media (max-width: 640px) {
          .about-hero-h1 { font-size: 36px !important; }
          .about-container { padding: 32px 20px 48px !important; }
          .about-lede { font-size: 16px !important; }
        }
      `}</style>

      {/* ── Cinematic Hero ──────────────────────────────── */}
      <div style={{ position: 'relative', background: '#080808', overflow: 'hidden', minHeight: '280px', display: 'flex', alignItems: 'flex-end', padding: '32px 0 48px' }}>
        <style>{`
          @keyframes cn-flash { 0%{opacity:1} 100%{opacity:0} }
          @keyframes cn-float { from{transform:translateY(0) translateX(0);opacity:var(--op)} to{transform:translateY(-40px) translateX(var(--dx));opacity:calc(var(--op)*0.2)} }
          @keyframes cn-trail { 0%{transform:translateY(0);opacity:0} 10%{opacity:1} 90%{opacity:0.5} 100%{transform:translateY(-100px);opacity:0} }
          @keyframes cn-flare { 0%,100%{opacity:0.03;transform:scale(1)} 50%{opacity:0.08;transform:scale(1.12)} }
          @keyframes cn-blink { 0%,100%{opacity:1} 50%{opacity:0} }
          @keyframes cn-eyebrow { from{opacity:0;letter-spacing:0.6em} to{opacity:1;letter-spacing:0.35em} }
          @keyframes cn-particles-in { from{opacity:0} to{opacity:1} }
        `}</style>

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(ellipse 60% 80% at 20% 60%, rgba(232,160,32,0.35), transparent 60%)', animation: 'cn-flash 0.15s ease-out forwards', pointerEvents: 'none', zIndex: 20 }} />

        {([[20,20,200],[45,50,280],[70,15,160],[85,60,220]] as [number,number,number][]).map(([l,t,s],i) => (
          <div key={`f${i}`} style={{ position: 'absolute', width: s, height: s, left: `${l}%`, top: `${t}%`, transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,160,32,0.06) 0%, transparent 70%)', animation: `cn-flare ${6+i*2}s ease-in-out infinite`, animationDelay: `${i*1.5}s`, pointerEvents: 'none', zIndex: 1 }} />
        ))}

        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, animation: 'cn-particles-in 2s ease-out forwards', animationDelay: '0.15s', opacity: 0, pointerEvents: 'none', zIndex: 1 }}>
          {[...Array(50)].map((_, i) => {
            const size = i%5===0 ? 2.5 : i%3===0 ? 1.5 : 1
            const op = 0.15+(i%6)*0.08
            const dx = ((i*7)%60)-30
            const dur = 8+(i%5)*3
            const blur = i%4===0
            return (
              <div key={`p${i}`} style={{ position: 'absolute', width: size, height: size, borderRadius: '50%', background: i%7===0 ? '#E8A020' : '#ffffff', opacity: op, left: `${(i*13+7)%96}%`, top: `${(i*19+5)%90}%`, filter: blur ? 'blur(1px)' : 'none', ['--op' as any]: op, ['--dx' as any]: `${dx}px`, animation: `cn-float ${dur}s ease-in-out infinite alternate`, animationDelay: `${(i*0.3)%4}s` }} />
            )
          })}
          {[...Array(14)].map((_,i) => (
            <div key={`t${i}`} style={{ position: 'absolute', width: '1px', height: `${10+(i%4)*8}px`, left: `${(i*17+3)%95}%`, top: `${60+(i%4)*8}%`, background: `linear-gradient(to top, transparent, rgba(255,255,255,${0.1+(i%3)*0.08}), transparent)`, animation: `cn-trail ${4+(i%4)*1.5}s ease-in infinite`, animationDelay: `${(i*0.6)%5}s` }} />
          ))}
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '100px', background: 'linear-gradient(transparent, #0F0F1A)', pointerEvents: 'none', zIndex: 5 }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '160px', background: 'linear-gradient(to right, #0F0F1A, transparent)', pointerEvents: 'none', zIndex: 5 }} />

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '860px', margin: '0 auto', padding: '0 48px' }}>
          <div id="hero-eyebrow" style={{ fontSize: '9px', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#E8A020', marginBottom: '10px', opacity: 0, fontFamily: 'var(--font-sans)' }}>About</div>
          <h1 className={`about-hero-h1 ${spectral.className}`} style={{ fontWeight: 300, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', color: '#fff', lineHeight: 1.15, margin: 0, minHeight: '4rem' }}>
            <span id="hero-typed"></span>
            <span id="hero-cursor" style={{ display: 'inline-block', width: '2px', height: '0.85em', background: '#E8A020', verticalAlign: 'middle', marginLeft: '3px', animation: 'cn-blink 0.7s step-end infinite' }} />
          </h1>
        </div>
      </div>

      <div
        className="about-container"
        style={{ maxWidth: "860px", margin: "0 auto", padding: "48px 48px 80px", position: 'relative', zIndex: 1 }}
      >

        {/* ── Hero lede + stats ─────────────────────────────── */}
        <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "64px", marginBottom: "64px" }}>
          <p
            className={`about-lede ${spectral.className}`}
            style={{ fontStyle: "italic", fontSize: "18px", color: "#8A8A99", lineHeight: 1.65, maxWidth: "560px", marginTop: 0 }}
          >
            Events, χώροι, μουσική, ιστορίες — μαζεμένα σε ένα μέρος.
            Για να ξέρεις πάντα τι παίζει, πού παίζει, και ποιος το κάνει.
          </p>
          <div style={{ display: "flex", gap: "32px", marginTop: "36px", flexWrap: "wrap" }}>
            <StatItem target={liveStats.events} label="Events" />
            <StatItem target={liveStats.professionals} label="Professionals" />
            <StatItem target={liveStats.cities} label="Cities" />
            <StatItem target={liveStats.visitors} label="Visitors / month" />
          </div>
        </div>

        {/* ── Section i — Συνέβαλε ────────────────────────── */}
        <div style={{ marginTop: "48px", marginBottom: "64px" }}>
          <SectionHeader num="i." title="Συνέβαλε" sub="Είσαι μέρος της σκηνής." />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CARDS.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="about-card block"
                style={{ backgroundColor: "#0F0F1A", borderRadius: "6px", padding: "24px", textDecoration: "none" }}
              >
                <p style={{ fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.3em", color: "#E8A020", marginBottom: "14px" }}>
                  {card.label}
                </p>
                <h3
                  className={spectral.className}
                  style={{ fontWeight: 300, fontSize: "20px", color: "#fff", lineHeight: 1.2, marginBottom: "10px" }}
                >
                  {card.title}
                </h3>
                <p
                  className={spectral.className}
                  style={{ fontStyle: "italic", fontSize: "12px", color: "#8A8A99", lineHeight: 1.6, marginBottom: "24px" }}
                >
                  {card.desc}
                </p>
                <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.22em", color: "#E8A020" }}>
                  Submit →
                </p>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Section ii — Πες μας ────────────────────────── */}
        <div style={{ marginBottom: "64px" }}>
          <SectionHeader num="ii." title="Πες μας" sub="Σχόλιο, ιδέα, παράπονο — όλα μετράνε." />
          <div style={{ maxWidth: "620px" }}>
            {submitted ? (
              <div
                className={spectral.className}
                style={{ fontStyle: "italic", fontSize: "16px", color: "#5A5A6A", padding: "32px 0" }}
              >
                Ελήφθη. Θα επικοινωνήσουμε σύντομα.
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <input
                    type="text"
                    placeholder="Όνομα"
                    required
                    value={contactForm.name}
                    onChange={(e) => setContactForm((f) => ({ ...f, name: e.target.value }))}
                    className="contact-input"
                    style={inputStyle}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    required
                    value={contactForm.email}
                    onChange={(e) => setContactForm((f) => ({ ...f, email: e.target.value }))}
                    className="contact-input"
                    style={inputStyle}
                  />
                </div>
                <textarea
                  placeholder="Μήνυμα..."
                  required
                  rows={5}
                  value={contactForm.message}
                  onChange={(e) => setContactForm((f) => ({ ...f, message: e.target.value }))}
                  className="contact-input"
                  style={{ ...inputStyle, minHeight: "110px", resize: "none", display: "block" }}
                />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px", flexWrap: "wrap", gap: "12px" }}>
                  <p
                    className={spectral.className}
                    style={{ fontStyle: "italic", fontSize: "13px", color: "#5A5A6A" }}
                  >
                    Απαντάμε εντός 24 ωρών.
                  </p>
                  <button
                    type="submit"
                    style={{
                      backgroundColor: "#E8A020", color: "#0A0A12", borderRadius: "6px",
                      padding: "10px 22px", fontSize: "14px", fontWeight: 500,
                      border: "none", cursor: "pointer",
                    }}
                  >
                    Αποστολή →
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ── Section iii — Ακολούθησε ────────────────────── */}
        <div style={{ marginBottom: "32px" }}>
          <SectionHeader num="iii." title="Ακολούθησε" sub="Παντού όπου ζει η νύχτα." />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="about-social-btn"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "8px",
                  backgroundColor: "#0F0F1A", borderRadius: "6px",
                  padding: "11px 18px", textDecoration: "none",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                {s.icon}
                <span
                  className={spectral.className}
                  style={{ fontSize: "12px", color: "#fff", fontWeight: 400 }}
                >
                  {s.label}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* ── Legal strip ──────────────────────────────────── */}
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: "32px", paddingTop: "24px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: "12px",
          }}
        >
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <Link href="/privacy" className="legal-link">Πολιτική Απορρήτου</Link>
            <Link href="/terms" className="legal-link">Όροι Χρήσης</Link>
            <Link href="/cookies" className="legal-link">Cookies</Link>
          </div>
          <p
            className={spectral.className}
            style={{ fontStyle: "italic", fontSize: "11px", color: "#5A5A6A" }}
          >
            © 2026 Nightup. Made for the nightlife.
          </p>
        </div>

      </div>
    </div>
  );
}
