// One position request with a second, more patient try. Plain TypeScript (no React), so
// scripts/test-locate.mjs can run it in Node against a mock `navigator.geolocation`.
//
// Try 1: a cached or network position is fine (up to 5 minutes old), 12 s. If that fails because no position
// is available (code 2) or it took too long (code 3), try 2: GPS (enableHighAccuracy), 20 s, never from the
// cache. Code 1 (the person said no) is final: no second try. At most two calls are ever made, and the
// result of the last failure is what is reported.

export const FIRST_TRY: PositionOptions = { enableHighAccuracy: false, timeout: 12_000, maximumAge: 300_000 }
export const SECOND_TRY: PositionOptions = { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 }

export type LocateResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; code: number | null; message: string }

type Geo = Pick<Geolocation, 'getCurrentPosition'>

/** Asks for the position; `done` is called once. The returned function cancels: `done` is not called after it. */
export function locate(geo: Geo, done: (r: LocateResult) => void): () => void {
  let cancelled = false
  let finished = false
  const finish = (r: LocateResult) => { if (cancelled || finished) return; finished = true; done(r) }

  const attempt = (opts: PositionOptions, second: boolean) => {
    geo.getCurrentPosition(
      (pos) => finish({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (cancelled) return
        const retry = !second && (err.code === 2 || err.code === 3)
        if (retry) attempt(SECOND_TRY, true)
        else finish({ ok: false, code: typeof err.code === 'number' ? err.code : null, message: err.message })
      },
      opts,
    )
  }
  attempt(FIRST_TRY, false)
  return () => { cancelled = true }
}
