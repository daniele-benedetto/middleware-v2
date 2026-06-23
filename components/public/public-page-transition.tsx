"use client";

import { ViewTransition, type ReactNode } from "react";

type PublicPageTransitionProps = {
  children: ReactNode;
};

function handlePageUpdate() {
  const root = document.documentElement;
  const body = document.body;
  const previousScrollBehavior = root.style.scrollBehavior;
  const previousRootOverflow = root.style.overflow;
  const previousBodyOverflow = body.style.overflow;

  root.style.overflow = "hidden";
  body.style.overflow = "hidden";
  root.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  root.style.scrollBehavior = previousScrollBehavior;

  return () => {
    root.style.overflow = previousRootOverflow;
    body.style.overflow = previousBodyOverflow;
  };
}

export function PublicPageTransition({ children }: PublicPageTransitionProps) {
  return (
    <ViewTransition update="page-transition" default="none" onUpdate={handlePageUpdate}>
      <div className="flex min-h-svh flex-1 flex-col">{children}</div>
    </ViewTransition>
  );
}
