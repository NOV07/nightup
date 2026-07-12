"use client";

import { useCallback, useState } from "react";

export type UserLocationStatus = "idle" | "loading" | "granted" | "denied" | "unsupported";

export interface UserLocationState {
  lat: number | null;
  lng: number | null;
  status: UserLocationStatus;
  error: string | null;
  requestLocation: () => void;
}

export function useUserLocation(): UserLocationState {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [status, setStatus] = useState<UserLocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }

    setStatus("loading");
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setStatus("granted");
      },
      (err) => {
        setError(err.message);
        setStatus("denied");
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  }, []);

  return { lat, lng, status, error, requestLocation };
}
