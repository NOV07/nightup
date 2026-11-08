"use client";

import { useCallback, useEffect, useState } from "react";
import LocationPicker from "@/components/maps/LocationPicker";
import { extractCoords } from "@/app/lib/mapsCoords";
import { slugify } from "@/app/lib/slug";
import { MAX_WELLNESS_PHOTOS, MAX_WELLNESS_SUBCATEGORIES, WELLNESS_SUBS } from "@/app/lib/wellnessSpots";

// Wellness spots tab. The admin panel is English, but this tab is Greek by
// request, so the labels below are deliberately not routed through i18n.

interface WellnessSpot {
  id: string;
  slug: string;
  name: string;
  area: string | null;
  kind: string;
  description: string | null;
  best_time: string;
  has_bench: boolean | null;
  access_note: string | null;
  lat: number | null;
  lng: number | null;
  coords_verified: boolean;
  verified_night: boolean;
  photo_urls: string[];
  subcategories: string[];
  source_url: string | null;
  published: boolean;
}

const KINDS: [string, string][] = [["viewpoint", "Θέα"], ["hill", "Λόφος"], ["park", "Πάρκο"], ["square", "Πλατεία"]];
const BEST_TIMES: [string, string][] = [["day", "Μέρα"], ["sunset", "Ηλιοβασίλεμα"], ["night", "Βράδυ"], ["all", "Όλη μέρα"]];
const BENCH: [string, string][] = [["yes", "Ναι"], ["no", "Όχι"], ["unknown", "Άγνωστο"]];
const label = (list: [string, string][], v: string) => list.find(([k]) => k === v)?.[1] ?? v;

interface FormState {
  name: string; slug: string; area: string; kind: string; best_time: string;
  has_bench: "yes" | "no" | "unknown"; access_note: string; description: string;
  lat: number | null; lng: number | null; coords_verified: boolean; verified_night: boolean;
  photo_urls: string[]; subcategories: string[]; source_url: string; published: boolean;
}

const EMPTY: FormState = {
  name: "", slug: "", area: "", kind: "viewpoint", best_time: "sunset", has_bench: "unknown",
  access_note: "", description: "", lat: null, lng: null, coords_verified: false,
  verified_night: false, photo_urls: [], subcategories: [], source_url: "", published: false,
};

function toForm(s: WellnessSpot): FormState {
  return {
    name: s.name, slug: s.slug, area: s.area ?? "", kind: s.kind, best_time: s.best_time,
    has_bench: s.has_bench === true ? "yes" : s.has_bench === false ? "no" : "unknown",
    access_note: s.access_note ?? "", description: s.description ?? "",
    lat: s.lat, lng: s.lng, coords_verified: s.coords_verified, verified_night: s.verified_night,
    photo_urls: s.photo_urls ?? [], subcategories: s.subcategories ?? [], source_url: s.source_url ?? "", published: s.published,
  };
}

function toPayload(f: FormState) {
  return {
    name: f.name, slug: f.slug.trim() || slugify(f.name), area: f.area, kind: f.kind,
    best_time: f.best_time, has_bench: f.has_bench === "yes" ? true : f.has_bench === "no" ? false : null,
    access_note: f.access_note, description: f.description, lat: f.lat, lng: f.lng,
    coords_verified: f.coords_verified, verified_night: f.verified_night,
    photo_urls: f.photo_urls, subcategories: f.subcategories, source_url: f.source_url, published: f.published,
  };
}

const inputCls = "w-full px-3 py-2 rounded-lg text-sm outline-none";
const inputStyle = { backgroundColor: "#0F0F1A", color: "#fff", border: "1px solid #444" };
const labelCls = "block text-xs text-gray-400 mb-1";
const hintCls = "text-xs mt-1";
const hintStyle = { color: "rgba(255,255,255,0.4)" };

function Badge({ children, on }: { children: React.ReactNode; on: boolean }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap" style={{
      backgroundColor: on ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.05)",
      color: on ? "#6ee7b7" : "rgba(255,255,255,0.35)",
      border: `1px solid ${on ? "rgba(52,211,153,0.3)" : "rgba(255,255,255,0.1)"}`,
    }}>{children}</span>
  );
}

