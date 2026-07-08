"use client";

import { useEffect, useRef } from "react";

import type { CSSProperties } from "react";

export function PublicScrollProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;

    if (!bar) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId: number | null = null;

    const updateProgress = () => {
      frameId = null;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(Math.max(window.scrollY / scrollable, 0), 1) : 0;
      bar.style.setProperty("--scroll-progress", String(progress));
    };

    const requestUpdate = () => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(updateProgress);
      }
    };

    const enable = () => {
      updateProgress();
      window.addEventListener("scroll", requestUpdate, { passive: true });
      window.addEventListener("resize", requestUpdate);
    };

    const disable = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
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
        className="h-full origin-left scale-x-(--scroll-progress) bg-accent motion-reduce:hidden"
        style={{ "--scroll-progress": 0 } as CSSProperties}
      />
    </div>
  );
}
