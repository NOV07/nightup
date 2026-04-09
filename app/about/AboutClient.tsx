"use client";

import { useState } from "react";

const stats = [
  { label: "Events Listed", value: "2,400+", icon: "🎉" },
  { label: "Professionals", value: "500+", icon: "🎧" },
  { label: "Cities Covered", value: "25+", icon: "🌆" },
  { label: "Monthly Users", value: "120K+", icon: "👥" },
];

const socials = [
  { label: "Instagram", handle: "@nightup.gr", icon: "📸" },
  { label: "TikTok", handle: "@nightup.gr", icon: "🎵" },
  { label: "Facebook", handle: "Nightup.gr", icon: "💬" },
  { label: "Twitter/X", handle: "@nightupgr", icon: "🐦" },
];

export default function AboutClient() {
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [eventForm, setEventForm] = useState({ title: "", venue: "", date: "", city: "", genre: "", contact: "" });
  const [profileForm, setProfileForm] = useState({ name: "", category: "", location: "", bio: "", contact: "" });
  const [activeTab, setActiveTab] = useState<"contact" | "event" | "profile">("contact");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div>
      {/* Hero */}
      <section
        className="py-20 text-center px-4"
        style={{ background: "linear-gradient(180deg, #1A1A2E 0%, #0F0F1A 100%)" }}
      >
        <div className="flex items-baseline justify-center gap-1 mb-4">
          <span className="font-thin tracking-[0.3em] text-5xl uppercase">Night</span>
          <span className="font-thin tracking-[0.3em] text-5xl uppercase" style={{ color: "#E8A020" }}>up</span>
        </div>
        <p className="tracking-[0.5em] uppercase text-gray-400 mb-8 text-sm">find your night</p>
        <p className="text-gray-300 max-w-2xl mx-auto text-lg leading-relaxed">
          Nightup.gr is Greece's #1 platform for party and events discovery. We connect nightlife lovers with the best events, venues, and professionals across the country — from the underground clubs of Athens to the sunsets of Mykonos.
        </p>
      </section>

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="text-center p-6 rounded-2xl"
              style={{ backgroundColor: "#1A1A2E", border: "1px solid #333" }}
            >
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-2xl font-bold mb-1" style={{ color: "#E8A020" }}>{s.value}</div>
              <div className="text-xs text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Social Links */}
      <section className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="text-xl font-semibold mb-6 text-center">Follow Us</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {socials.map((s) => (
            <a
              key={s.label}
              href="#"
              className="flex items-center gap-3 p-4 rounded-xl transition-colors hover:opacity-80"
              style={{ backgroundColor: "#1A1A2E", border: "1px solid #333" }}
            >
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-xs font-semibold">{s.label}</p>
                <p className="text-xs text-gray-400">{s.handle}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* Forms Section */}
      <section className="max-w-2xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-semibold text-center mb-8">Get in Touch</h2>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden mb-6" style={{ backgroundColor: "#1A1A2E" }}>
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
              {tab === "contact" ? "Contact Us" : tab === "event" ? "Submit Event" : "Submit Profile"}
            </button>
          ))}
        </div>

        {submitted && (
          <div
            className="mb-6 p-4 rounded-xl text-center text-sm font-medium"
            style={{ backgroundColor: "#1A2E1A", border: "1px solid #20E860", color: "#20E860" }}
          >
            ✅ Submitted successfully! We'll get back to you soon.
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
                  style={{ backgroundColor: "#1A1A2E", color: "#fff", border: "1px solid #333" }}
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
                style={{ backgroundColor: "#1A1A2E", color: "#fff", border: "1px solid #333" }}
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
              { label: "Event Title", key: "title", placeholder: "Amazing Techno Night" },
              { label: "Venue", key: "venue", placeholder: "Fuzz Club" },
              { label: "City", key: "city", placeholder: "Athens" },
              { label: "Genre", key: "genre", placeholder: "Techno, House, etc." },
              { label: "Your Contact", key: "contact", placeholder: "email@example.com" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={eventForm[key as keyof typeof eventForm]}
                  onChange={(e) => setEventForm((f) => ({ ...f, [key]: e.target.value }))}
                  required
                  className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: "#1A1A2E", color: "#fff", border: "1px solid #333" }}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Event Date</label>
              <input
                type="date"
                value={eventForm.date}
                onChange={(e) => setEventForm((f) => ({ ...f, date: e.target.value }))}
                required
                className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                style={{ backgroundColor: "#1A1A2E", color: "#fff", border: "1px solid #333" }}
              />
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

        {/* Profile Form */}
        {activeTab === "profile" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { label: "Your Name / Business Name", key: "name", placeholder: "DJ Alex or SoundPro Athens" },
              { label: "Category", key: "category", placeholder: "Music & Artists, Venues, etc." },
              { label: "Location", key: "location", placeholder: "Athens" },
              { label: "Contact", key: "contact", placeholder: "+30 69x xxx xxxx" },
            ].map(({ label, key, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-gray-400 mb-1">{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={profileForm[key as keyof typeof profileForm]}
                  onChange={(e) => setProfileForm((f) => ({ ...f, [key]: e.target.value }))}
                  required
                  className="w-full px-4 py-3 rounded-xl outline-none text-sm"
                  style={{ backgroundColor: "#1A1A2E", color: "#fff", border: "1px solid #333" }}
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Bio / Description</label>
              <textarea
                placeholder="Tell us about yourself or your business..."
                value={profileForm.bio}
                onChange={(e) => setProfileForm((f) => ({ ...f, bio: e.target.value }))}
                required
                rows={4}
                className="w-full px-4 py-3 rounded-xl outline-none text-sm resize-none"
                style={{ backgroundColor: "#1A1A2E", color: "#fff", border: "1px solid #333" }}
              />
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
    </div>
  );
}
