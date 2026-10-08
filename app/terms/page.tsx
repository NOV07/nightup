import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms and conditions for using Nightup.gr.",
  twitter: {
    card: "summary_large_image",
    title: "Terms of Service | Nightup.gr",
    description: "Terms and conditions for using Nightup.gr.",
    images: ["https://nightup.gr/og-image.png"],
  },
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
        <p style={{ color: "rgba(255,255,255,0.50)", fontSize: "13px", marginBottom: "48px" }}>
          Last updated: October 2026
        </p>

        {[
          {
            title: `1. Acceptance`,
            blocks: [
              `By using Nightup.gr you agree to these Terms. If you do not agree, do not use the platform. You must be 18 or over.`,
            ],
          },
          {
            title: `2. The service`,
            blocks: [
              `Nightup.gr lets users discover events, spots, music releases and mixes, music professionals and editorial content about Greek nightlife.`,
            ],
          },
          {
            title: `3. Accounts`,
            blocks: [
              `You need an account to submit content or create a profile. Provide accurate information and keep your login details secure. You are responsible for activity under your account.`,
            ],
          },
          {
            title: `4. Your content and our licence`,
            blocks: [
              `You keep ownership of what you submit (events, profiles, photos, text, links). By submitting content you grant Nightup.gr a non-exclusive, worldwide, royalty-free licence to host, display, translate, format and distribute it on the platform, and to promote the platform and your content on our social media and newsletters. The licence ends when you delete the content or your account, except for copies already shared or cached for a short time. You confirm that you have the rights to everything you submit and that it does not infringe anyone's rights.`,
            ],
          },
          {
            title: `5. Prohibited conduct`,
            blocks: [
              `You may not submit false or misleading information, spam, unlawful content, hate speech, harassment, content that sexualises minors, or material that infringes intellectual property or privacy rights. You may not try to access parts of the platform without authorisation or disrupt it.`,
            ],
          },
          {
            title: `6. Reporting and removal`,
            blocks: [
              `To report illegal content, content that infringes your rights, or a copyright claim, email nightupsocial@gmail.com with the page link, what is wrong and, for copyright, proof of ownership. We review reports promptly and may remove content, restrict features or suspend accounts. We may also remove content or suspend an account at our discretion, for example for breaking these Terms.`,
            ],
          },
          {
            title: `7. Event information`,
            blocks: [
              `Events and spots are submitted by third parties. We do not guarantee accuracy. Confirm details with the organiser. Many events involve alcohol and are for adults only.`,
            ],
          },
          {
            title: `8. Third-party content`,
            blocks: [
              `Embedded music (SoundCloud, Spotify) belongs to its rights holders and is subject to their terms.`,
            ],
          },
          {
            title: `9. Intellectual property`,
            blocks: [
              `The design, code and original editorial content of Nightup.gr belong to Nightup.gr unless stated otherwise.`,
            ],
          },
          {
            title: `10. Paid features`,
            blocks: [
              `If we introduce paid features, price, billing, cancellation and refund terms will be shown before you pay and added to these Terms.`,
            ],
          },
          {
            title: `11. Disclaimer and liability`,
            blocks: [
              `Nightup.gr is provided "as is". We do not guarantee uninterrupted or error-free service. To the extent permitted by law, we are not liable for indirect or consequential damages. Nothing in these Terms limits liability that cannot be limited by law, or your mandatory rights as a consumer.`,
            ],
          },
          {
            title: `12. Termination`,
            blocks: [
              `You can delete your account at any time. We may suspend or end access if you break these Terms.`,
            ],
          },
          {
            title: `13. Governing law`,
            blocks: [
              `These Terms are governed by Greek law and applicable EU law. The courts of Athens have jurisdiction, without affecting any mandatory right of consumers to bring a claim in the courts of their country of residence.`,
            ],
          },
          {
            title: `14. Changes and contact`,
            blocks: [
              `We may update these Terms. If a change is significant we will tell registered users. Contact: nightupsocial@gmail.com.`,
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
