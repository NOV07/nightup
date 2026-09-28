"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  /** Changes when the selected tab changes; the element marked
   *  `data-active="true"` is then scrolled into the middle of the bar. */
  activeKey: string;
  /** Colour the edge fades blend into: the bar's own background. */
  fadeColor?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Horizontal tab row that scrolls sideways when the tabs do not fit (phones),
 * with edge fades that appear only while there is hidden content on that side.
 * When everything fits, nothing scrolls and no fade shows, so wide screens look
 * like a plain flex row.
 */
export default function ScrollTabBar({ activeKey, fadeColor = "rgb(15,15,26)", className = "", children }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [fade, setFade] = useState({ left: false, right: false });

  const updateFade = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // 1px of slack: fractional widths leave scrollLeft just short of max.
    setFade({ left: el.scrollLeft > 1, right: el.scrollLeft < max - 1 });
  }, []);

  useEffect(() => {
    updateFade();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(updateFade);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateFade]);

  // Skipped on mount: the first tab is already in view, and scrollIntoView could
  // otherwise nudge the page vertically before the user has touched anything.
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    const active = scroller.current?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeKey]);

  const fadeBase = "pointer-events-none absolute top-0 bottom-0 w-10 transition-opacity duration-200";

  return (
    <div className="relative">
      <div
        ref={scroller}
        onScroll={updateFade}
        className={`flex overflow-x-auto snap-x snap-proximity overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch] ${className}`}
      >
        {children}
      </div>
      <div
        aria-hidden
        className={`${fadeBase} left-0`}
        style={{ opacity: fade.left ? 1 : 0, background: `linear-gradient(to right, ${fadeColor}, transparent)` }}
      />
      <div
        aria-hidden
        className={`${fadeBase} right-0`}
        style={{ opacity: fade.right ? 1 : 0, background: `linear-gradient(to left, ${fadeColor}, transparent)` }}
      />
    </div>
  );
}
