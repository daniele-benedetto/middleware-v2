"use client";

import { useEffect, useRef, useState } from "react";

import type { ReactNode } from "react";

type IssuesArchiveRailProps = {
  children: ReactNode;
  ariaLabel?: string;
};

export function IssuesArchiveRail({ children, ariaLabel }: IssuesArchiveRailProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const [sectionHeight, setSectionHeight] = useState<number | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;

    if (!section || !track) {
      return;
    }

    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;

    const reset = () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }

      track.style.transform = "";
      setSectionHeight(null);
    };

    const update = () => {
      if (!desktopQuery.matches || reducedMotionQuery.matches) {
        reset();
        return;
      }

      const maxTranslate = Math.max(0, track.scrollWidth - window.innerWidth);
      setSectionHeight(window.innerHeight + maxTranslate);

      const sectionTop = section.getBoundingClientRect().top + window.scrollY;
      const progress = Math.min(Math.max(window.scrollY - sectionTop, 0), maxTranslate);
      track.style.transform = `translate3d(${-progress}px, 0, 0)`;
    };

    const requestUpdate = () => {
      if (disposed) {
        return;
      }

      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        update();
      });
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (!desktopQuery.matches || reducedMotionQuery.matches) {
        return;
      }

      const target = event.target;
      if (!(target instanceof HTMLElement) || !track.contains(target)) {
        return;
      }

      const margin = 24;
      const rect = target.getBoundingClientRect();
      let delta = 0;

      if (rect.right > window.innerWidth - margin) {
        delta = rect.right - window.innerWidth + margin;
      } else if (rect.left < margin) {
        delta = rect.left - margin;
      }

      if (delta !== 0) {
        window.scrollBy({ top: delta });
      }
    };

    update();

    const resizeObserver = new ResizeObserver(requestUpdate);
    resizeObserver.observe(section);
    resizeObserver.observe(track);

    document.fonts?.ready.then(requestUpdate).catch(() => undefined);

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    desktopQuery.addEventListener("change", requestUpdate);
    reducedMotionQuery.addEventListener("change", requestUpdate);
    track.addEventListener("focusin", handleFocusIn);

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      reset();
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      desktopQuery.removeEventListener("change", requestUpdate);
      reducedMotionQuery.removeEventListener("change", requestUpdate);
      track.removeEventListener("focusin", handleFocusIn);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label={ariaLabel}
      className="scroll-mt-20 py-0"
      style={sectionHeight ? { height: `${sectionHeight}px` } : undefined}
    >
      <div className="lg:sticky lg:top-16 lg:flex lg:h-[calc(100vh-4rem)] lg:items-stretch lg:overflow-hidden">
        <div ref={trackRef} className="grid gap-0 will-change-transform lg:flex">
          {children}
        </div>
      </div>
    </section>
  );
}
