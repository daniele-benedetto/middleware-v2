"use client";

import { ViewTransition, type ReactNode } from "react";

type PublicPageTransitionProps = {
  children: ReactNode;
};

export function PublicPageTransition({ children }: PublicPageTransitionProps) {
  return (
    <ViewTransition update="page-transition" default="none">
      <div className="flex min-h-svh w-full max-w-full flex-1 flex-col overflow-x-clip">
        {children}
      </div>
    </ViewTransition>
  );
}
