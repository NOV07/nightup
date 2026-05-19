import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Nightup.gr collects and uses your data.",
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
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px", marginBottom: "48px" }}>
          Last updated: May 2026
        </p>

        {[
          {
            title: "1. Who We Are",
            body: `Nightup.gr is a nightlife and music discovery platform operated as a personal project. For any privacy-related inquiries, contact us at nightupsocial@gmail.com.`,
          },
          {
            title: "2. What Data We Collect",
            body: `When you create an account, we collect your email address and display name. We may also store profile information you voluntarily provide, such as a biography, social media links, and profile photo. When you submit an event or profile, we collect the information you provide in those forms.`,
          },
          {
            title: "3. How We Use Your Data",
            body: `We use your data solely to operate and improve the Nightup.gr platform. This includes displaying your profile, sending account-related emails, and reviewing submitted content. We do not sell your data to third parties. We do not use your data for advertising purposes.`,
          },
          {
            title: "4. Data Storage & Security",
            body: `Your data is stored securely using Supabase, a cloud database provider. We take reasonable technical measures to protect your data, but no system is completely secure. In the event of a data breach, we will notify affected users as required by applicable law.`,
          },
          {
            title: "5. Cookies",
            body: `Nightup.gr uses only essential cookies required for authentication and session management. We do not use advertising cookies, tracking pixels, or third-party analytics cookies. You can disable cookies in your browser settings, but this may affect site functionality.`,
          },
          {
            title: "6. Your Rights (GDPR)",
            body: `If you are located in the European Union, you have the right to access, correct, or delete your personal data at any time. You may also object to processing or request data portability. To exercise these rights, contact us at nightupsocial@gmail.com. We will respond within 30 days.`,
          },
          {
            title: "7. Data Retention",
            body: `We retain your account data for as long as your account is active. If you request account deletion, we will remove your personal data within 30 days, except where retention is required by law.`,
          },
          {
            title: "8. Third-Party Services",
            body: `Nightup.gr is hosted on Vercel and uses Supabase for database services. These providers have their own privacy policies. We use SoundCloud and Spotify embeds on some pages — these services may set their own cookies when you interact with embedded players.`,
          },
          {
            title: "9. Changes to This Policy",
            body: `We may update this Privacy Policy from time to time. The date at the top of this page reflects the most recent revision. Continued use of the platform after changes constitutes acceptance of the updated policy.`,
          },
          {
            title: "10. Contact",
            body: `For any questions about this Privacy Policy, contact us at nightupsocial@gmail.com.`,
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
