import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // 2 years, per the standard HSTS preload-list requirement, plus subdomains.
  // Safe to add outright since the whole site is already HTTPS-only on Vercel;
  // no CSP yet (see security audit notes) — that needs an audit of every
  // external domain the app legitimately loads before it can be added safely.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
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
