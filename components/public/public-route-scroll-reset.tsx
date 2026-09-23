"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

type NavigateEventLike = Event & {
  navigationType?: string;
  destination?: { url: string };
};

type NavigationLike = {
  addEventListener: (type: "navigate", listener: (event: NavigateEventLike) => void) => void;
  removeEventListener: (type: "navigate", listener: (event: NavigateEventLike) => void) => void;
};

type PendingNavigation = {
  type: string;
  hasHash: boolean;
};

export function PublicRouteScrollReset() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialRenderRef = useRef(true);
  const pendingNavigationRef = useRef<PendingNavigation>({ type: "push", hasHash: false });

  useEffect(() => {
    const navigation = (window as unknown as { navigation?: NavigationLike }).navigation;

    if (navigation) {
      const handleNavigate = (event: NavigateEventLike) => {
        const destinationUrl = event.destination ? new URL(event.destination.url) : null;
        pendingNavigationRef.current = {
          type: event.navigationType ?? "push",
          hasHash: destinationUrl ? destinationUrl.hash !== "" : false,
        };
      };

      navigation.addEventListener("navigate", handleNavigate);
      return () => navigation.removeEventListener("navigate", handleNavigate);
    }

    const handlePopState = () => {
      pendingNavigationRef.current = { type: "traverse", hasHash: false };
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }

    const { type, hasHash } = pendingNavigationRef.current;
    pendingNavigationRef.current = { type: "push", hasHash: false };

    if (type === "traverse" || hasHash) return;

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [pathname, searchParams]);

  return null;
}
