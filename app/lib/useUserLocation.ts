"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { locate } from "./locate";

export type UserLocationStatus = "idle" | "loading" | "granted" | "denied" | "unsupported";

export interface UserLocationState {
  lat: number | null;
  lng: number | null;
  status: UserLocationStatus;
  error: string | null;
  /** GeolocationPositionError.code of the last failure: 1 permission denied, 2 unavailable, 3 timeout. */
  errorCode: number | null;
  requestLocation: () => void;
  /** Forgets the position and goes back to "idle" (an answer still on its way is ignored). */
  reset: () => void;
}

export function useUserLocation(): UserLocationState {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [status, setStatus] = useState<UserLocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  // The request in flight: a newer request or a reset cancels it, so an old answer is never used.
  const cancelRef = useRef<(() => void) | null>(null);

  const requestLocation = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }

    setStatus("loading");
    setError(null);
    setErrorCode(null);

    // Up to two tries (see app/lib/locate.ts): a cached or network position first, then GPS.
    cancelRef.current = locate(navigator.geolocation, (r) => {
      cancelRef.current = null;
      if (r.ok) {
        setLat(r.lat);
        setLng(r.lng);
        setStatus("granted");
      } else {
        setError(r.message);
        setErrorCode(r.code);
        setStatus("denied");
      }
    });
  }, []);

  const reset = useCallback(() => {
    cancelRef.current?.();
    cancelRef.current = null;
    setLat(null);
    setLng(null);
    setStatus("idle");
    setError(null);
    setErrorCode(null);
  }, []);

  // Leaving the page cancels a request still on its way.
  useEffect(() => () => { cancelRef.current?.(); }, []);

  return { lat, lng, status, error, errorCode, requestLocation, reset };
}
