# Map v2 browser check (390px)

Not part of the app: a throw-away page with mock points and a Playwright script.

1. `mkdir app/map-harness && cp scripts/map-v2-harness/harness-page.tsx.txt app/map-harness/page.tsx` (do not commit it)
2. dummy env in `.env.local` (Supabase URL/key, `RESEND_API_KEY`), then `npx next dev -p 3100`
3. `SHOTS_DIR=/some/dir NODE_PATH=$(npm root -g) node scripts/map-v2-harness/run.cjs`

It freezes the clock to Tue 10 Nov 2026 21:30 Athens, mocks the tiles and the geolocation
(Monastiraki, a denial, no GPS, London), and checks: round 34px markers, the Radar ring (scale 1.45, 2.2s,
0.9s delay, 1.5px), reduced motion, clustering, Near me (no request on open, URL without coordinates,
nothing stored), list, closing soon, and that nothing new covers the navbar or the player.
