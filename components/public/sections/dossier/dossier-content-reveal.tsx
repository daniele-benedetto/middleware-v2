"use client";

import { useEffect, useState } from "react";

import type { ReactNode } from "react";

type DossierContentRevealProps = {
  children: ReactNode;
};

const revealDelay = 520;

export function DossierContentReveal({ children }: DossierContentRevealProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timerId = window.setTimeout(() => setVisible(true), revealDelay);
    return () => window.clearTimeout(timerId);
  }, []);

  return <div data-dossier-content-reveal={visible ? "visible" : "pending"}>{children}</div>;
}
