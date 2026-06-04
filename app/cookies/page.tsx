import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: "How Nightup.gr uses cookies.",
  twitter: {
    card: "summary_large_image",
    title: "Cookie Policy | Nightup.gr",
    description: "How Nightup.gr uses cookies.",
    images: ["https://nightup.gr/og-image.png"],
  },
};

export default function CookiesPage() {
  return (
    <div style={{ backgroundColor: "#0F0F1A", minHeight: "100vh", color: "#F4F4F5" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "64px 24px 80px" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase", color: "#E8A020", marginBottom: "16px" }}>
          Legal
        </p>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400, marginBottom: "8px" }}>
          Cookie Policy
        </h1>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px", marginBottom: "48px" }}>
          Last updated: May 2026
        </p>

        {[
          {
            title: "1. What Are Cookies",
            body: `Cookies are small text files stored on your device when you visit a website. They help the site remember information about your visit.`,
          },
          {
            title: "2. How We Use Cookies",
            body: `Nightup.gr uses only essential cookies. These are strictly necessary for the platform to function — specifically for user authentication and session management (keeping you logged in). We do not use advertising cookies, tracking pixels, or analytics cookies.`,
          },
          {
            title: "3. Essential Cookies",
            body: `The only cookies we set are authentication session cookies provided by Supabase. These expire when you log out or after a period of inactivity. Without these cookies, you cannot log in or access account features.`,
          },
          {
            title: "4. Third-Party Cookies",
            body: `Some pages embed content from SoundCloud and Spotify (music players). These services may set their own cookies when you interact with embedded players. We have no control over these cookies — please refer to SoundCloud's and Spotify's respective cookie policies for more information.`,
          },
          {
            title: "5. Managing Cookies",
            body: `You can control cookies through your browser settings. Most browsers allow you to block or delete cookies. Note that blocking essential cookies will prevent you from logging in to Nightup.gr. You can also use browser extensions to manage third-party cookies from embedded content.`,
          },
          {
            title: "6. No Consent Banner Required",
            body: `Because we only use strictly necessary cookies (required for authentication), we are not required under GDPR/ePrivacy to show a cookie consent banner. If we ever introduce non-essential cookies, we will update this policy and add a consent mechanism.`,
          },
          {
            title: "7. Contact",
            body: `For questions about our use of cookies, contact us at nightupsocial@gmail.com.`,
          },
        ].map(({ title, body }) => (
          <div key={title} style={{ marginBottom: "36px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#F4F4F5", marginBottom: "10px" }}>{title}</h2>
            <p style={{ fontSize: "14px", lineHeight: 1.75, color: "rgba(255,255,255,0.55)" }}>{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
