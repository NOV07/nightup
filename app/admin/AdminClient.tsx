"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import RichTextEditor from "../components/admin/RichTextEditor";
import { useRouter } from "next/navigation";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const GENRES = ["Techno", "House", "Deep House", "Minimal", "Drum & Bass", "Trance", "Hip-Hop", "R&B", "Afrobeats", "Reggaeton", "Laika", "Entechno", "Rebetiko", "Dimotika", "Rock", "Jazz", "Classical", "Blues", "Open Air", "Beach Party", "Rooftop"];
const CITIES = ["Athens", "Thessaloniki", "Mykonos", "Santorini", "Heraklion", "Patras", "Rhodes", "Ios", "Corfu", "Zakynthos"];
const PRO_CATEGORIES = ["Venues", "Music & Artists", "Sound & Lighting", "Food & Drinks", "Decoration", "Transport & VIP", "Photography"];
const ART_CATEGORIES = ["Venues", "Festivals", "Artists", "Guide", "Music", "Culture"];
const RELEASE_TYPES = ["Single", "EP", "Album"];
const MUSIC_GENRES = ["Techno", "House", "Deep House", "Hip-Hop", "R&B", "Latin", "Afrobeats", "Pop", "Rock", "Laika", "Entechno", "Other"];
const ORG_TYPES = ["Club", "Promoter", "Festival", "Bar", "Agency", "Venue", "Other"];

type Tab = "events" | "professionals" | "articles" | "organizers" | "music" | "users";
type MusicSubTab = "releases" | "mixes" | "playlists" | "artists";
type ItemStatus = "pending" | "approved" | "hidden" | "rejected";

interface ContentItem {
  id: string;
  status: ItemStatus;
  featured?: boolean;
  [key: string]: unknown;
}

interface AllContent {
  events: ContentItem[];
  professionals: ContentItem[];
  articles: ContentItem[];
  organizers: ContentItem[];
  releases: ContentItem[];
  mixes: ContentItem[];
  playlists: ContentItem[];
  artists: ContentItem[];
  profiles: ContentItem[];
}

const defaultEventForm = { title: "", image_url: "", genre: "Techno", price: "", date: "", time: "23:00", venue: "", city: "Athens", lineup: "", description: "", ticket_url: "https://tickets.nightup.gr" };
const defaultProForm = { name: "", avatar: "", category: "Venues", rating: "5", reviews_count: "0", city: "", description: "" };
const defaultArticleForm = { title: "", category: "Venues", date: "", read_time: "5", image: "", excerpt: "", body: "", featured: false, series: "", series_order: "" };
const defaultOrgForm = { name: "", type: "Club", city: "Athens", about: "", cover_image: "", avatar: "", instagram: "", facebook: "", tiktok: "", website: "" };
const defaultReleaseForm = { title: "", artist: "", type: "Single", genre: "House", cover_image: "", spotify_url: "", soundcloud_url: "", description: "", release_date: "", is_promoted: false };
const defaultMixForm = { title: "", artist: "", genre: "House", cover_image: "", soundcloud_url: "", duration: "" };
const defaultPlaylistForm = { title: "", platform: "Spotify", embed_url: "", cover_image: "", is_sponsored: false };
const defaultArtistForm = { name: "", origin: "", about: "", photo: "", genres: "", style_tags: "", spotify_url: "", soundcloud_url: "", instagram: "", website: "" };

