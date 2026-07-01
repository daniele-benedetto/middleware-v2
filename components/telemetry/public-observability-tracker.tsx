"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { observePublicPage } from "@/lib/telemetry/client";

export function PublicObservabilityTracker() {
  const pathname = usePathname();

  useEffect(() => {
    return observePublicPage(pathname);
  }, [pathname]);

  return null;
}
