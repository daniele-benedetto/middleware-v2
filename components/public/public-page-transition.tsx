"use client";

import { ViewTransition, type ReactNode } from "react";

type PublicPageTransitionProps = {
  children: ReactNode;
};

export function PublicPageTransition({ children }: PublicPageTransitionProps) {
  return (
    <ViewTransition name="public-page-content" default="none">
      {children}
    </ViewTransition>
  );
}
