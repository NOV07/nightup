# Nightup — Follow-up TODOs

## Global Search
Implement global search: free-text query που ψάχνει σε events + network + magazine
+ nightwaves, dropdown με mixed results.

Entry point: the 🔍 segment in NavSearch (currently renders a typeable placeholder input, no routing).
Expected UX: type → live dropdown below the bar with grouped results
(Events / Network / Magazine / Nightwaves), click navigates to the item's page.

---

## Radio Streams
Radio is currently mock UI — channels have no real streams. To make functional,
need streaming infrastructure (Icecast/AzuraCast self-hosted or partner embeds).
Separate project, defer.

Restore radio functionality: pre-redesign had 3 real radio streams.
Re-add stream URLs to the CHANNELS array in RadioStrip.tsx, render an <audio> element,
wire play/pause state to actual playback.

---

## Player UI
Mount MusicPlayerBar globally (bottom-left) — see #4 in homepage Round 3 notes.
Confirmed orphan: PlayerContext is wired but MusicPlayerBar is never mounted.
