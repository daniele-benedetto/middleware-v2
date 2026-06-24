"use client";

import { ViewTransition, useEffect, useRef, type ReactNode } from "react";

type PublicPageTransitionProps = {
  children: ReactNode;
};

export function PublicPageTransition({ children }: PublicPageTransitionProps) {
  // Back/forward navigations fire `popstate`; for those we let the browser
  // restore the previous scroll position instead of forcing scroll-to-top.
  const isPopNavigationRef = useRef(false);

  useEffect(() => {
    function markPopNavigation() {
      isPopNavigationRef.current = true;
    }

    window.addEventListener("popstate", markPopNavigation);
    return () => window.removeEventListener("popstate", markPopNavigation);
  }, []);

  function handlePageUpdate() {
    if (isPopNavigationRef.current) {
      isPopNavigationRef.current = false;
      return undefined;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const root = document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;

    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.style.scrollBehavior = previousScrollBehavior;

    return undefined;
  }

  return (
    <ViewTransition update="page-transition" default="none" onUpdate={handlePageUpdate}>
      <div className="flex min-h-svh w-full max-w-full flex-1 flex-col overflow-x-clip">
        {children}
      </div>
    </ViewTransition>
  );
}
