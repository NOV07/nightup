'use client'
// Paste a Google Maps link -> a pin the organiser has to confirm. Used by the
// event form only (the spot wizard keeps its own copy of this flow).
//
// The hook owns the link text, the pin and the "OK, that is correct" flag, and
// mirrors link + pin into the form through `sync`, so the form data always holds
// the saved shape: no link -> lat/lng null.
//
// Rules:
//  * a full link is parsed locally; a short app link goes to /api/maps/resolve
//    (one call per distinct URL, same endpoint and answers as the spots);
//  * any link change drops the old pin until the new one is confirmed. Typing the
//    saved link back (edit) restores the saved pin as already confirmed;
//  * a found pin has to be confirmed before the step may continue. A link that
//    yields no place is not blocking: the event is saved without a pin.

import { useCallback, useEffect, useRef, useState } from 'react'
import { extractCoords, firstUrl, isInGreece, isShortMapsLink, validateCoords, type Coords } from './mapsCoords'

export type PinPrecision = 'exact' | 'viewport' | 'street' | 'building'

/** What the card shows about where the pin came from. UI only, never stored. */
export interface PinInfo {
  placeText?: string
  precision?: PinPrecision
  unverified?: boolean
}

interface Outcome { coords: Coords; info: PinInfo }

/** The place name inside a /maps/place/<name>/ link, or undefined. */
export function placeNameFromUrl(text: string): string | undefined {
  const m = (firstUrl(text) ?? text).match(/\/maps\/place\/([^/@?#]+)/i)
  if (!m) return undefined
  try {
    const name = decodeURIComponent(m[1].replace(/\+/g, ' ')).trim()
    return name || undefined
  } catch {
    return undefined
  }
}

function parseLink(text: string): Outcome | null {
  const c = extractCoords(firstUrl(text) ?? text)
  if (!c) return null
  return { coords: { lat: c.lat, lng: c.lng }, info: { precision: c.precision, placeText: placeNameFromUrl(text) } }
}

export interface PinSlice { maps_url: string; lat: number | null; lng: number | null }

export function useMapsPin({ initialUrl, initialCoords, sync }: {
  initialUrl: string
  initialCoords: Coords | null
  sync: (patch: PinSlice) => void
}) {
  const [url, setUrl] = useState(initialUrl)
  const [coords, setCoords] = useState<Coords | null>(initialCoords)
  const [info, setInfo] = useState<PinInfo | null>(null)
  const [confirmed, setConfirmedState] = useState(initialCoords != null)
  const [checking, setChecking] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [unreachable, setUnreachable] = useState(false)

  // Refs, not state: ensure() awaits a request and must see the latest values after it.
  const urlRef = useRef(initialUrl)
  const coordsRef = useRef<Coords | null>(initialCoords)
  const confirmedRef = useRef(initialCoords != null)
  const touched = useRef(false)
  const syncRef = useRef(sync)
  useEffect(() => { syncRef.current = sync })
  const inputRef = useRef<HTMLInputElement>(null)
  const inflight = useRef<{ url: string; promise: Promise<Coords | null>; ctrl: AbortController } | null>(null)
  const noCoordsUrl = useRef<string | null>(null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    inflight.current?.ctrl.abort()
    if (debounce.current) clearTimeout(debounce.current)
  }, [])

  const commit = useCallback((nextUrl: string, next: Coords | null) => {
    urlRef.current = nextUrl
    coordsRef.current = next
    setUrl(nextUrl)
    setCoords(next)
    syncRef.current({ maps_url: nextUrl, lat: next?.lat ?? null, lng: next?.lng ?? null })
  }, [])

  const setConfirmed = useCallback((v: boolean) => { confirmedRef.current = v; setConfirmedState(v) }, [])

  const resetChecks = useCallback(() => {
    inflight.current?.ctrl.abort()
    inflight.current = null
    noCoordsUrl.current = null
    if (debounce.current) clearTimeout(debounce.current)
    touched.current = false
    setChecking(false)
    setNotFound(false)
    setUnreachable(false)
  }, [])

  /** Coordinates for the current link, or null. One server call per distinct URL. */
  const ensure = useCallback((): Promise<Coords | null> => {
    const u = urlRef.current
    if (!u.trim()) return Promise.resolve(null)
    if (coordsRef.current) return Promise.resolve(coordsRef.current)

    const parsed = parseLink(u)
    if (parsed) {
      setInfo(parsed.info)
      setConfirmed(false)
      commit(u, parsed.coords)
      return Promise.resolve(parsed.coords)
    }
    if (!isShortMapsLink(u)) { setNotFound(true); return Promise.resolve(null) }
    if (noCoordsUrl.current === u) return Promise.resolve(null)
    if (inflight.current?.url === u) return inflight.current.promise

    const ctrl = new AbortController()
    setChecking(true)
    const promise = (async (): Promise<Coords | null> => {
      try {
        const res = await fetch('/api/maps/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: u }),
          signal: ctrl.signal,
        })
        const data = await res.json().catch(() => null)
        if (urlRef.current !== u) return null
        const ok = res.ok ? validateCoords(data?.lat, data?.lng) : { ok: false as const }
        if (ok.ok) {
          const found: Coords = { lat: ok.lat, lng: ok.lng }
          if (!touched.current) {
            setInfo(data?.source === 'nominatim'
              ? {
                  placeText: typeof data.placeText === 'string' ? data.placeText : undefined,
                  precision: data.precision === 'building' ? 'building' : 'street',
                  unverified: data.unverified === true,
                }
              : { precision: data?.precision === 'viewport' ? 'viewport' : 'exact', placeText: placeNameFromUrl(typeof data?.finalUrl === 'string' ? data.finalUrl : '') })
            setConfirmed(false)
            commit(u, found)
          }
          return coordsRef.current
        }
        // Only a definite "no place here" is remembered; network trouble may pass.
        const definite = res.status === 400 || res.status === 422
        if (definite) noCoordsUrl.current = u
        setUnreachable(!definite)
        setNotFound(true)
        return null
      } catch {
        if (urlRef.current === u && !ctrl.signal.aborted) { setUnreachable(true); setNotFound(true) }
        return null
      } finally {
        if (inflight.current?.ctrl === ctrl) { inflight.current = null; setChecking(false) }
      }
    })()
    inflight.current = { url: u, promise, ctrl }
    return promise
  }, [commit, setConfirmed])

  const onUrlChange = useCallback((value: string) => {
    resetChecks()
    setInfo(null)
    const trimmed = value.trim()
    if (!trimmed) { setConfirmed(false); commit(value, null); return }
    // Back to the saved link: the saved pin is still the right one.
    if (initialCoords && trimmed === initialUrl.trim()) { setConfirmed(true); commit(value, initialCoords); return }

    setConfirmed(false)
    const parsed = parseLink(value)
    if (parsed) {
      setInfo(parsed.info)
      commit(value, parsed.coords)
      return
    }
    commit(value, null)
    // Pasting is one change; typing is many. Resolve once the text settles.
    debounce.current = setTimeout(() => { void ensure() }, 400)
  }, [commit, ensure, initialCoords, initialUrl, resetChecks, setConfirmed])

  /** The organiser dragged the pin or tapped the map. */
  const onPinChange = useCallback((lat: number, lng: number) => {
    touched.current = true
    commit(urlRef.current, { lat, lng })
  }, [commit])

  const confirm = useCallback(() => { if (coordsRef.current) setConfirmed(true) }, [setConfirmed])

  /** "Change link": clears the link and the pin and puts the cursor back in the field. */
  const changeLink = useCallback(() => {
    onUrlChange('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [onUrlChange])

  /** Read from the refs, so it is right straight after an await. */
  const isPending = useCallback(
    () => urlRef.current.trim() !== '' && coordsRef.current != null && !confirmedRef.current,
    [],
  )

  return {
    url, coords, info, confirmed, checking, notFound, unreachable, inputRef,
    /** A pin was found and still waits for "OK, that is correct". */
    pending: url.trim() !== '' && coords != null && !confirmed,
    outsideGreece: coords != null && !isInGreece(coords.lat, coords.lng),
    onUrlChange, onPinChange, confirm, changeLink, ensure, isPending,
  }
}

export type MapsPin = ReturnType<typeof useMapsPin>
