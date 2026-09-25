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

    const trackDepth = () => {
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
    };

    trackDepth();
    window.addEventListener("scroll", trackDepth, { passive: true });
    window.addEventListener("resize", trackDepth);
    return () => {
      window.removeEventListener("scroll", trackDepth);
      window.removeEventListener("resize", trackDepth);
    };
  }, [contentType, courseSlug, slug]);

  return <div ref={containerRef}>{children}</div>;
}
