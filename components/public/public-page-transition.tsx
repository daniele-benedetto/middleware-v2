"use client";

import { ViewTransition, type ReactNode } from "react";

type PublicPageTransitionProps = {
  children: ReactNode;
};

function handlePageUpdate() {
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

export function PublicPageTransition({ children }: PublicPageTransitionProps) {
  return (
    <ViewTransition update="page-transition" default="none" onUpdate={handlePageUpdate}>
      <div className="flex min-h-svh w-full max-w-full flex-1 flex-col overflow-x-clip">
        {children}
      </div>
    </ViewTransition>
  );
}
