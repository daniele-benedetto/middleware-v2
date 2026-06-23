"use client";

import { ViewTransition, type ReactNode } from "react";

type PublicPageTransitionProps = {
  children: ReactNode;
};

function handlePageUpdate() {
  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;
  const stopScroll = (event: Event) => event.preventDefault();
  const stopScrollKeys = (event: KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp", " "].includes(event.key)) {
      event.preventDefault();
    }
  };

  window.addEventListener("wheel", stopScroll, { passive: false });
  window.addEventListener("touchmove", stopScroll, { passive: false });
  window.addEventListener("keydown", stopScrollKeys);
  root.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  root.style.scrollBehavior = previousScrollBehavior;

  return () => {
    window.removeEventListener("wheel", stopScroll);
    window.removeEventListener("touchmove", stopScroll);
    window.removeEventListener("keydown", stopScrollKeys);
  };
}

export function PublicPageTransition({ children }: PublicPageTransitionProps) {
  return (
    <ViewTransition update="page-transition" default="none" onUpdate={handlePageUpdate}>
      <div className="flex min-h-svh w-full max-w-full flex-1 flex-col overflow-x-clip">
        {children}
      </div>
    </ViewTransition>
  );
}
