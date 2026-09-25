"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

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
  const searchParams = useSearchParams().toString();
  const initialRenderRef = useRef(true);
  const pendingNavigationRef = useRef<PendingNavigation>({ type: "push", hasHash: false });

  useLayoutEffect(() => {
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

    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };
    const root = document.documentElement;
    const previousOverflowAnchor = root.style.overflowAnchor;
    let secondFrameId: number | null = null;
    let thirdFrameId: number | null = null;

    // Prevent late streamed layout changes from anchoring the viewport below the top.
    root.style.overflowAnchor = "none";
    scrollToTop();

    const firstFrameId = window.requestAnimationFrame(() => {
      scrollToTop();
      secondFrameId = window.requestAnimationFrame(() => {
        scrollToTop();
        thirdFrameId = window.requestAnimationFrame(() => {
          root.style.overflowAnchor = previousOverflowAnchor;
        });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId !== null) window.cancelAnimationFrame(secondFrameId);
      if (thirdFrameId !== null) window.cancelAnimationFrame(thirdFrameId);
      root.style.overflowAnchor = previousOverflowAnchor;
    };
  }, [pathname, searchParams]);

  return null;
}
