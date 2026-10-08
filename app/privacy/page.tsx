import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Nightup.gr collects and uses your data.",
  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | Nightup.gr",
    description: "How Nightup.gr collects and uses your data.",
    images: ["https://nightup.gr/og-image.png"],
  },
};

export default function PrivacyPage() {
  return (
    <div style={{ backgroundColor: "#0F0F1A", minHeight: "100vh", color: "#F4F4F5" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "64px 24px 80px" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase", color: "#E8A020", marginBottom: "16px" }}>
          Legal
        </p>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400, marginBottom: "8px" }}>
          Privacy Policy
        </h1>
        <p style={{ color: "rgba(255,255,255,0.50)", fontSize: "13px", marginBottom: "48px" }}>
          Last updated: October 2026
        </p>

        {[
          {
            title: `1. Who we are`,
            blocks: [
              `Nightup.gr is a nightlife and music discovery platform for Greece. The data controller is Dimitrios Kantanoleon, an individual operating Nightup.gr as a personal project. For any privacy matter contact: nightupsocial@gmail.com.`,
            ],
          },
          {
            title: `2. What data we collect`,
            blocks: [
              [`Account data: email address, display name, and your password (stored hashed by our authentication provider, never in plain text).`, `Profile and content you submit: biography, social media links, profile and gallery photos, events, spots, releases, mixes, listings and any other information you enter in our forms, including upgrade requests and spot claims.`, `Activity tied to your account: follows, saved events and spots, and notifications.`, `Anonymous page-view counter: the About page increments a monthly counter. It stores only a number per month, with no IP address, cookie, device identifier or user ID.`, `Technical logs: our hosting and database providers may process technical data such as IP address and request metadata to deliver the service and keep it secure.`],
              `We do not collect payment data. We do not use analytics or advertising trackers.`,
            ],
          },
          {
            title: `3. Why we use it and our legal basis`,
            blocks: [
              [`To create and run your account, display your profile and content, and send account emails (for example sign-up and password reset): performance of a contract.`, `To review submitted content, prevent abuse and keep the platform secure: legitimate interest.`, `To comply with legal obligations: legal obligation.`],
              `We do not sell your data and we do not use it for advertising.`,
            ],
          },
          {
            title: `4. Who processes data for us`,
            blocks: [
              [`Vercel (hosting).`, `Supabase (database, authentication and file storage).`, `Resend (sending account emails).`, `Anthropic (automatic translation): when a visitor selects English, some Greek page content, which may include text written by users, is sent to the Anthropic API to be translated. We do not send IP address, cookies or account identifiers.`, `SoundCloud and Spotify (embedded players), only after you click to load them. See the Cookie Policy.`],
              `Some of these providers are located in the United States or may process data there. Where this happens, transfers rely on safeguards such as the EU-US Data Privacy Framework or Standard Contractual Clauses, as provided by each provider.`,
            ],
          },
          {
            title: `5. Retention`,
            blocks: [
              `We keep your account data for as long as your account is active. When you delete your account in your settings, or ask us to, we delete your personal data within 30 days, except where the law requires us to keep it. Backups are overwritten on the provider's normal schedule.`,
            ],
          },
          {
            title: `6. Your rights`,
            blocks: [
              `If you are in the EU/EEA you have the right to access, correct, delete and export your data, to restrict or object to processing, and to withdraw consent where we rely on it. You can delete your account yourself in your settings. For any other request write to nightupsocial@gmail.com. We reply within 30 days. You also have the right to lodge a complaint with the Hellenic Data Protection Authority (www.dpa.gr) or your local authority.`,
            ],
          },
          {
            title: `7. Age`,
            blocks: [
              `Nightup.gr is for people aged 18 or over. Do not create an account if you are younger.`,
            ],
          },
          {
            title: `8. Security`,
            blocks: [
              `We use reasonable technical and organisational measures. No system is completely secure. If a breach affects your data we will notify you and the authority as the law requires.`,
            ],
          },
          {
            title: `9. Changes`,
            blocks: [
              `We may update this policy. The date above shows the latest version. If a change is significant we will tell registered users.`,
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