export default function WellnessSpotsPanel() {
  const [spots, setSpots] = useState<WellnessSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // null = list view, "new" = create form, otherwise the spot being edited.
  const [editing, setEditing] = useState<WellnessSpot | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const [coordsText, setCoordsText] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/wellness-spots");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Σφάλμα φόρτωσης.");
      setSpots(json.spots);
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Σφάλμα φόρτωσης.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openForm(spot: WellnessSpot | "new") {
    setEditing(spot);
    setForm(spot === "new" ? EMPTY : toForm(spot));
    setFormError("");
    setCoordsText("");
  }

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm(f => ({ ...f, [k]: v }));
  const hasPin = form.lat != null && form.lng != null;

  function applyCoordsText(text: string) {
    setCoordsText(text);
    // Accepts "37.98, 23.73" or a full Google Maps link (parsed in the browser).
    const plain = text.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
    const parsed = plain ? { lat: Number(plain[1]), lng: Number(plain[2]) } : extractCoords(text);
    if (parsed && Math.abs(parsed.lat) <= 90 && Math.abs(parsed.lng) <= 180) {
      setForm(f => ({ ...f, lat: parsed.lat, lng: parsed.lng }));
    }
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const slug = form.slug.trim() || slugify(form.name);
    if (!slug) { setFormError("Συμπλήρωσε πρώτα το όνομα, για να ανέβουν οι φωτογραφίες."); return; }
    setUploading(true);
    setFormError("");
    let urls = form.photo_urls;
    for (const file of Array.from(files)) {
      if (urls.length >= MAX_WELLNESS_PHOTOS) { setFormError(`Μέχρι ${MAX_WELLNESS_PHOTOS} φωτογραφίες.`); break; }
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", slug);
      try {
        const res = await fetch("/api/admin/wellness-spots/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Δεν ανέβηκε η φωτογραφία.");
        urls = [...urls, json.url];
        setForm(f => ({ ...f, photo_urls: urls }));
      } catch (e) {
        setFormError(e instanceof Error ? e.message : "Δεν ανέβηκε η φωτογραφία.");
        break;
      }
    }
    setUploading(false);
  }

  function movePhoto(i: number, dir: -1 | 1) {
    setForm(f => {
      const next = [...f.photo_urls];
      const j = i + dir;
      if (j < 0 || j >= next.length) return f;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...f, photo_urls: next };
    });
  }

  function toggleSub(key: string) {
    setForm(f => {
      if (f.subcategories.includes(key)) return { ...f, subcategories: f.subcategories.filter(k => k !== key) };
      if (f.subcategories.length >= MAX_WELLNESS_SUBCATEGORIES) return f;
      return { ...f, subcategories: [...f.subcategories, key] };
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!form.name.trim()) { setFormError("Το όνομα είναι υποχρεωτικό."); return; }
    if (form.published && !hasPin) { setFormError("Βάλε pin στον χάρτη πριν τη δημοσίευση."); return; }
    setSaving(true);
    try {
      const isNew = editing === "new";
      const res = await fetch(isNew ? "/api/admin/wellness-spots" : `/api/admin/wellness-spots/${(editing as WellnessSpot).id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(form)),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Δεν αποθηκεύτηκε.");
      setNotice(isNew ? "Το σημείο δημιουργήθηκε." : "Οι αλλαγές αποθηκεύτηκαν.");
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Δεν αποθηκεύτηκε.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(spot: WellnessSpot) {
    if (!window.confirm(`Διαγραφή του «${spot.name}»; Σβήνονται και οι φωτογραφίες του.`)) return;
    const res = await fetch(`/api/admin/wellness-spots/${spot.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { setLoadError(json.error || "Δεν διαγράφηκε."); return; }
    setNotice(json.filesRemoved === false ? "Διαγράφηκε, αλλά κάποια αρχεία δεν σβήστηκαν από το bucket." : "Το σημείο διαγράφηκε.");
    await load();
  }

  // ── Form ────────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <form onSubmit={save} className="space-y-5 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{editing === "new" ? "Νέο wellness spot" : "Επεξεργασία wellness spot"}</h2>
          <button type="button" onClick={() => setEditing(null)} className="text-sm hover:opacity-80" style={{ color: "#aaa" }}>← Πίσω</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Όνομα *</label>
            <input className={inputCls} style={inputStyle} value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Slug</label>
            <input className={inputCls} style={inputStyle} value={form.slug} onChange={e => set("slug", e.target.value)} placeholder="Αυτόματα από το όνομα" />
          </div>
          <div>
            <label className={labelCls}>Περιοχή</label>
            <input className={inputCls} style={inputStyle} value={form.area} onChange={e => set("area", e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Είδος</label>
            <select className={inputCls} style={inputStyle} value={form.kind} onChange={e => set("kind", e.target.value)}>
              {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Καλύτερη ώρα</label>
            <select className={inputCls} style={inputStyle} value={form.best_time} onChange={e => set("best_time", e.target.value)}>
              {BEST_TIMES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Παγκάκι</label>
            <div className="flex gap-2 flex-wrap">
              {BENCH.map(([v, l]) => (
                <button key={v} type="button" onClick={() => set("has_bench", v as FormState["has_bench"])}
                  className="px-3 py-2 rounded-lg text-sm" style={{
                    backgroundColor: form.has_bench === v ? "rgba(232,160,32,0.15)" : "#0F0F1A",
                    color: form.has_bench === v ? "#E8A020" : "#aaa",
                    border: `1px solid ${form.has_bench === v ? "#E8A020" : "#444"}`,
                  }}>{l}</button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Πώς φτάνεις</label>
            <input className={inputCls} style={inputStyle} value={form.access_note} onChange={e => set("access_note", e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Περιγραφή</label>
            <textarea rows={4} className={inputCls} style={inputStyle} value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
          <fieldset className="sm:col-span-2 min-w-0">
            <legend className={labelCls}>Υποκατηγορίες Ευεξίας ({form.subcategories.length}/{MAX_WELLNESS_SUBCATEGORIES})</legend>
            <div className="flex gap-2 flex-wrap">
              {WELLNESS_SUBS.map(sub => {
                const on = form.subcategories.includes(sub.key);
                const blocked = !on && form.subcategories.length >= MAX_WELLNESS_SUBCATEGORIES;
                return (
                  <label key={sub.key} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                    style={{
                      backgroundColor: on ? "rgba(79,195,161,0.15)" : "#0F0F1A",
                      color: on ? "#4FC3A1" : "#aaa",
                      border: `1px solid ${on ? "#4FC3A1" : "#444"}`,
                      opacity: blocked ? 0.4 : 1, cursor: blocked ? "not-allowed" : "pointer",
                    }}>
                    <input type="checkbox" checked={on} disabled={blocked} onChange={() => toggleSub(sub.key)} />
                    {sub.label_el}
                  </label>
                );
              })}
            </div>
            <p className={hintCls} style={hintStyle}>Έως {MAX_WELLNESS_SUBCATEGORIES}. Φαίνονται ως φίλτρα στον δημόσιο χάρτη.</p>
          </fieldset>
          <div className="sm:col-span-2">
            <label className={labelCls}>Πηγή (σύνδεσμος)</label>
            <input className={inputCls} style={inputStyle} value={form.source_url} onChange={e => set("source_url", e.target.value)} placeholder="https://…" />
          </div>
        </div>

        {/* Location */}
        <div className="min-w-0">
          <label className={labelCls}>Τοποθεσία (pin)</label>
          <input className={`${inputCls} mb-2`} style={inputStyle} value={coordsText}
            onChange={e => applyCoordsText(e.target.value)}
            placeholder="Επικόλλησε συντεταγμένες (37.98, 23.73) ή πλήρη σύνδεσμο Google Maps" />
          <LocationPicker
            value={hasPin ? { lat: form.lat as number, lng: form.lng as number } : null}
            onChange={(lat, lng) => setForm(f => ({ ...f, lat, lng }))}
          />
          <p className={hintCls} style={hintStyle}>
            {hasPin ? `${(form.lat as number).toFixed(6)}, ${(form.lng as number).toFixed(6)}` : "Πάτα στον χάρτη ή σύρε το pin."}
            {hasPin && (
              <button type="button" className="ml-3 underline" onClick={() => { set("lat", null); set("lng", null); set("published", false); }}>Αφαίρεση pin</button>
            )}
          </p>
        </div>

        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm text-gray-300">
            <input type="checkbox" className="mt-1" checked={form.coords_verified} onChange={e => set("coords_verified", e.target.checked)} />
            <span>Συντεταγμένες επιβεβαιωμένες<span className={`block ${hintCls}`} style={hintStyle}>Έχω βάλει το pin στο σημείο</span></span>
          </label>
          <label className="flex items-start gap-2 text-sm text-gray-300">
            <input type="checkbox" className="mt-1" checked={form.verified_night} onChange={e => set("verified_night", e.target.checked)} />
            <span>Επιβεβαιωμένο βράδυ<span className={`block ${hintCls}`} style={hintStyle}>Έχω πάει εκεί βράδυ και είναι άνετα</span></span>
          </label>
        </div>

        {/* Photos */}
        <div>
          <label className={labelCls}>Φωτογραφίες ({form.photo_urls.length}/{MAX_WELLNESS_PHOTOS}). Η πρώτη είναι η κύρια.</label>
          {form.photo_urls.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              {form.photo_urls.map((url, i) => (
                <div key={url} className="rounded-lg overflow-hidden min-w-0" style={{ border: `1px solid ${i === 0 ? "#E8A020" : "#444"}` }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-28 object-cover" />
                  <div className="flex items-center justify-between px-2 py-1.5 text-xs" style={{ backgroundColor: "#0F0F1A" }}>
                    <span style={{ color: i === 0 ? "#E8A020" : "#888" }}>{i === 0 ? "Κύρια" : i + 1}</span>
                    <span className="flex gap-2">
                      <button type="button" disabled={i === 0} onClick={() => movePhoto(i, -1)} aria-label="Μετακίνηση πίσω" className="disabled:opacity-30">←</button>
                      <button type="button" disabled={i === form.photo_urls.length - 1} onClick={() => movePhoto(i, 1)} aria-label="Μετακίνηση μπροστά" className="disabled:opacity-30">→</button>
                      <button type="button" onClick={() => set("photo_urls", form.photo_urls.filter(u => u !== url))} aria-label="Διαγραφή" style={{ color: "#f87171" }}>✕</button>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {form.photo_urls.length < MAX_WELLNESS_PHOTOS && (
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={uploading}
              onChange={e => { uploadPhotos(e.target.files); e.target.value = ""; }}
              className="block w-full text-sm text-gray-400" />
          )}
          {uploading && <p className={hintCls} style={hintStyle}>Ανέβασμα…</p>}
          <p className={hintCls} style={hintStyle}>JPG, PNG ή WebP, μέχρι 8MB η καθεμία.</p>
        </div>

        {/* Publish */}
        <div className="p-3 rounded-xl" style={{ backgroundColor: "#0F0F1A", border: "1px dashed rgba(232,160,32,0.25)" }}>
          <label className="flex items-center gap-2 text-sm" style={{ color: hasPin ? "#E8A020" : "#666" }}>
            <input type="checkbox" disabled={!hasPin} checked={form.published && hasPin} onChange={e => set("published", e.target.checked)} />
            Δημοσίευση
          </label>
          {!hasPin && <p className={hintCls} style={hintStyle}>Βάλε πρώτα pin για να μπορείς να δημοσιεύσεις.</p>}
        </div>

        {formError && <p className="text-red-400 text-xs">{formError}</p>}
        <button type="submit" disabled={saving || uploading} className="px-6 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>
          {saving ? "Αποθήκευση…" : "Αποθήκευση"}
        </button>
      </form>
    );
  }

  // ── List ────────────────────────────────────────────────────────────────
  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold">Wellness spots <span className="text-sm text-gray-500">({spots.length})</span></h2>
        <button onClick={() => openForm("new")} className="px-4 py-2 rounded-xl font-semibold text-sm" style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}>+ Νέο</button>
      </div>
      {notice && (
        <div className="mb-4 p-3 rounded-xl text-xs flex justify-between gap-3" style={{ backgroundColor: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.3)", color: "#6ee7b7" }}>
          <span>{notice}</span><button onClick={() => setNotice("")}>✕</button>
        </div>
      )}
      {loadError && <p className="mb-4 text-xs text-red-400">{loadError}</p>}
      {loading ? <p className="text-sm text-gray-500">Φόρτωση…</p>
        : spots.length === 0 ? <p className="text-sm text-gray-500">Δεν υπάρχουν σημεία ακόμα.</p>
        : (
          <div className="space-y-2">
            {spots.map(s => (
              <div key={s.id} className="p-3 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3 min-w-0" style={{ backgroundColor: "#13131f", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{s.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {[s.area, label(KINDS, s.kind), label(BEST_TIMES, s.best_time)].filter(Boolean).join(" · ")}
                  </p>
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    <Badge on={s.published}>Δημοσιευμένο</Badge>
                    <Badge on={s.coords_verified}>Συντεταγμένες ✓</Badge>
                    <Badge on={s.verified_night}>Βράδυ ✓</Badge>
                    <Badge on={s.lat != null && s.lng != null}>{s.lat != null && s.lng != null ? "Pin" : "Χωρίς pin"}</Badge>
                    <Badge on={s.photo_urls.length > 0}>{s.photo_urls.length} φωτο</Badge>
                    {s.has_bench === true && <Badge on>Παγκάκι</Badge>}
                    {(s.subcategories ?? []).map(k => (
                      <Badge key={k} on>{WELLNESS_SUBS.find(x => x.key === k)?.label_el ?? k}</Badge>
                    ))}
                    {(s.subcategories ?? []).length === 0 && <Badge on={false}>Χωρίς υποκατηγορία</Badge>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openForm(s)} className="px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: "#1E2A3A", color: "#aaa", border: "1px solid #444" }}>✏️ Επεξεργασία</button>
                  <button onClick={() => remove(s)} aria-label="Διαγραφή" className="px-3 py-1.5 rounded-lg text-sm" style={{ backgroundColor: "#2a1a1a", color: "#f87171", border: "1px solid #5a2a2a" }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
