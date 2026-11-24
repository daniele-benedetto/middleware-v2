"use client";

import { useEffect, useRef } from "react";

import { publicAnalyticsEvents, trackPublicAnalyticsEvent } from "@/lib/public/analytics";

type PublicReadingDepthProps = {
  contentType: "article" | "lesson";
  slug: string;
  children: React.ReactNode;
  courseSlug?: string;
};

const milestones = [25, 50, 75, 100] as const;

export function PublicReadingDepth({
  contentType,
  slug,
  courseSlug,
  children,
}: PublicReadingDepthProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackedRef = useRef(new Set<number>());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frameId: number | null = null;

    const stopTracking = () => {
      window.removeEventListener("scroll", scheduleTrackDepth);
      window.removeEventListener("resize", scheduleTrackDepth);
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      frameId = null;
    };

    const trackDepth = () => {
      frameId = null;
      const rect = container.getBoundingClientRect();
      const total = Math.max(container.scrollHeight, rect.height);
      const visibleBottom = Math.min(total, window.innerHeight - rect.top);
      const progress = Math.max(0, Math.min(100, (visibleBottom / total) * 100));

      for (const milestone of milestones) {
        if (progress < milestone || trackedRef.current.has(milestone)) continue;
        trackedRef.current.add(milestone);
        trackPublicAnalyticsEvent(publicAnalyticsEvents.contentReadProgress, {
          content_type: contentType,
          slug,
          course_slug: courseSlug ?? null,
          milestone,
        });
      }

      // Every milestone is reported once: no reason to keep measuring on scroll.
      if (trackedRef.current.size === milestones.length) stopTracking();
    };

    // Measure at most once per frame instead of on every scroll event.
    function scheduleTrackDepth() {
      if (frameId === null) frameId = window.requestAnimationFrame(trackDepth);
    }

    trackDepth();
    if (trackedRef.current.size === milestones.length) return;
    window.addEventListener("scroll", scheduleTrackDepth, { passive: true });
    window.addEventListener("resize", scheduleTrackDepth);
    return stopTracking;
  }, [contentType, courseSlug, slug]);

  return <div ref={containerRef}>{children}</div>;
}
