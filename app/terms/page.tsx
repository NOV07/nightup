import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using Nightup.gr.",
};

export default function TermsPage() {
  return (
    <div style={{ backgroundColor: "#0F0F1A", minHeight: "100vh", color: "#F4F4F5" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "64px 24px 80px" }}>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.25em", textTransform: "uppercase", color: "#E8A020", marginBottom: "16px" }}>
          Legal
        </p>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 400, marginBottom: "8px" }}>
          Terms of Service
        </h1>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "13px", marginBottom: "48px" }}>
          Last updated: May 2026
        </p>

        {[
          {
            title: "1. Acceptance of Terms",
            body: `By accessing or using Nightup.gr, you agree to be bound by these Terms of Service. If you do not agree, please do not use the platform.`,
          },
          {
            title: "2. Description of Service",
            body: `Nightup.gr is a nightlife and music discovery platform that allows users to find events, explore music releases and mixes, discover music professionals, and read editorial content about the Greek nightlife scene.`,
          },
          {
            title: "3. User Accounts",
            body: `To submit events or create a professional profile, you must register an account. You are responsible for maintaining the confidentiality of your account credentials and for all activity under your account. You must provide accurate information when registering.`,
          },
          {
            title: "4. User-Submitted Content",
            body: `By submitting events, profiles, or any other content to Nightup.gr, you grant us a non-exclusive, royalty-free license to display and distribute that content on the platform. You are solely responsible for ensuring your content does not infringe third-party rights. We reserve the right to remove any content at our discretion.`,
          },
          {
            title: "5. Prohibited Conduct",
            body: `You may not use Nightup.gr to submit false or misleading information, spam users, violate applicable laws, infringe intellectual property rights, or attempt to gain unauthorized access to any part of the platform.`,
          },
          {
            title: "6. Content Accuracy",
            body: `Event information on Nightup.gr is submitted by third parties and we do not guarantee its accuracy. Always verify event details directly with the organizer before attending.`,
          },
          {
            title: "7. Intellectual Property",
            body: `All original content on Nightup.gr — including editorial articles, design, and code — is the property of Nightup.gr. Embedded music content (SoundCloud, Spotify) remains the property of the respective rights holders.`,
          },
          {
            title: "8. Disclaimer of Warranties",
            body: `Nightup.gr is provided "as is" without warranties of any kind. We do not guarantee uninterrupted or error-free service. We are not liable for any damages arising from your use of the platform.`,
          },
          {
            title: "9. Limitation of Liability",
            body: `To the maximum extent permitted by law, Nightup.gr shall not be liable for any indirect, incidental, or consequential damages arising out of your use of the platform.`,
          },
          {
            title: "10. Governing Law",
            body: `These Terms are governed by the laws of Greece and the European Union. Any disputes shall be subject to the exclusive jurisdiction of the courts of Athens, Greece.`,
          },
          {
            title: "11. Changes to Terms",
            body: `We reserve the right to update these Terms at any time. Continued use of the platform after changes constitutes acceptance of the revised Terms.`,
          },
          {
            title: "12. Contact",
            body: `For questions about these Terms, contact us at nightupsocial@gmail.com.`,
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
