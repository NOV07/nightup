"use client";

import { useState, useRef } from "react";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const MAX_SIZE_MB = 5;

export default function ApplyClient() {
  const [form, setForm] = useState({
    name: "",
    bio: "",
    instagram: "",
    facebook: "",
    soundcloud: "",
  });
  const [logoUrl, setLogoUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [logoError, setLogoError] = useState("");
  const [coverError, setCoverError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const logoRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(
    e: React.ChangeEvent<HTMLInputElement>,
    setUrl: (v: string) => void,
    setErr: (v: string) => void,
  ) {
    setErr("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErr(`Photo must be under ${MAX_SIZE_MB}MB.`);
      return;
    }
    setUrl(await readFileAsBase64(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/organizers/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        bio: form.bio || null,
        logo_url: logoUrl || null,
        cover_url: coverUrl || null,
        instagram: form.instagram || null,
        facebook: form.facebook || null,
        soundcloud: form.soundcloud || null,
      }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error ?? "Something went wrong. Please try again.");
      return;
    }

    setSuccess(true);
  }

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors focus:ring-1";
  const inputStyle = { backgroundColor: "#1A1A2E", color: "#fff", border: "1px solid #333", outlineColor: "#E8A020" };
  const labelCls = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2";

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#0F0F1A" }}>
        <div className="text-center max-w-md">
          <div className="text-5xl mb-6">🎉</div>
          <h1 className="text-2xl font-bold text-white mb-3">Application Submitted</h1>
          <p className="text-gray-400 leading-relaxed">
            Thank you for applying to become a Nightup organizer. Our team will review your application and get back to you shortly.
          </p>
          <a
            href="/"
            className="inline-block mt-8 px-6 py-3 rounded-xl font-semibold text-sm"
            style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0F0F1A" }}>
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <span
            className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-4 uppercase tracking-widest"
            style={{ backgroundColor: "#E8A02020", color: "#E8A020", border: "1px solid #E8A02040" }}
          >
            Organizer Application
          </span>
          <h1 className="text-3xl font-bold text-white mb-3">Join Nightup as an Organizer</h1>
          <p className="text-gray-400 leading-relaxed">
            Promote your events to thousands of nightlife enthusiasts across Greece. Fill in your details below and our team will review your application.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label className={labelCls}>Organizer / Venue Name *</label>
            <input
              required
              className={inputCls}
              style={inputStyle}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Paradise Beach Club"
            />
          </div>

          {/* Bio */}
          <div>
            <label className={labelCls}>Bio</label>
            <textarea
              rows={4}
              className={inputCls}
              style={inputStyle}
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Tell us about your venue or events..."
            />
          </div>

          {/* Logo */}
          <div>
            <label className={labelCls}>Logo</label>
            <div
              className="w-full px-4 py-4 rounded-xl cursor-pointer flex items-center gap-3"
              style={{ backgroundColor: "#1A1A2E", border: "1px dashed #444", color: "#888" }}
              onClick={() => logoRef.current?.click()}
            >
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoChange(e, setLogoUrl, setLogoError)}
              />
              {logoUrl ? (
                <>
                  <img src={logoUrl} alt="Logo preview" className="w-12 h-12 rounded-full object-cover" style={{ border: "1px solid #E8A020" }} />
                  <span className="text-sm text-gray-300">Logo uploaded — click to change</span>
                </>
              ) : (
                <span className="text-sm">Click to upload logo (max {MAX_SIZE_MB}MB)</span>
              )}
            </div>
            {logoError && <p className="text-red-400 text-xs mt-1">{logoError}</p>}
          </div>

          {/* Cover photo */}
          <div>
            <label className={labelCls}>Cover Photo</label>
            <div
              className="w-full px-4 py-4 rounded-xl cursor-pointer"
              style={{ backgroundColor: "#1A1A2E", border: "1px dashed #444", color: "#888" }}
              onClick={() => coverRef.current?.click()}
            >
              <input
                ref={coverRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handlePhotoChange(e, setCoverUrl, setCoverError)}
              />
              {coverUrl ? (
                <img src={coverUrl} alt="Cover preview" className="w-full rounded-lg object-cover" style={{ maxHeight: "140px" }} />
              ) : (
                <p className="text-sm text-center py-4">Click to upload cover photo (max {MAX_SIZE_MB}MB)</p>
              )}
            </div>
            {coverError && <p className="text-red-400 text-xs mt-1">{coverError}</p>}
          </div>

          {/* Social links */}
          <div>
            <label className={labelCls}>Social Links</label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-24 flex-shrink-0">Instagram</span>
                <input
                  className={inputCls}
                  style={inputStyle}
                  value={form.instagram}
                  onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
                  placeholder="https://instagram.com/yourpage"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-24 flex-shrink-0">Facebook</span>
                <input
                  className={inputCls}
                  style={inputStyle}
                  value={form.facebook}
                  onChange={(e) => setForm((f) => ({ ...f, facebook: e.target.value }))}
                  placeholder="https://facebook.com/yourpage"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-24 flex-shrink-0">SoundCloud</span>
                <input
                  className={inputCls}
                  style={inputStyle}
                  value={form.soundcloud}
                  onChange={(e) => setForm((f) => ({ ...f, soundcloud: e.target.value }))}
                  placeholder="https://soundcloud.com/yourpage"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm px-4 py-3 rounded-xl" style={{ backgroundColor: "#1A0000", border: "1px solid #450a0a" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl font-bold text-sm disabled:opacity-50 transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#E8A020", color: "#0F0F1A" }}
          >
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        </form>
      </div>
    </div>
  );
}
