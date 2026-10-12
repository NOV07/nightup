/**
 * Dynamic (content) translation via the Anthropic API: article texts, spot
 * descriptions, notifications and similar user-facing content shown in English.
 * Static UI text (translations.ts) is unaffected and never depends on this flag.
 *
 * Off: no request goes to /api/translate from the browser, and the route itself
 * returns the original text without calling Anthropic. Keep this in sync with
 * the privacy policy (section 4): turn it on only together with the policy text.
 */
export const DYNAMIC_TRANSLATION_ENABLED = false;
