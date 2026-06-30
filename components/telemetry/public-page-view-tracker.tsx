"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { track } from "@/lib/telemetry/client";

export function PublicPageViewTracker() {
  const pathname = usePathname();
  const lastTrackedPathname = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastTrackedPathname.current === pathname) {
      return;
    }

    lastTrackedPathname.current = pathname;
    track({ event: "page_view", path: pathname });
  }, [pathname]);

  return null;
}
