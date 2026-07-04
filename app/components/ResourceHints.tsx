"use client";

import ReactDOM from "react-dom";

export function ResourceHints() {
  ReactDOM.preconnect("https://images.unsplash.com");
  ReactDOM.prefetchDNS("https://images.unsplash.com");
  return null;
}
