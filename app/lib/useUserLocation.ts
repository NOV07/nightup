"use client";

import { useCallback, useRef, useState } from "react";

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
  const requestId = useRef(0);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }

    const id = ++requestId.current;
    setStatus("loading");
    setError(null);
    setErrorCode(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (id !== requestId.current) return;
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setStatus("granted");
      },
      (err) => {
        if (id !== requestId.current) return;
        setError(err.message);
        setErrorCode(err.code);
        setStatus("denied");
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, []);

  const reset = useCallback(() => {
    requestId.current++;
    setLat(null);
    setLng(null);
    setStatus("idle");
    setError(null);
    setErrorCode(null);
  }, []);

  return { lat, lng, status, error, errorCode, requestLocation, reset };
}
