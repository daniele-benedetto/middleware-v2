"use client";

import { useEffect, useRef, useState } from "react";

import type { ReactNode } from "react";

type IssuesArchiveRailProps = {
  children: ReactNode;
};

export function IssuesArchiveRail({ children }: IssuesArchiveRailProps) {
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
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        update();
      });
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    desktopQuery.addEventListener("change", requestUpdate);
    reducedMotionQuery.addEventListener("change", requestUpdate);

    return () => {
      reset();
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      desktopQuery.removeEventListener("change", requestUpdate);
      reducedMotionQuery.removeEventListener("change", requestUpdate);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="scroll-mt-20 py-10 md:py-0"
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
