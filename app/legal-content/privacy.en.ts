import type { LegalContent } from "./types";

const content: LegalContent = {
  "eyebrow": "Legal",
  "title": "Privacy Policy",
  "updated": "Last updated: October 2026",
  "sections": [
    {
      "title": "1. Who we are",
      "blocks": [
        "Nightup.gr is a nightlife and music discovery platform for Greece. The data controller is Dimitrios Kantanoleon, an individual operating Nightup.gr as a personal project. For any privacy matter contact: nightupsocial@gmail.com."
      ]
    },
    {
      "title": "2. What data we collect",
      "blocks": [
        [
          "Account data: email address, display name, and your password (stored hashed by our authentication provider, never in plain text).",
          "Profile and content you submit: biography, social media links, profile and gallery photos, events, spots, releases, mixes, listings and any other information you enter in our forms, including upgrade requests and spot claims.",
          "Activity tied to your account: follows, saved events and spots, and notifications.",
          "Your location, only if you use \"near me\": your browser asks for your permission before sharing it. It is sent to our server only to find nearby spots and is not stored by us.",
          "Spot location: the coordinates of a spot are published together with the spot.",
          "Anonymous page-view counter: the About page increments a monthly counter. It stores only a number per month, with no IP address, cookie, device identifier or user ID.",
          "Technical logs: our hosting and database providers may process technical data such as IP address and request metadata to deliver the service and keep it secure."
        ],
        "We do not collect payment data. We do not use analytics or advertising trackers."
      ]
    },
    {
      "title": "3. Why we use it and our legal basis",
      "blocks": [
        [
          "To create and run your account, display your profile and content, and send account emails (for example sign-up and password reset): performance of a contract.",
          "To review submitted content, prevent abuse and keep the platform secure: legitimate interest.",
          "To comply with legal obligations: legal obligation."
        ],
        "We do not sell your data and we do not use it for advertising."
      ]
    },
    {
      "title": "4. Who processes data for us",
      "blocks": [
        [
          "Vercel (hosting).",
          "Supabase (database, authentication and file storage).",
          "Resend (sending account emails).",
          "Anthropic (automatic translation): when a visitor selects English, some Greek page content, which may include text written by users, is sent to the Anthropic API to be translated. We do not send IP address, cookies or account identifiers.",
          "SoundCloud and Spotify (embedded players), only after you click to load them. See the Cookie Policy.",
          "OpenStreetMap (map images): when a signed-in user (a spot owner or an admin) opens the map to set a location, their browser requests map images from OpenStreetMap servers, which therefore receive that user's IP address and requests. See the OpenStreetMap Foundation privacy policy: osmfoundation.org/wiki/Privacy_Policy.",
          "OpenStreetMap Nominatim (address search): when a pasted Google Maps link does not contain coordinates, our server sends the address text from that link to Nominatim. We do not send the user's IP address or account identifiers.",
          "Google Maps links: our server opens the pasted Google Maps link, including short links, to find its coordinates. Google receives the link and the IP address of our server, not the user's IP address.",
          "Unsplash (placeholder images): a default image shown when an event or spot has no image of its own may load from Unsplash. Our pages may also open a connection to Unsplash in advance to speed this up, so Unsplash may receive the visitor's IP address.",
          "Nightup Radio stream: the live radio is streamed from a server we operate, hosted by Contabo. When you play the radio, your browser connects to that server, which therefore receives your IP address. Our streaming software may keep technical access logs that include IP addresses."
        ],
        "Some of these providers are located in the United States or may process data there. Where this happens, transfers rely on safeguards such as the EU-US Data Privacy Framework or Standard Contractual Clauses, as provided by each provider."
      ]
    },
    {
      "title": "5. Retention",
      "blocks": [
        "We keep your account data for as long as your account is active. When you delete your account in your settings, or ask us to, we delete your personal data within 30 days, except where the law requires us to keep it. Backups are overwritten on the provider's normal schedule."
      ]
    },
    {
      "title": "6. Your rights",
      "blocks": [
        "If you are in the EU/EEA you have the right to access, correct, delete and export your data, to restrict or object to processing, and to withdraw consent where we rely on it. You can delete your account yourself in your settings. For any other request write to nightupsocial@gmail.com. We reply within 30 days. You also have the right to lodge a complaint with the Hellenic Data Protection Authority (www.dpa.gr) or your local authority."
      ]
    },
    {
      "title": "7. Age",
      "blocks": [
        "Nightup.gr is for people aged 18 or over. Do not create an account if you are younger."
      ]
    },
    {
      "title": "8. Security",
      "blocks": [
        "We use reasonable technical and organisational measures. No system is completely secure. If a breach affects your data we will notify you and the authority as the law requires."
      ]
    },
    {
      "title": "9. Changes",
      "blocks": [
        "We may update this policy. The date above shows the latest version. If a change is significant we will tell registered users."
      ]
    }
  ]
};

export default content;
