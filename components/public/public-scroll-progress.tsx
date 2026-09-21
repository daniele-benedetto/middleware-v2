"use client";

import { useEffect, useRef } from "react";

import type { CSSProperties } from "react";

export function getScrollProgress(scrollPosition: number, scrollableHeight: number) {
  if (scrollableHeight <= 0) {
    return 0;
  }

  return Math.min(Math.max(scrollPosition / scrollableHeight, 0), 1);
}

export function PublicScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;

    if (!bar || CSS.supports("animation-timeline: scroll()")) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId: number | null = null;
    let scrollableHeight = 0;
    let needsGeometryUpdate = false;

    const update = () => {
      frameId = null;
      if (needsGeometryUpdate) {
        scrollableHeight = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
        needsGeometryUpdate = false;
      }

      bar.style.setProperty(
        "--scroll-progress",
        String(getScrollProgress(window.scrollY, scrollableHeight)),
      );
    };

    const requestUpdate = (updateGeometry = false) => {
      needsGeometryUpdate ||= updateGeometry;

      if (frameId === null) {
        frameId = window.requestAnimationFrame(update);
      }
    };

    const requestProgressUpdate = () => requestUpdate();
    const requestGeometryUpdate = () => requestUpdate(true);
    const resizeObserver = new ResizeObserver(requestGeometryUpdate);

    const enable = () => {
      needsGeometryUpdate = true;
      update();
      window.addEventListener("scroll", requestProgressUpdate, { passive: true });
      window.addEventListener("resize", requestGeometryUpdate);
      resizeObserver.observe(document.body);
    };

    const disable = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
      window.removeEventListener("scroll", requestProgressUpdate);
      window.removeEventListener("resize", requestGeometryUpdate);
      resizeObserver.disconnect();
      needsGeometryUpdate = false;
      bar.style.setProperty("--scroll-progress", "0");
    };

    const applyPreference = () => {
      if (prefersReducedMotion.matches) {
        disable();
      } else {
        enable();
      }
    };

    applyPreference();
    prefersReducedMotion.addEventListener("change", applyPreference);

    return () => {
      prefersReducedMotion.removeEventListener("change", applyPreference);
      disable();
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-90 h-1 bg-transparent">
      <div
        ref={barRef}
        data-public-scroll-progress-bar
        className="h-full origin-left bg-accent motion-reduce:hidden"
        style={{ "--scroll-progress": 0 } as CSSProperties}
      />
    </div>
  );
}
