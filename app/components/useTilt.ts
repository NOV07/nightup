import { useEffect, useRef } from "react";

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Light CSS-only 3D tilt driven by pointer events (works on touch too). The tilt is written
// straight to the element as CSS vars (--rx/--ry/--mx/--my/--go) in rAF: no setState per move.
// `data-track` is set while the pointer is over the element (used for the fast transition and
// the "active" glow). The element's CSS decides what to do with the vars.
export function useTilt<T extends HTMLElement>(max: number) {
  const ref = useRef<T>(null);
  const raf = useRef<number | null>(null);
  const pt = useRef({ x: 0, y: 0 });

  useEffect(() => () => { if (raf.current != null) cancelAnimationFrame(raf.current); }, []);

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    if (raf.current != null) { cancelAnimationFrame(raf.current); raf.current = null; }
    el.removeAttribute("data-track");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--go", "0");
  };
  const apply = () => {
    raf.current = null;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const px = Math.min(1, Math.max(0, (pt.current.x - r.left) / r.width));
    const py = Math.min(1, Math.max(0, (pt.current.y - r.top) / r.height));
    el.style.setProperty("--ry", `${((px - 0.5) * 2 * max).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${(-(py - 0.5) * 2 * max).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    el.style.setProperty("--go", "1");
  };
  const track = (e: React.PointerEvent) => {
    if (reducedMotion()) return;
    ref.current?.setAttribute("data-track", "");
    pt.current = { x: e.clientX, y: e.clientY };
    if (raf.current == null) raf.current = requestAnimationFrame(apply);
  };
  const end = (e: React.PointerEvent) => { if (e.type !== "pointerup" || e.pointerType !== "mouse") reset(); };

  return {
    ref,
    handlers: { onPointerEnter: track, onPointerMove: track, onPointerLeave: end, onPointerCancel: end, onPointerUp: end },
  };
}
