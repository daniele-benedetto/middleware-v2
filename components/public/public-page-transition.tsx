"use client";

import { useEffect, ViewTransition, type ReactNode } from "react";

type PublicPageTransitionProps = {
  children: ReactNode;
};

type NavigateEventLike = Event & {
  navigationType?: string;
  destination?: { url: string };
};

type NavigationLike = {
  addEventListener: (type: "navigate", listener: (event: NavigateEventLike) => void) => void;
  removeEventListener: (type: "navigate", listener: (event: NavigateEventLike) => void) => void;
};

type PendingNavigation = { type: string; hasHash: boolean };

// Track the in-flight navigation so onUpdate only forces scroll-to-top on forward
// (push/replace) navigations. Back/forward ("traverse") must keep the browser's
// restored scroll, and hash links keep their anchor target. This is what makes a
// forward navigation land exactly at the top instead of a few px off (Next's
// scroll reset otherwise races the view-transition commit).
let pendingNavigation: PendingNavigation = { type: "push", hasHash: false };
let cursorTransitionTimer: number | undefined;

const cursorTransitionDuration = 320;

function setCursorTransitioning() {
  document.documentElement.dataset.publicTransitioning = "true";

  if (cursorTransitionTimer) {
    window.clearTimeout(cursorTransitionTimer);
  }

  cursorTransitionTimer = window.setTimeout(() => {
    delete document.documentElement.dataset.publicTransitioning;
    cursorTransitionTimer = undefined;
  }, cursorTransitionDuration);
}

function clearCursorTransitioning() {
  if (cursorTransitionTimer) {
    window.clearTimeout(cursorTransitionTimer);
    cursorTransitionTimer = undefined;
  }

  delete document.documentElement.dataset.publicTransitioning;
}

if (typeof window !== "undefined") {
  const navigation = (window as unknown as { navigation?: NavigationLike }).navigation;

  if (navigation) {
    navigation.addEventListener("navigate", (event) => {
      const destinationUrl = event.destination ? new URL(event.destination.url) : null;
      pendingNavigation = {
        type: event.navigationType ?? "push",
        hasHash: destinationUrl ? destinationUrl.hash !== "" : false,
      };
    });
  } else {
    window.addEventListener("popstate", () => {
      pendingNavigation = { type: "traverse", hasHash: false };
    });
  }
}

function handlePageUpdate() {
  const { type, hasHash } = pendingNavigation;
  pendingNavigation = { type: "push", hasHash: false };
  setCursorTransitioning();

  if (type === "traverse" || hasHash) {
    return undefined;
  }

  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  return undefined;
}

// React's <ViewTransition> is Suspense-aware: on navigation it animates to the
// route's loading.tsx fallback immediately, instead of freezing on the old page
// until data is ready. That gives click -> fade out -> loading -> fade in.
export function PublicPageTransition({ children }: PublicPageTransitionProps) {
  useEffect(() => clearCursorTransitioning, []);

  useEffect(() => {
    let hashScrollFrame: number | null = null;
    let hashScrollRetryTimer: number | null = null;
    let hashScrollTimeout: number | null = null;
    let hashScrollObserver: MutationObserver | null = null;
    let handledLocation: string | null = null;

    const clearHashScrollWait = () => {
      if (hashScrollFrame !== null) {
        window.cancelAnimationFrame(hashScrollFrame);
        hashScrollFrame = null;
      }
      if (hashScrollRetryTimer !== null) {
        window.clearTimeout(hashScrollRetryTimer);
        hashScrollRetryTimer = null;
      }
      if (hashScrollTimeout !== null) {
        window.clearTimeout(hashScrollTimeout);
        hashScrollTimeout = null;
      }
      hashScrollObserver?.disconnect();
      hashScrollObserver = null;
    };

    const getHashTarget = () => {
      const hash = window.location.hash.slice(1);
      if (!hash) return null;

      try {
        return document.getElementById(decodeURIComponent(hash));
      } catch {
        return null;
      }
    };

    const getLocationKey = () =>
      `${window.location.pathname}${window.location.search}${window.location.hash}`;

    const scrollToHash = () => {
      hashScrollFrame = null;
      const hash = window.location.hash;
      const locationKey = getLocationKey();
      if (!hash) {
        clearHashScrollWait();
        handledLocation = null;
        return;
      }

      const target = getHashTarget();
      if (target?.getClientRects().length) {
        clearHashScrollWait();
        if (handledLocation === locationKey) return;
        handledLocation = locationKey;
        const headerHeight =
          document.querySelector<HTMLElement>("[data-public-header]")?.offsetHeight ?? 0;
        const issueNavigationHeight =
          document.querySelector<HTMLElement>("[data-public-issue-navigation]")?.offsetHeight ?? 0;
        window.scrollTo({
          top: Math.max(
            0,
            window.scrollY +
              target.getBoundingClientRect().top -
              headerHeight -
              issueNavigationHeight -
              16,
          ),
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        });
        return;
      }

      if (hashScrollRetryTimer === null) {
        hashScrollRetryTimer = window.setTimeout(() => {
          hashScrollRetryTimer = null;
          scheduleHashScroll();
        }, 100);
      }
    };

    const scheduleHashScroll = () => {
      if (hashScrollFrame !== null) return;
      hashScrollFrame = window.requestAnimationFrame(scrollToHash);
    };

    const startHashScrollWait = () => {
      clearHashScrollWait();
      handledLocation = null;
      hashScrollObserver = new MutationObserver(scheduleHashScroll);
      hashScrollObserver.observe(document.body, { childList: true, subtree: true });
      hashScrollTimeout = window.setTimeout(clearHashScrollWait, 10_000);
      scheduleHashScroll();
    };

    const handleHashChange = () => startHashScrollWait();
    const handleNavigation = () => {
      startHashScrollWait();
    };
    const navigation = (window as unknown as { navigation?: NavigationLike }).navigation;

    // PPR can commit the route before the fragment target is in the DOM.
    // Retrying after the commit preserves normal hash-link behavior.
    handleNavigation();
    window.addEventListener("hashchange", handleHashChange);
    if (navigation) {
      navigation.addEventListener("navigate", handleNavigation);
    } else {
      window.addEventListener("popstate", handleNavigation);
    }

    return () => {
      clearHashScrollWait();
      window.removeEventListener("hashchange", handleHashChange);
      if (navigation) {
        navigation.removeEventListener("navigate", handleNavigation);
      } else {
        window.removeEventListener("popstate", handleNavigation);
      }
    };
  }, []);

  return (
    <ViewTransition update="page-transition" default="none" onUpdate={handlePageUpdate}>
      <div className="flex min-h-0 w-full max-w-full flex-1 flex-col overflow-x-clip">
        {children}
      </div>
    </ViewTransition>
  );
}