export default function AdminClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("events");
  const [musicSubTab, setMusicSubTab] = useState<MusicSubTab>("releases");
  const [allContent, setAllContent] = useState<AllContent>({ events: [], professionals: [], articles: [], organizers: [], releases: [], mixes: [], playlists: [], artists: [], profiles: [] });
  const [assignOrgId, setAssignOrgId] = useState<string>("");
  const [assignLoading, setAssignLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; tab: Tab; subtab?: MusicSubTab } | null>(null);
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null);
  const [previewTab, setPreviewTab] = useState<Tab>("events");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [editItem, setEditItem] = useState<ContentItem | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const [eventForm, setEventForm] = useState({ ...defaultEventForm });
  const [proForm, setProForm] = useState({ ...defaultProForm });
  const [articleForm, setArticleForm] = useState({ ...defaultArticleForm });
  const [orgForm, setOrgForm] = useState({ ...defaultOrgForm });
  const [releaseForm, setReleaseForm] = useState({ ...defaultReleaseForm });
  const [mixForm, setMixForm] = useState({ ...defaultMixForm });
  const [playlistForm, setPlaylistForm] = useState({ ...defaultPlaylistForm });
  const [artistForm, setArtistForm] = useState({ ...defaultArtistForm });
  const [articleContent, setArticleContent] = useState("");

  const [adminEventPhoto, setAdminEventPhoto] = useState<string>("");
  const [adminEventPhotoError, setAdminEventPhotoError] = useState("");
  const adminEventPhotoRef = useRef<HTMLInputElement>(null);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pending");
      if (res.ok) {
        const data = await res.json();
        setAllContent(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchContent(); }, [fetchContent]);

  function getTableForTab(tab: Tab, subtab?: MusicSubTab): string {
    if (tab === "music") {
      if (subtab === "releases") return "music_releases";
      return subtab ?? "music_releases";
    }
    return tab;
  }

  async function handleAction(id: string, action: "approved" | "hidden" | "rejected", tab: Tab, subtab?: MusicSubTab) {
    setActionId(id);
    const table = getTableForTab(tab, subtab);
    await fetch("/api/admin/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, id, action }),
    });
    setActionId(null);
    await fetchContent();
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setActionId(confirmDelete.id);
    const table = getTableForTab(confirmDelete.tab, confirmDelete.subtab);
    await fetch("/api/admin/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, id: confirmDelete.id }),
    });
    setActionId(null);
    setConfirmDelete(null);
    await fetchContent();
  }

  async function handleToggleFeatured(id: string, currentFeatured: boolean) {
    await fetch("/api/admin/feature-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, featured: !currentFeatured }),
    });
    setAllContent((prev) => ({ ...prev, events: prev.events.map((e) => e.id === String(id) ? { ...e, featured: !currentFeatured } : e) }));
  }

  async function handleToggleNightupPick(id: string, current: boolean) {
    await fetch("/api/admin/nightup-pick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, nightup_pick: !current }),
    });
    setAllContent((prev) => ({ ...prev, events: prev.events.map((e) => e.id === String(id) ? { ...e, nightup_pick: !current } : e) }));
  }

  async function handleToggleRadarPick(id: string, current: boolean) {
    await fetch("/api/admin/radar-pick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_radar_pick: !current }),
    });
    setAllContent((prev) => ({ ...prev, events: prev.events.map((e) => e.id === String(id) ? { ...e, is_radar_pick: !current } : e) }));
  }

  async function handleToggleFeaturedPro(id: string, currentFeatured: boolean) {
    await fetch("/api/admin/feature-professional", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_featured: !currentFeatured }),
    });
    setAllContent((prev) => ({ ...prev, professionals: prev.professionals.map((p) => p.id === String(id) ? { ...p, is_featured: !currentFeatured } : p) }));
  }

  async function handleEditSave(table: string, id: string, data: Record<string, unknown>) {
    setEditLoading(true);
    setEditError("");
    const res = await fetch("/api/admin/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, id, data }),
    });
    setEditLoading(false);
    if (!res.ok) {
      const j = await res.json();
      setEditError(j.error ?? "Failed to save");
      return;
    }
    setEditItem(null);
    await fetchContent();
  }

  async function handleAdminEventPhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setAdminEventPhotoError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setAdminEventPhotoError("Photo must be under 5MB."); return; }
    setAdminEventPhoto(await readFileAsBase64(file));
  }

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true); setAddError(""); setAddSuccess("");
    const lineup = eventForm.lineup.split(",").map((s) => s.trim()).filter(Boolean);
    const imageUrl = adminEventPhoto || eventForm.image_url || null;
    const res = await fetch("/api/admin/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "events", data: { ...eventForm, image_url: imageUrl, lineup, interested_count: 0, going_count: 0 } }),
    });
    const json = await res.json();
    setAddLoading(false);
    if (!res.ok) { setAddError(json.error ?? "Failed"); return; }
    setAddSuccess("Event added!");
    setEventForm({ ...defaultEventForm });
    setAdminEventPhoto("");
    if (adminEventPhotoRef.current) adminEventPhotoRef.current.value = "";
    setShowAddForm(false);
    await fetchContent();
  }

  async function handleAddPro(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true); setAddError(""); setAddSuccess("");
    const res = await fetch("/api/admin/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "professionals", data: { ...proForm, rating: parseFloat(proForm.rating), reviews_count: parseInt(proForm.reviews_count) } }),
    });
    const json = await res.json();
    setAddLoading(false);
    if (!res.ok) { setAddError(json.error ?? "Failed"); return; }
    setAddSuccess("Professional added!");
    setProForm({ ...defaultProForm });
    setShowAddForm(false);
    await fetchContent();
  }

  async function handleAddArticle(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true); setAddError(""); setAddSuccess("");
    const res = await fetch("/api/admin/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "articles",
        data: {
          ...articleForm,
          read_time: articleForm.read_time ? parseInt(articleForm.read_time) : 5,
          content: articleContent,
          body: articleContent,
          series: articleForm.series || null,
          series_order: articleForm.series_order ? parseInt(articleForm.series_order) : null,
        },
      }),
    });
    const json = await res.json();
    setAddLoading(false);
    if (!res.ok) { setAddError(json.error ?? "Failed"); return; }
    setAddSuccess("Article added!");
    setArticleForm({ ...defaultArticleForm });
    setArticleContent("");
    setShowAddForm(false);
    await fetchContent();
  }

  async function handleAddOrganizer(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true); setAddError(""); setAddSuccess("");
    const res = await fetch("/api/admin/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "organizers", data: orgForm }),
    });
    const json = await res.json();
    setAddLoading(false);
    if (!res.ok) { setAddError(json.error ?? "Failed"); return; }
    setAddSuccess("Organizer added!");
    setOrgForm({ ...defaultOrgForm });
    setShowAddForm(false);
    await fetchContent();
  }

  async function handleAddRelease(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true); setAddError(""); setAddSuccess("");
    const res = await fetch("/api/admin/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "music_releases", data: releaseForm }),
    });
    const json = await res.json();
    setAddLoading(false);
    if (!res.ok) { setAddError(json.error ?? "Failed"); return; }
    setAddSuccess("Release added!");
    setReleaseForm({ ...defaultReleaseForm });
    setShowAddForm(false);
    await fetchContent();
  }

  async function handleAddMix(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true); setAddError(""); setAddSuccess("");
    const res = await fetch("/api/admin/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "mixes", data: mixForm }),
    });
    const json = await res.json();
    setAddLoading(false);
    if (!res.ok) { setAddError(json.error ?? "Failed"); return; }
    setAddSuccess("Mix added!");
    setMixForm({ ...defaultMixForm });
    setShowAddForm(false);
    await fetchContent();
  }

  async function handleAddPlaylist(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true); setAddError(""); setAddSuccess("");
    const res = await fetch("/api/admin/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "playlists", data: playlistForm }),
    });
    const json = await res.json();
    setAddLoading(false);
    if (!res.ok) { setAddError(json.error ?? "Failed"); return; }
    setAddSuccess("Playlist added!");
    setPlaylistForm({ ...defaultPlaylistForm });
    setShowAddForm(false);
    await fetchContent();
  }

  async function handleAddArtist(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true); setAddError(""); setAddSuccess("");
    const genres = artistForm.genres.split(",").map((s) => s.trim()).filter(Boolean);
    const style_tags = artistForm.style_tags.split(",").map((s) => s.trim()).filter(Boolean);
    const res = await fetch("/api/admin/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "artists", data: { ...artistForm, genres, style_tags, status: "pending" } }),
    });
    const json = await res.json();
    setAddLoading(false);
    if (!res.ok) { setAddError(json.error ?? "Failed"); return; }
    setAddSuccess("Artist added!");
    setArtistForm({ ...defaultArtistForm });
    setShowAddForm(false);
    await fetchContent();
  }

  function getMusicItems(): ContentItem[] {
    const map: Record<MusicSubTab, ContentItem[]> = {
      releases: allContent.releases,
      mixes: allContent.mixes,
      playlists: allContent.playlists,
      artists: allContent.artists,
    };
    return map[musicSubTab] ?? [];
  }

  const currentTabItems = activeTab === "music" ? getMusicItems() : (allContent as unknown as Record<string, ContentItem[]>)[activeTab] ?? [];
  const pendingItems = currentTabItems.filter((i) => i.status === "pending");
  const publishedItems = currentTabItems.filter((i) => i.status === "approved");
  const hiddenItems = currentTabItems.filter((i) => i.status === "hidden" || i.status === "rejected");

  const ev = allContent.events;
  const pr = allContent.professionals;
  const ar = allContent.articles;
  const og = allContent.organizers;
  const cnt = (arr: ContentItem[], s: ItemStatus | "hidden") =>
    s === "hidden" ? arr.filter((i) => i.status === "hidden" || i.status === "rejected").length : arr.filter((i) => i.status === s).length;

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm outline-none";
  const inputStyle = { backgroundColor: "#0F0F1A", color: "#fff", border: "1px solid #444" };
  const labelCls = "block text-xs text-gray-400 mb-1";

  function renderRow(item: ContentItem, section: "pending" | "approved" | "hidden") {
    const id = String(item.id);
    const busy = actionId === id;
    const tab = activeTab;
    const subtab = activeTab === "music" ? musicSubTab : undefined;
    const table = getTableForTab(tab, subtab);
    const isOrganizer = tab === "organizers";
    const isMusic = tab === "music";
    const isRelease = isMusic && musicSubTab === "releases";
    const isMix = isMusic && musicSubTab === "mixes";
    const isArtist = isMusic && musicSubTab === "artists";
    const isPlaylist = isMusic && musicSubTab === "playlists";

    const primary =
      (tab === "professionals" || tab === "organizers" || isArtist) ? (item.name as string)
      : (isRelease || isMix || isPlaylist) ? `${item.title} — ${item.artist ?? item.platform ?? ""}`
      : (item.title as string);
    const secondary =
      tab === "events" ? [item.venue, item.city, item.date, item.genre].filter(Boolean).join(" · ")
      : tab === "professionals" ? [item.category, item.city].filter(Boolean).join(" · ")
      : tab === "organizers" ? [item.type, item.city].filter(Boolean).join(" · ")
      : isRelease ? [item.type, item.genre].filter(Boolean).join(" · ")
      : isMix ? (item.genre as string) || ""
      : isArtist ? (item.origin as string) || ""
      : (item.category as string) || "";

    return (
      <div key={id} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ backgroundColor: "#111120", border: `1px solid ${section === "approved" && item.featured ? "#E8A020" : "rgba(232,160,32,0.12)"}` }}>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">{primary || "—"}</p>
          {secondary && <p className="text-xs text-gray-500 mt-0.5 truncate">{secondary}</p>}
          {tab === "articles" && !!(item as any).series && (
            <span className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block" style={{ backgroundColor: "rgba(232,160,32,0.1)", color: "#E8A020", border: "1px solid rgba(232,160,32,0.25)" }}>{String((item as any).series)}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Nightup Pick toggle — events */}
          {tab === "events" && section === "approved" && (
            <button
              onClick={() => handleToggleNightupPick(id, !!(item as any).nightup_pick)}
              title={(item as any).nightup_pick ? "Remove Nightup Pick" : "Mark as Nightup Pick"}
              className="px-2 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ backgroundColor: (item as any).nightup_pick ? "#E8A020" : "#2A2A3E", color: (item as any).nightup_pick ? "#0F0F1A" : "#666" }}
            >
              ⭐
            </button>
          )}
          {/* Radar Pick toggle — events */}
          {tab === "events" && section === "approved" && (
            <button
              onClick={() => handleToggleRadarPick(id, !!(item as any).is_radar_pick)}
              title={(item as any).is_radar_pick ? "Remove Radar Pick" : "Mark as Radar Pick"}
              className="px-2 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ backgroundColor: (item as any).is_radar_pick ? "#E8A020" : "#2A2A3E", color: (item as any).is_radar_pick ? "#0F0F1A" : "#666" }}
            >
              📡
            </button>
          )}
          {/* Featured toggle — events */}
          {tab === "events" && section === "approved" && (
            <button
              onClick={() => handleToggleFeatured(id, !!item.featured)}
              title={item.featured ? "Unfeature" : "Feature"}
              className="px-2 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ backgroundColor: item.featured ? "#E8A020" : "#2A2A3E", color: item.featured ? "#0F0F1A" : "#666" }}
            >
              ★
            </button>
          )}
          {/* Featured toggle — professionals */}
          {tab === "professionals" && section === "approved" && (
            <button
              onClick={() => handleToggleFeaturedPro(id, !!(item as any).is_featured)}
              title={(item as any).is_featured ? "Remove Featured" : "Mark Featured"}
              className="px-2 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={{ backgroundColor: (item as any).is_featured ? "#E8A020" : "#2A2A3E", color: (item as any).is_featured ? "#0F0F1A" : "#666" }}
            >
              ★
            </button>
          )}
          {/* Edit button */}
          <button
            onClick={() => { setEditItem(item); setEditError(""); setPreviewTab(tab); }}
            title="Edit"
            className="px-2 py-1.5 rounded-lg text-sm leading-none transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#1E2A3A", color: "#aaa", border: "1px solid #444" }}
          >
            ✏️
          </button>
          {/* Preview */}
          <button
            onClick={() => { setPreviewItem(item); setPreviewTab(tab); if (tab === "events") setAssignOrgId((item.organizer_id as string) ?? ""); }}
            title="Preview"
            className="px-2 py-1.5 rounded-lg text-sm leading-none transition-opacity hover:opacity-80"
            style={{ backgroundColor: "#1E2A3A", color: "#E8A020", border: "1px solid #E8A020" }}
          >
            👁
          </button>
          {/* Approve */}
          {section !== "approved" && (
            <button onClick={() => handleAction(id, "approved", tab, subtab)} disabled={busy} title="Approve" className="px-2 py-1.5 rounded-lg text-sm leading-none disabled:opacity-40" style={{ backgroundColor: "#14532d", color: "#86efac" }}>✅</button>
          )}
          {/* Hide / Reject */}
          {section !== "hidden" && (
            <button onClick={() => handleAction(id, isOrganizer || isArtist ? "rejected" : "hidden", tab, subtab)} disabled={busy} title={isOrganizer || isArtist ? "Reject" : "Hide"} className="px-2 py-1.5 rounded-lg text-sm leading-none disabled:opacity-40" style={{ backgroundColor: "#78350f", color: "#fbbf24" }}>
              {isOrganizer || isArtist ? "✗" : "🙈"}
            </button>
          )}
          {/* Delete */}
          <button onClick={() => setConfirmDelete({ id, tab, subtab })} disabled={busy} title="Delete" className="px-2 py-1.5 rounded-lg text-sm leading-none disabled:opacity-40" style={{ backgroundColor: "#450a0a", color: "#fca5a5" }}>🗑️</button>
        </div>
      </div>
    );
  }

  function renderSection(title: string, sectionItems: ContentItem[], section: "pending" | "approved" | "hidden", emptyMsg: string) {
    const badgeColor = section === "pending" ? { bg: "#E8A020", fg: "#0F0F1A" } : section === "approved" ? { bg: "#16a34a", fg: "#fff" } : { bg: "#444", fg: "#fff" };
    return (
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "#666" }}>{title}</h2>
          {sectionItems.length > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: badgeColor.bg, color: badgeColor.fg }}>{sectionItems.length}</span>}
        </div>
        {sectionItems.length === 0 ? (
          <p className="text-xs pl-1" style={{ color: "#3a3a4e" }}>{emptyMsg}</p>
        ) : (
          <div className="space-y-2">{sectionItems.map((item) => renderRow(item, section))}</div>
        )}
      </div>
    );
  }

  const totalMusicPending = allContent.releases.filter(i => i.status === "pending").length
    + allContent.artists.filter(i => i.status === "pending").length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0F0F1A", color: "#fff" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(232,160,32,0.12)" }}>
        <span className="font-bold text-lg">Nightup Admin</span>
        <button onClick={async () => { await fetch("/api/admin/logout", { method: "POST" }); document.cookie = 'admin_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'; router.refresh(); }} className="text-xs px-4 py-2 rounded-lg" style={{ backgroundColor: "#111120", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(232,160,32,0.12)" }}>Logout</button>
      </div>

      {/* Summary bar */}
      <div className="px-6 py-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs border-b" style={{ borderColor: "rgba(232,160,32,0.12)", backgroundColor: "#0a0a14" }}>
        {[
          { label: "Events", arr: ev },
          { label: "Pros", arr: pr },
          { label: "Articles", arr: ar },
          { label: "Organizers", arr: og },
        ].map(({ label, arr }) => (
          <span key={label} style={{ color: "#888" }}>
            {label}: <span style={{ color: cnt(arr, "pending") > 0 ? "#E8A020" : "#555" }}>{cnt(arr, "pending")} pending</span>
            {" · "}
            <span style={{ color: "#16a34a" }}>{cnt(arr, "approved")} active</span>
          </span>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-5 pb-0 overflow-x-auto">
        {(["events", "professionals", "articles", "organizers", "music", "users"] as Tab[]).map((tab) => {
          const pendingCount = tab === "music" ? totalMusicPending : cnt(allContent[tab as keyof AllContent] as ContentItem[] ?? [], "pending");
          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setShowAddForm(false); setAddError(""); setAddSuccess(""); }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-sm font-medium capitalize transition-all whitespace-nowrap"
              style={{ backgroundColor: activeTab === tab ? "#111120" : "transparent", color: activeTab === tab ? "#fff" : "#666", borderBottom: activeTab === tab ? "2px solid #E8A020" : "2px solid transparent" }}
            >
              {tab}
              {pendingCount > 0 && <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>{pendingCount}</span>}
            </button>
          );
        })}
        <button
          onClick={() => router.push('/admin/magazine')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-t-xl text-sm font-medium capitalize transition-all whitespace-nowrap"
          style={{ backgroundColor: "transparent", color: "#666", borderBottom: "2px solid transparent" }}
        >
          magazine
        </button>
      </div>

      <div className="px-6 py-6 max-w-5xl">
        {/* Music sub-tabs */}
        {activeTab === "music" && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {(["releases", "mixes", "playlists", "artists"] as MusicSubTab[]).map((sub) => {
              const subArr = allContent[sub as keyof AllContent] as ContentItem[] ?? [];
              const subPending = subArr.filter(i => i.status === "pending").length;
              return (
                <button
                  key={sub}
                  onClick={() => { setMusicSubTab(sub); setShowAddForm(false); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all whitespace-nowrap"
                  style={{ backgroundColor: musicSubTab === sub ? "#E8A020" : "#111120", color: musicSubTab === sub ? "#0F0F1A" : "rgba(255,255,255,0.45)", border: `1px solid ${musicSubTab === sub ? "#E8A020" : "rgba(232,160,32,0.12)"}` }}
                >
                  {sub}
                  {subPending > 0 && <span className="text-xs px-1 py-0.5 rounded-full font-bold" style={{ backgroundColor: musicSubTab === sub ? "#0F0F1A" : "#E8A020", color: musicSubTab === sub ? "#E8A020" : "#0F0F1A" }}>{subPending}</span>}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "#666" }}>Registered Profiles</h2>
            {allContent.profiles?.length === 0 && (
              <p className="text-xs pl-1" style={{ color: "#3a3a4e" }}>No profiles yet.</p>
            )}
            {allContent.profiles?.map((profile: any) => (
              <div key={profile.id} className="flex items-center justify-between gap-3 p-3 rounded-xl" style={{ backgroundColor: "#111120", border: "1px solid rgba(232,160,32,0.12)" }}>
                <div className="flex items-center gap-3 min-w-0">
                  {profile.avatar_url && (
                    <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{profile.display_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">@{profile.username} · {profile.profile_type} · {profile.plan_tier}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {profile.is_verified ? (
                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: "rgba(232,160,32,0.15)", color: "#E8A020" }}>✓ Verified</span>
                  ) : (
                    <button
                      onClick={async () => {
                        await fetch("/api/admin/verify-profile", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ id: profile.id }),
                        });
                        await fetchContent();
                      }}
                      className="text-xs px-2 py-1 rounded-full transition-opacity hover:opacity-80"
                      style={{ backgroundColor: "#111120", color: "#666", border: "1px solid #444" }}
                    >
                      Verify
                    </button>
                  )}
                  <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: profile.is_featured ? "rgba(232,160,32,0.15)" : "#1a1a2e", color: profile.is_featured ? "#E8A020" : "#555" }}>
                    {profile.is_featured ? "★ Featured" : "Not featured"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-gray-600">Loading...</p>
        ) : (
          <>
            {renderSection("Pending Approval", pendingItems, "pending", "No pending submissions.")}
            {renderSection(activeTab === "organizers" || (activeTab === "music" && (musicSubTab === "artists")) ? "Approved" : "Published", publishedItems, "approved", "Nothing here.")}
            {renderSection("Hidden / Rejected", hiddenItems, "hidden", "Nothing hidden.")}
          </>
        )}

        <div className="border-t my-6" style={{ borderColor: "rgba(232,160,32,0.08)" }} />

        {/* Add New */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Add New {activeTab === "music" ? musicSubTab.slice(0, -1) : activeTab === "professionals" ? "Professional" : activeTab.slice(0, -1)}
            </h2>
            <button
              onClick={() => { setShowAddForm((v) => !v); setAddError(""); setAddSuccess(""); }}
              className="text-xs px-4 py-2 rounded-lg font-medium"
              style={{ backgroundColor: showAddForm ? "#111120" : "#E8A020", color: showAddForm ? "rgba(255,255,255,0.45)" : "#0F0F1A", border: showAddForm ? "1px solid rgba(232,160,32,0.12)" : "none" }}
            >
              {showAddForm ? "Cancel" : "+ Add New"}
            </button>
          </div>

          {addSuccess && !showAddForm && <p className="text-green-400 text-sm mb-4">{addSuccess}</p>}

          {showAddForm && (
            <div className="p-6 rounded-2xl" style={{ backgroundColor: "#111120", border: "1px solid rgba(232,160,32,0.12)" }}>

              {/* EVENT FORM */}
              {activeTab === "events" && (
                <form onSubmit={handleAddEvent} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={labelCls}>Title *</label><input required className={inputCls} style={inputStyle} value={eventForm.title} onChange={(e) => setEventForm((f) => ({ ...f, title: e.target.value }))} /></div>
                    <div><label className={labelCls}>Venue *</label><input required className={inputCls} style={inputStyle} value={eventForm.venue} onChange={(e) => setEventForm((f) => ({ ...f, venue: e.target.value }))} /></div>
                    <div><label className={labelCls}>Date *</label><input required type="date" className={inputCls} style={inputStyle} value={eventForm.date} onChange={(e) => setEventForm((f) => ({ ...f, date: e.target.value }))} /></div>
                    <div><label className={labelCls}>Time</label><input className={inputCls} style={inputStyle} value={eventForm.time} onChange={(e) => setEventForm((f) => ({ ...f, time: e.target.value }))} placeholder="23:00" /></div>
                    <div><label className={labelCls}>Genre</label><select className={inputCls} style={inputStyle} value={eventForm.genre} onChange={(e) => setEventForm((f) => ({ ...f, genre: e.target.value }))}>{GENRES.map((g) => <option key={g}>{g}</option>)}</select></div>
                    <div><label className={labelCls}>City</label><select className={inputCls} style={inputStyle} value={eventForm.city} onChange={(e) => setEventForm((f) => ({ ...f, city: e.target.value }))}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></div>
                    <div><label className={labelCls}>Price</label><input className={inputCls} style={inputStyle} value={eventForm.price} onChange={(e) => setEventForm((f) => ({ ...f, price: e.target.value }))} placeholder="€15" /></div>
                    <div><label className={labelCls}>Image URL</label><input className={inputCls} style={inputStyle} value={eventForm.image_url} onChange={(e) => { setEventForm((f) => ({ ...f, image_url: e.target.value })); setAdminEventPhoto(""); }} placeholder="https://..." /></div>
                    <div>
                      <label className={labelCls}>Upload Photo (max 5MB)</label>
                      <div className="w-full px-3 py-2 rounded-lg text-sm cursor-pointer" style={{ backgroundColor: "#0F0F1A", border: "1px dashed #555", color: "#aaa" }} onClick={() => adminEventPhotoRef.current?.click()}>
                        <input ref={adminEventPhotoRef} type="file" accept="image/*" className="hidden" onChange={handleAdminEventPhotoChange} />
                        <span>{adminEventPhoto ? "Uploaded — click to change" : "Click to upload"}</span>
                      </div>
                      {adminEventPhotoError && <p className="text-red-400 text-xs mt-1">{adminEventPhotoError}</p>}
                      {adminEventPhoto && <img src={adminEventPhoto} alt="Preview" className="w-full rounded-lg object-cover mt-2" style={{ maxHeight: "120px" }} />}
                    </div>
                    <div>
                      <label className={labelCls}>Organizer</label>
                      <select className={inputCls} style={inputStyle} value={(eventForm as any).organizer_id ?? ""} onChange={(e) => setEventForm((f) => ({ ...f, organizer_id: e.target.value || null } as any))}>
                        <option value="">— None —</option>
                        {allContent.organizers.filter(o => o.status === "approved").map((o) => <option key={String(o.id)} value={String(o.id)}>{o.name as string}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2"><label className={labelCls}>Lineup (comma-separated)</label><input className={inputCls} style={inputStyle} value={eventForm.lineup} onChange={(e) => setEventForm((f) => ({ ...f, lineup: e.target.value }))} placeholder="DJ One, DJ Two" /></div>
                    <div className="sm:col-span-2"><label className={labelCls}>Description</label><textarea rows={3} className={inputCls} style={inputStyle} value={eventForm.description} onChange={(e) => setEventForm((f) => ({ ...f, description: e.target.value }))} /></div>
                    <div className="sm:col-span-2"><label className={labelCls}>Ticket URL</label><input className={inputCls} style={inputStyle} value={eventForm.ticket_url} onChange={(e) => setEventForm((f) => ({ ...f, ticket_url: e.target.value }))} /></div>
                  </div>
                  {addError && <p className="text-red-400 text-xs">{addError}</p>}
                  <button type="submit" disabled={addLoading} className="px-6 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>{addLoading ? "Saving..." : "Add Event"}</button>
                </form>
              )}

              {/* PROFESSIONAL FORM */}
              {activeTab === "professionals" && (
                <form onSubmit={handleAddPro} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={labelCls}>Name *</label><input required className={inputCls} style={inputStyle} value={proForm.name} onChange={(e) => setProForm((f) => ({ ...f, name: e.target.value }))} /></div>
                    <div><label className={labelCls}>Category</label><select className={inputCls} style={inputStyle} value={proForm.category} onChange={(e) => setProForm((f) => ({ ...f, category: e.target.value }))}>{PRO_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
                    <div><label className={labelCls}>City</label><input className={inputCls} style={inputStyle} value={proForm.city} onChange={(e) => setProForm((f) => ({ ...f, city: e.target.value }))} /></div>
                    <div><label className={labelCls}>Rating (0–5)</label><input type="number" min="0" max="5" step="0.1" className={inputCls} style={inputStyle} value={proForm.rating} onChange={(e) => setProForm((f) => ({ ...f, rating: e.target.value }))} /></div>
                    <div><label className={labelCls}>Avatar URL</label><input className={inputCls} style={inputStyle} value={proForm.avatar} onChange={(e) => setProForm((f) => ({ ...f, avatar: e.target.value }))} placeholder="https://..." /></div>
                    <div><label className={labelCls}>Review Count</label><input type="number" min="0" className={inputCls} style={inputStyle} value={proForm.reviews_count} onChange={(e) => setProForm((f) => ({ ...f, reviews_count: e.target.value }))} /></div>
                    <div className="sm:col-span-2"><label className={labelCls}>Description</label><textarea rows={3} className={inputCls} style={inputStyle} value={proForm.description} onChange={(e) => setProForm((f) => ({ ...f, description: e.target.value }))} /></div>
                  </div>
                  {addError && <p className="text-red-400 text-xs">{addError}</p>}
                  <button type="submit" disabled={addLoading} className="px-6 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>{addLoading ? "Saving..." : "Add Professional"}</button>
                </form>
              )}

              {/* ARTICLE FORM */}
              {activeTab === "articles" && (
                <form onSubmit={handleAddArticle} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2"><label className={labelCls}>Title *</label><input required className={inputCls} style={inputStyle} value={articleForm.title} onChange={(e) => setArticleForm((f) => ({ ...f, title: e.target.value }))} /></div>
                    <div><label className={labelCls}>Category</label><select className={inputCls} style={inputStyle} value={articleForm.category} onChange={(e) => setArticleForm((f) => ({ ...f, category: e.target.value }))}>{ART_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
                    <div><label className={labelCls}>Date</label><input type="date" className={inputCls} style={inputStyle} value={articleForm.date} onChange={(e) => setArticleForm((f) => ({ ...f, date: e.target.value }))} /></div>
                    <div><label className={labelCls}>Read Time (min)</label><input type="number" min="1" className={inputCls} style={inputStyle} value={articleForm.read_time} onChange={(e) => setArticleForm((f) => ({ ...f, read_time: e.target.value }))} placeholder="5" /></div>
                    <div><label className={labelCls}>Image URL</label><input className={inputCls} style={inputStyle} value={articleForm.image} onChange={(e) => setArticleForm((f) => ({ ...f, image: e.target.value }))} placeholder="https://..." /></div>
                    <div><label className={labelCls}>Series Slug</label><input className={inputCls} style={inputStyle} value={articleForm.series} onChange={(e) => setArticleForm((f) => ({ ...f, series: e.target.value }))} placeholder="recovery-blueprint" /></div>
                    <div><label className={labelCls}>Series Order</label><input type="number" min="1" className={inputCls} style={inputStyle} value={articleForm.series_order} onChange={(e) => setArticleForm((f) => ({ ...f, series_order: e.target.value }))} placeholder="1" /></div>
                    <div className="sm:col-span-2"><label className={labelCls}>Excerpt</label><textarea rows={2} className={inputCls} style={inputStyle} value={articleForm.excerpt} onChange={(e) => setArticleForm((f) => ({ ...f, excerpt: e.target.value }))} /></div>
                    <div className="sm:col-span-2">
                      <label className={labelCls}>Content</label>
                      <RichTextEditor initialContent={articleContent} onChange={setArticleContent} />
                    </div>
                    <div className="flex items-center gap-2"><input type="checkbox" id="art_featured" checked={articleForm.featured} onChange={(e) => setArticleForm((f) => ({ ...f, featured: e.target.checked }))} /><label htmlFor="art_featured" className="text-sm text-gray-300">Featured article</label></div>
                  </div>
                  {addError && <p className="text-red-400 text-xs">{addError}</p>}
                  <button type="submit" disabled={addLoading} className="px-6 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>{addLoading ? "Saving..." : "Add Article"}</button>
                </form>
              )}

              {/* ORGANIZER FORM */}
              {activeTab === "organizers" && (
                <form onSubmit={handleAddOrganizer} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={labelCls}>Name *</label><input required className={inputCls} style={inputStyle} value={orgForm.name} onChange={(e) => setOrgForm((f) => ({ ...f, name: e.target.value }))} /></div>
                    <div><label className={labelCls}>Type</label><select className={inputCls} style={inputStyle} value={orgForm.type} onChange={(e) => setOrgForm((f) => ({ ...f, type: e.target.value }))}>{ORG_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
                    <div><label className={labelCls}>City</label><select className={inputCls} style={inputStyle} value={orgForm.city} onChange={(e) => setOrgForm((f) => ({ ...f, city: e.target.value }))}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></div>
                    <div><label className={labelCls}>Avatar URL</label><input className={inputCls} style={inputStyle} value={orgForm.avatar} onChange={(e) => setOrgForm((f) => ({ ...f, avatar: e.target.value }))} placeholder="https://..." /></div>
                    <div><label className={labelCls}>Cover Image URL</label><input className={inputCls} style={inputStyle} value={orgForm.cover_image} onChange={(e) => setOrgForm((f) => ({ ...f, cover_image: e.target.value }))} placeholder="https://..." /></div>
                    <div><label className={labelCls}>Instagram</label><input className={inputCls} style={inputStyle} value={orgForm.instagram} onChange={(e) => setOrgForm((f) => ({ ...f, instagram: e.target.value }))} /></div>
                    <div><label className={labelCls}>Facebook</label><input className={inputCls} style={inputStyle} value={orgForm.facebook} onChange={(e) => setOrgForm((f) => ({ ...f, facebook: e.target.value }))} /></div>
                    <div><label className={labelCls}>TikTok</label><input className={inputCls} style={inputStyle} value={orgForm.tiktok} onChange={(e) => setOrgForm((f) => ({ ...f, tiktok: e.target.value }))} /></div>
                    <div><label className={labelCls}>Website</label><input className={inputCls} style={inputStyle} value={orgForm.website} onChange={(e) => setOrgForm((f) => ({ ...f, website: e.target.value }))} /></div>
                    <div className="sm:col-span-2"><label className={labelCls}>About</label><textarea rows={3} className={inputCls} style={inputStyle} value={orgForm.about} onChange={(e) => setOrgForm((f) => ({ ...f, about: e.target.value }))} /></div>
                  </div>
                  {addError && <p className="text-red-400 text-xs">{addError}</p>}
                  <button type="submit" disabled={addLoading} className="px-6 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>{addLoading ? "Saving..." : "Add Organizer"}</button>
                </form>
              )}

              {/* RELEASE FORM */}
              {activeTab === "music" && musicSubTab === "releases" && (
                <form onSubmit={handleAddRelease} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={labelCls}>Title *</label><input required className={inputCls} style={inputStyle} value={releaseForm.title} onChange={(e) => setReleaseForm((f) => ({ ...f, title: e.target.value }))} /></div>
                    <div><label className={labelCls}>Artist *</label><input required className={inputCls} style={inputStyle} value={releaseForm.artist} onChange={(e) => setReleaseForm((f) => ({ ...f, artist: e.target.value }))} /></div>
                    <div><label className={labelCls}>Type</label><select className={inputCls} style={inputStyle} value={releaseForm.type} onChange={(e) => setReleaseForm((f) => ({ ...f, type: e.target.value }))}>{RELEASE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
                    <div><label className={labelCls}>Genre</label><select className={inputCls} style={inputStyle} value={releaseForm.genre} onChange={(e) => setReleaseForm((f) => ({ ...f, genre: e.target.value }))}>{MUSIC_GENRES.map((g) => <option key={g}>{g}</option>)}</select></div>
                    <div><label className={labelCls}>Cover Image URL</label><input className={inputCls} style={inputStyle} value={releaseForm.cover_image} onChange={(e) => setReleaseForm((f) => ({ ...f, cover_image: e.target.value }))} placeholder="https://..." /></div>
                    <div><label className={labelCls}>Release Date</label><input type="date" className={inputCls} style={inputStyle} value={releaseForm.release_date} onChange={(e) => setReleaseForm((f) => ({ ...f, release_date: e.target.value }))} /></div>
                    <div><label className={labelCls}>Spotify URL</label><input className={inputCls} style={inputStyle} value={releaseForm.spotify_url} onChange={(e) => setReleaseForm((f) => ({ ...f, spotify_url: e.target.value }))} /></div>
                    <div><label className={labelCls}>SoundCloud URL</label><input className={inputCls} style={inputStyle} value={releaseForm.soundcloud_url} onChange={(e) => setReleaseForm((f) => ({ ...f, soundcloud_url: e.target.value }))} /></div>
                    <div className="sm:col-span-2"><label className={labelCls}>Description</label><textarea rows={3} className={inputCls} style={inputStyle} value={releaseForm.description} onChange={(e) => setReleaseForm((f) => ({ ...f, description: e.target.value }))} /></div>
                    <div className="flex items-center gap-2"><input type="checkbox" id="is_promoted" checked={releaseForm.is_promoted} onChange={(e) => setReleaseForm((f) => ({ ...f, is_promoted: e.target.checked }))} /><label htmlFor="is_promoted" className="text-sm text-gray-300">Promoted</label></div>
                  </div>
                  {addError && <p className="text-red-400 text-xs">{addError}</p>}
                  <button type="submit" disabled={addLoading} className="px-6 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>{addLoading ? "Saving..." : "Add Release"}</button>
                </form>
              )}

              {/* MIX FORM */}
              {activeTab === "music" && musicSubTab === "mixes" && (
                <form onSubmit={handleAddMix} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={labelCls}>Title *</label><input required className={inputCls} style={inputStyle} value={mixForm.title} onChange={(e) => setMixForm((f) => ({ ...f, title: e.target.value }))} /></div>
                    <div><label className={labelCls}>Artist *</label><input required className={inputCls} style={inputStyle} value={mixForm.artist} onChange={(e) => setMixForm((f) => ({ ...f, artist: e.target.value }))} /></div>
                    <div><label className={labelCls}>Genre</label><select className={inputCls} style={inputStyle} value={mixForm.genre} onChange={(e) => setMixForm((f) => ({ ...f, genre: e.target.value }))}>{MUSIC_GENRES.map((g) => <option key={g}>{g}</option>)}</select></div>
                    <div><label className={labelCls}>Duration (e.g. 1:23:00)</label><input className={inputCls} style={inputStyle} value={mixForm.duration} onChange={(e) => setMixForm((f) => ({ ...f, duration: e.target.value }))} /></div>
                    <div><label className={labelCls}>Cover Image URL</label><input className={inputCls} style={inputStyle} value={mixForm.cover_image} onChange={(e) => setMixForm((f) => ({ ...f, cover_image: e.target.value }))} /></div>
                    <div><label className={labelCls}>SoundCloud URL</label><input className={inputCls} style={inputStyle} value={mixForm.soundcloud_url} onChange={(e) => setMixForm((f) => ({ ...f, soundcloud_url: e.target.value }))} /></div>
                  </div>
                  {addError && <p className="text-red-400 text-xs">{addError}</p>}
                  <button type="submit" disabled={addLoading} className="px-6 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>{addLoading ? "Saving..." : "Add Mix"}</button>
                </form>
              )}

              {/* PLAYLIST FORM */}
              {activeTab === "music" && musicSubTab === "playlists" && (
                <form onSubmit={handleAddPlaylist} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={labelCls}>Title *</label><input required className={inputCls} style={inputStyle} value={playlistForm.title} onChange={(e) => setPlaylistForm((f) => ({ ...f, title: e.target.value }))} /></div>
                    <div><label className={labelCls}>Platform</label><select className={inputCls} style={inputStyle} value={playlistForm.platform} onChange={(e) => setPlaylistForm((f) => ({ ...f, platform: e.target.value }))}><option>Spotify</option><option>SoundCloud</option><option>YouTube</option></select></div>
                    <div><label className={labelCls}>Embed / Link URL</label><input className={inputCls} style={inputStyle} value={playlistForm.embed_url} onChange={(e) => setPlaylistForm((f) => ({ ...f, embed_url: e.target.value }))} /></div>
                    <div><label className={labelCls}>Cover Image URL</label><input className={inputCls} style={inputStyle} value={playlistForm.cover_image} onChange={(e) => setPlaylistForm((f) => ({ ...f, cover_image: e.target.value }))} /></div>
                    <div className="flex items-center gap-2"><input type="checkbox" id="is_sponsored" checked={playlistForm.is_sponsored} onChange={(e) => setPlaylistForm((f) => ({ ...f, is_sponsored: e.target.checked }))} /><label htmlFor="is_sponsored" className="text-sm text-gray-300">Sponsored</label></div>
                  </div>
                  {addError && <p className="text-red-400 text-xs">{addError}</p>}
                  <button type="submit" disabled={addLoading} className="px-6 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>{addLoading ? "Saving..." : "Add Playlist"}</button>
                </form>
              )}

              {/* ARTIST FORM */}
              {activeTab === "music" && musicSubTab === "artists" && (
                <form onSubmit={handleAddArtist} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className={labelCls}>Name *</label><input required className={inputCls} style={inputStyle} value={artistForm.name} onChange={(e) => setArtistForm((f) => ({ ...f, name: e.target.value }))} /></div>
                    <div><label className={labelCls}>Origin (city/country)</label><input className={inputCls} style={inputStyle} value={artistForm.origin} onChange={(e) => setArtistForm((f) => ({ ...f, origin: e.target.value }))} /></div>
                    <div><label className={labelCls}>Genres (comma-separated)</label><input className={inputCls} style={inputStyle} value={artistForm.genres} onChange={(e) => setArtistForm((f) => ({ ...f, genres: e.target.value }))} placeholder="House, Techno" /></div>
                    <div><label className={labelCls}>Style Tags (comma-separated)</label><input className={inputCls} style={inputStyle} value={artistForm.style_tags} onChange={(e) => setArtistForm((f) => ({ ...f, style_tags: e.target.value }))} placeholder="Dark, Atmospheric" /></div>
                    <div><label className={labelCls}>Photo URL</label><input className={inputCls} style={inputStyle} value={artistForm.photo} onChange={(e) => setArtistForm((f) => ({ ...f, photo: e.target.value }))} /></div>
                    <div><label className={labelCls}>Spotify URL</label><input className={inputCls} style={inputStyle} value={artistForm.spotify_url} onChange={(e) => setArtistForm((f) => ({ ...f, spotify_url: e.target.value }))} /></div>
                    <div><label className={labelCls}>SoundCloud URL</label><input className={inputCls} style={inputStyle} value={artistForm.soundcloud_url} onChange={(e) => setArtistForm((f) => ({ ...f, soundcloud_url: e.target.value }))} /></div>
                    <div><label className={labelCls}>Instagram</label><input className={inputCls} style={inputStyle} value={artistForm.instagram} onChange={(e) => setArtistForm((f) => ({ ...f, instagram: e.target.value }))} /></div>
                    <div><label className={labelCls}>Website</label><input className={inputCls} style={inputStyle} value={artistForm.website} onChange={(e) => setArtistForm((f) => ({ ...f, website: e.target.value }))} /></div>
                    <div className="sm:col-span-2"><label className={labelCls}>About (biography)</label><textarea rows={4} className={inputCls} style={inputStyle} value={artistForm.about} onChange={(e) => setArtistForm((f) => ({ ...f, about: e.target.value }))} /></div>
                  </div>
                  {addError && <p className="text-red-400 text-xs">{addError}</p>}
                  <button type="submit" disabled={addLoading} className="px-6 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>{addLoading ? "Saving..." : "Add Artist"}</button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ backgroundColor: "#0F0F1A", border: "1px solid #dc2626" }}>
            <p className="text-sm font-semibold">Are you sure?</p>
            <p className="text-xs text-gray-400">This action is permanent and cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} disabled={actionId === confirmDelete.id} className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40" style={{ backgroundColor: "#dc2626", color: "#fff" }}>{actionId === confirmDelete.id ? "Deleting..." : "Yes, Delete"}</button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#111120", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(232,160,32,0.12)" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.85)" }} onClick={(e) => { if (e.target === e.currentTarget) setEditItem(null); }}>
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6" style={{ backgroundColor: "#0F0F1A", border: "1px solid #E8A020" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold" style={{ color: "#E8A020" }}>Edit</h2>
              <button onClick={() => setEditItem(null)} className="text-sm px-3 py-1 rounded-lg" style={{ backgroundColor: "#111120", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(232,160,32,0.12)" }}>Close</button>
            </div>
            <EditForm item={editItem} tab={previewTab} subtab={activeTab === "music" ? musicSubTab : undefined} onSave={handleEditSave} loading={editLoading} error={editError} inputCls={inputCls} inputStyle={inputStyle} labelCls={labelCls} genres={GENRES} cities={CITIES} proCategories={PRO_CATEGORIES} artCategories={ART_CATEGORIES} orgTypes={ORG_TYPES} releaseTypes={RELEASE_TYPES} musicGenres={MUSIC_GENRES} approvedOrgs={allContent.organizers.filter(o => o.status === "approved")} />
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.8)" }} onClick={(e) => { if (e.target === e.currentTarget) setPreviewItem(null); }}>
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6 space-y-4" style={{ backgroundColor: "#0F0F1A", border: "1px solid #E8A020" }}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-base font-bold" style={{ color: "#E8A020" }}>Preview</h2>
              <button onClick={() => setPreviewItem(null)} className="text-sm px-3 py-1 rounded-lg" style={{ backgroundColor: "#111120", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(232,160,32,0.12)" }}>Close</button>
            </div>
            {(previewItem.image_url || previewItem.cover_image || previewItem.photo || previewItem.avatar) ? (
              <img src={String(previewItem.image_url || previewItem.cover_image || previewItem.photo || previewItem.avatar || "")} alt="preview" className="w-full rounded-lg object-cover" style={{ maxHeight: "200px" }} />
            ) : null}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {Object.entries(previewItem).filter(([k]) => !["id", "created_at", "updated_at", "photos", "gallery"].includes(k)).map(([k, v]) => (
                <div key={k} className={String(v).length > 60 ? "col-span-2" : ""}>
                  <p className="text-xs text-gray-500 mb-0.5 capitalize">{k.replace(/_/g, " ")}</p>
                  <p className="text-sm text-white break-words">{Array.isArray(v) ? v.join(", ") : String(v ?? "—")}</p>
                </div>
              ))}
            </div>

            {/* Organizer assignment for events */}
            {previewTab === "events" && (
              <div>
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Assign Organizer</p>
                <div className="flex gap-2">
                  <select value={assignOrgId} onChange={(e) => setAssignOrgId(e.target.value)} className="flex-1 px-3 py-2 rounded-lg text-sm outline-none" style={{ backgroundColor: "#0F0F1A", color: "#fff", border: "1px solid #444" }}>
                    <option value="">— No organizer —</option>
                    {allContent.organizers.filter(o => o.status === "approved").map((o) => (
                      <option key={String(o.id)} value={String(o.id)}>{o.name as string}</option>
                    ))}
                  </select>
                  <button
                    disabled={assignLoading}
                    onClick={async () => {
                      setAssignLoading(true);
                      await fetch("/api/admin/organizers/assign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: String(previewItem.id), organizerId: assignOrgId || null }) });
                      setAssignLoading(false);
                      await fetchContent();
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-40"
                    style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
                  >
                    {assignLoading ? "..." : "Save"}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2 border-t" style={{ borderColor: "rgba(232,160,32,0.08)" }}>
              {previewItem.status !== "approved" && (
                <button onClick={async () => { await handleAction(String(previewItem.id), "approved", previewTab, activeTab === "music" ? musicSubTab : undefined); setPreviewItem(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#16a34a", color: "#fff" }}>✅ Approve</button>
              )}
              {previewItem.status !== "hidden" && previewItem.status !== "rejected" && (
                <button onClick={async () => { await handleAction(String(previewItem.id), "hidden", previewTab, activeTab === "music" ? musicSubTab : undefined); setPreviewItem(null); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#78350f", color: "#fbbf24" }}>🙈 Hide</button>
              )}
              <button onClick={() => { setPreviewItem(null); setConfirmDelete({ id: String(previewItem.id), tab: previewTab, subtab: activeTab === "music" ? musicSubTab : undefined }); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#450a0a", color: "#fca5a5" }}>🗑️ Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditForm({ item, tab, subtab, onSave, loading, error, inputCls, inputStyle, labelCls, genres, cities, proCategories, artCategories, orgTypes, releaseTypes, musicGenres, approvedOrgs }: {
  item: ContentItem; tab: string; subtab?: string;
  onSave: (table: string, id: string, data: Record<string, unknown>) => void;
  loading: boolean; error: string;
  inputCls: string; inputStyle: React.CSSProperties; labelCls: string;
  genres: string[]; cities: string[]; proCategories: string[]; artCategories: string[]; orgTypes: string[]; releaseTypes: string[]; musicGenres: string[];
  approvedOrgs: ContentItem[];
}) {
  const [form, setForm] = useState<Record<string, unknown>>({ ...item });

  function field(key: string, label: string, type: "text" | "textarea" | "select" | "date" | "number" | "checkbox" = "text", options?: string[], colSpan = false) {
    const val = form[key] ?? "";
    return (
      <div key={key} className={colSpan ? "sm:col-span-2" : ""}>
        <label className={labelCls}>{label}</label>
        {type === "textarea" ? (
          <textarea rows={3} className={inputCls} style={inputStyle} value={String(val)} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
        ) : type === "select" && options ? (
          <select className={inputCls} style={inputStyle} value={String(val)} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}>
            {options.map((o) => <option key={o}>{o}</option>)}
          </select>
        ) : type === "checkbox" ? (
          <div className="flex items-center gap-2 mt-1">
            <input type="checkbox" checked={!!val} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))} />
            <span className="text-sm text-gray-300">{label}</span>
          </div>
        ) : (
          <input type={type} className={inputCls} style={inputStyle} value={String(val)} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
        )
        }
      </div>
    );
  }

  function getTable() {
    if (tab === "music") return subtab ?? "music_releases";
    if (tab === "professionals") return "professionals";
    if (tab === "organizers") return "organizers";
    if (tab === "articles") return "articles";
    return tab;
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(getTable(), String(item.id), form); }} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tab === "events" && (<>
          {field("title", "Title")}
          {field("venue", "Venue")}
          {field("date", "Date", "date")}
          {field("time", "Start Time")}
          {field("end_time", "End Time")}
          {field("genre", "Primary Genre", "select", genres)}
          {field("city", "City", "select", cities)}
          {field("type", "Event Type", "select", ["Club Night", "Live Show", "Festival", "Open Air", "Private Party", "Other"])}
          {field("price", "Price")}
          {field("image_url", "Image URL")}
          {field("address", "Address")}
          {field("maps_url", "Maps URL")}
          {field("ticket_url", "Ticket URL", "text", undefined, true)}
          {field("short_description", "Short Description", "text", undefined, true)}
          <div>
            <label className={labelCls}>Organizer</label>
            <select className={inputCls} style={inputStyle} value={String(form.organizer_id ?? "")} onChange={(e) => setForm((f) => ({ ...f, organizer_id: e.target.value || null }))}>
              <option value="">— None —</option>
              {approvedOrgs.map((o) => <option key={String(o.id)} value={String(o.id)}>{o.name as string}</option>)}
            </select>
          </div>
          {field("lineup", "Lineup (comma-separated)", "text", undefined, true)}
          {field("dress_code", "Dress Code", "text", undefined, true)}
          {field("age_restriction", "18+ Age Restriction", "checkbox", undefined, true)}
          {field("instagram", "Instagram")}
          {field("facebook", "Facebook")}
          {field("tiktok", "TikTok")}
          {field("contact_email", "Contact Email")}
          {field("description", "Description", "textarea", undefined, true)}
          {field("full_description", "Full Description", "textarea", undefined, true)}
        </>)}
        {tab === "professionals" && (<>
          {field("name", "Name")}
          {field("category", "Category", "select", proCategories)}
          {field("city", "City", "select", cities)}
          {field("description", "Description", "textarea", undefined, true)}
        </>)}
        {tab === "articles" && (<>
          {field("title", "Title", "text", undefined, true)}
          {field("category", "Category", "select", artCategories)}
          {field("date", "Date", "date")}
          {field("read_time", "Read Time")}
          {field("hero_image", "Hero Image URL")}
          {field("excerpt", "Excerpt", "textarea", undefined, true)}
          {field("series", "Series Slug")}
          {field("series_order", "Series Order", "number")}
          <div className="sm:col-span-2">
            <label className={labelCls}>Content</label>
            <RichTextEditor
              initialContent={String(form["content"] || form["body"] || "")}
              onChange={(html) => setForm((f) => ({ ...f, content: html, body: html }))}
            />
          </div>
          {field("featured", "Featured", "checkbox", undefined, true)}
        </>)}
        {tab === "organizers" && (<>
          {field("name", "Name")}
          {field("type", "Type", "select", orgTypes)}
          {field("city", "City", "select", cities)}
          {field("avatar", "Avatar URL")}
          {field("cover_image", "Cover Image URL")}
          {field("instagram", "Instagram")}
          {field("facebook", "Facebook")}
          {field("tiktok", "TikTok")}
          {field("website", "Website")}
          {field("about", "About", "textarea", undefined, true)}
        </>)}
        {tab === "music" && subtab === "releases" && (<>
          {field("title", "Title")}
          {field("artist", "Artist")}
          {field("type", "Type", "select", releaseTypes)}
          {field("genre", "Genre", "select", musicGenres)}
          {field("cover_image", "Cover Image URL")}
          {field("release_date", "Release Date", "date")}
          {field("spotify_url", "Spotify URL")}
          {field("soundcloud_url", "SoundCloud URL")}
          {field("description", "Description", "textarea", undefined, true)}
          {field("is_promoted", "Promoted", "checkbox", undefined, true)}
        </>)}
        {tab === "music" && subtab === "mixes" && (<>
          {field("title", "Title")}
          {field("artist", "Artist")}
          {field("genre", "Genre", "select", musicGenres)}
          {field("duration", "Duration")}
          {field("cover_image", "Cover Image URL")}
          {field("soundcloud_url", "SoundCloud URL")}
        </>)}
        {tab === "music" && subtab === "playlists" && (<>
          {field("title", "Title")}
          {field("platform", "Platform")}
          {field("embed_url", "Embed / Link URL")}
          {field("cover_image", "Cover Image URL")}
          {field("is_sponsored", "Sponsored", "checkbox", undefined, true)}
        </>)}
        {tab === "music" && subtab === "artists" && (<>
          {field("name", "Name")}
          {field("origin", "Origin")}
          {field("photo", "Photo URL")}
          {field("spotify_url", "Spotify URL")}
          {field("soundcloud_url", "SoundCloud URL")}
          {field("instagram", "Instagram")}
          {field("website", "Website")}
          {field("about", "About", "textarea", undefined, true)}
        </>)}
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>{loading ? "Saving..." : "Save Changes"}</button>
    </form>
  );
}
