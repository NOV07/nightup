import type { LegalContent } from "./types";

const content: LegalContent = {
  "eyebrow": "Legal",
  "title": "Cookie Policy",
  "updated": "Last updated: October 2026",
  "sections": [
    {
      "title": "1. What we use",
      "blocks": [
        "Nightup.gr does not use advertising, tracking or analytics cookies.",
        "Essential cookies: when you log in, our authentication provider (Supabase) sets session cookies so you stay signed in. They are strictly necessary. They last until you log out or the session expires.",
        "Local storage on your device (not cookies): to remember your choices we store a few small items in your browser:",
        [
          "nightup_lang: your language choice (Greek or English).",
          "nup_radio_station and nup_radio_vol: your last radio station and volume.",
          "nightup_tonight_seen: whether you have already seen the \"Tonight\" introduction."
        ],
        "They contain no personal data, are not sent to us, and are used only to make the site work as you set it. You can delete them in your browser settings.",
        "Administrator sign-in (admin pages only): a session cookie (admin_auth) keeps the administrator signed in, and two items in the browser (admin_attempts and admin_lockout) count failed sign-in attempts to apply a temporary lockout."
      ]
    },
    {
      "title": "2. Embedded players (SoundCloud and Spotify)",
      "blocks": [
        "Embedded players do not load until you click \"Load player\" or press play on the site's music player. Before that, no request is made to SoundCloud or Spotify. After you load one, that service may set its own cookies and process your data under its own policy. We do not control this. See the privacy and cookie policies of SoundCloud and Spotify."
      ]
    },
    {
      "title": "3. Consent",
      "blocks": [
        "Because we only use strictly necessary cookies and storage, and the embedded players of SoundCloud and Spotify load only after your action, we do not show a cookie banner. Other third-party requests, such as placeholder images, are described in our Privacy Policy. If we add anything non-essential, such as analytics, we will update this policy and ask for your consent first."
      ]
    },
    {
      "title": "4. Managing cookies",
      "blocks": [
        "You can block or delete cookies in your browser settings. Blocking essential cookies will stop you from logging in."
      ]
    },
    {
      "title": "5. Contact",
      "blocks": [
        "Questions: nightupsocial@gmail.com."
      ]
    }
  ]
};

export default content;
