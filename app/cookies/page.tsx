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
        <p style={{ color: "rgba(255,255,255,0.50)", fontSize: "13px", marginBottom: "48px" }}>
          Last updated: October 2026
        </p>

        {[
          {
            title: `1. What we use`,
            blocks: [
              `Nightup.gr does not use advertising, tracking or analytics cookies.`,
              `Essential cookies: when you log in, our authentication provider (Supabase) sets session cookies so you stay signed in. They are strictly necessary. They last until you log out or the session expires.`,
              `Local storage on your device (not cookies): to remember your choices we store a few small items in your browser:`,
              [`nightup_lang: your language choice (Greek or English).`, `nup_radio_station and nup_radio_vol: your last radio station and volume.`, `nightup_tonight_seen: whether you have already seen the "Tonight" introduction.`],
              `They contain no personal data, are not sent to us, and are used only to make the site work as you set it. You can delete them in your browser settings.`,
            ],
          },
          {
            title: `2. Embedded players (SoundCloud and Spotify)`,
            blocks: [
              `Embedded players do not load until you click "Load player" or press play on the site's music player. Before that, no request is made to SoundCloud or Spotify. After you load one, that service may set its own cookies and process your data under its own policy. We do not control this. See the privacy and cookie policies of SoundCloud and Spotify.`,
            ],
          },
          {
            title: `3. Consent`,
            blocks: [
              `Because we only use strictly necessary cookies and storage, and third-party content loads only after your action, we do not show a cookie banner. If we add anything non-essential, such as analytics, we will update this policy and ask for your consent first.`,
            ],
          },
          {
            title: `4. Managing cookies`,
            blocks: [
              `You can block or delete cookies in your browser settings. Blocking essential cookies will stop you from logging in.`,
            ],
          },
          {
            title: `5. Contact`,
            blocks: [
              `Questions: nightupsocial@gmail.com.`,
            ],
          },
        ].map(({ title, blocks }) => (
          <div key={title} style={{ marginBottom: "36px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#F4F4F5", marginBottom: "10px" }}>{title}</h2>
            {blocks.map((block, i) =>
              Array.isArray(block) ? (
                <ul key={i} style={{ fontSize: "14px", lineHeight: 1.75, color: "rgba(255,255,255,0.55)", listStyle: "disc", margin: i ? "10px 0 0" : 0, paddingLeft: "20px" }}>
                  {block.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p key={i} style={{ fontSize: "14px", lineHeight: 1.75, color: "rgba(255,255,255,0.55)", marginTop: i ? "10px" : 0 }}>{block}</p>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
