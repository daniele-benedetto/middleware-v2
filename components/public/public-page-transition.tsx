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

  return (
    <ViewTransition update="page-transition" default="none" onUpdate={handlePageUpdate}>
      <div className="flex min-h-svh w-full max-w-full flex-1 flex-col overflow-x-clip">
        {children}
      </div>
    </ViewTransition>
  );
}
