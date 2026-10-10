import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Supabase: the project URL is only known through the env at build time. The
// *.supabase.co wildcard covers the hosted project (REST/auth/storage over
// https, realtime over wss) when the var is unset; a custom domain is added
// from the env value.
const supabaseOrigins = ["https://*.supabase.co", "wss://*.supabase.co"];
try {
  const { protocol, host } = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
  supabaseOrigins.push(`${protocol}//${host}`, `${protocol === "http:" ? "ws:" : "wss:"}//${host}`);
} catch {}

// Everything the browser loads from outside our own origin (see the audit in
// the PR description): Unsplash/picsum fallback and seed images, Supabase
// Storage images/video, the radio mp3 stream, Zeno metadata (SSE), and the
// SoundCloud/Spotify embeds. next/font self-hosts Google Fonts at build time,
// so font-src stays 'self'. 'unsafe-inline' is needed for Next's inline
// bootstrap scripts and the JSON-LD tags (no nonce setup); 'unsafe-eval' is
// dev-only (React debugging), never in production.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://w.soundcloud.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // OpenStreetMap tiles for the spot LocationPicker. A different provider via
  // NEXT_PUBLIC_MAP_TILE_URL needs its host added here too.
  "img-src 'self' data: blob: https://*.supabase.co https://images.unsplash.com https://picsum.photos https://tile.openstreetmap.org",
  "media-src 'self' data: blob: https://stream.nightup.gr https://*.supabase.co",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigins.join(" ")} https://api.zeno.fm${isDev ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
  "frame-src https://w.soundcloud.com https://open.spotify.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // 2 years, per the standard HSTS preload-list requirement, plus subdomains.
  // Safe to add outright since the whole site is already HTTPS-only on Vercel;
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/radio", destination: "/nightwaves", permanent: true },
      { source: "/radio/:path*", destination: "/nightwaves/:path*", permanent: true },
      { source: "/articles", destination: "/magazine", permanent: true },
      { source: "/articles/:path*", destination: "/magazine/:path*", permanent: true },
      { source: "/party", destination: "/network", permanent: true },
      { source: "/party/:path*", destination: "/network/:path*", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
