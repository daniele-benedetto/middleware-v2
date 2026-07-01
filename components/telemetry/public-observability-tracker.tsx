"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { observePublicPage } from "@/lib/telemetry/client";

type PublicObservabilityTrackerProps = {
  pageType?: string | null;
  contentType?: string | null;
  contentId?: string | null;
  slug?: string | null;
  path?: string | null;
};

export function PublicObservabilityTracker({
  pageType,
  contentType,
  contentId,
  slug,
  path,
}: PublicObservabilityTrackerProps = {}) {
  const pathname = usePathname();

  useEffect(() => {
    return observePublicPage({
      path: path ?? pathname,
      pageType,
      contentType,
      contentId,
      slug,
    });
  }, [contentId, contentType, pageType, path, pathname, slug]);

  return null;
}
