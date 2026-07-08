"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

function shouldPreventSmoothScroll(node: HTMLElement) {
  return Boolean(node.closest(".public-menu-overlay, [data-lenis-prevent]"));
}

export function PublicSmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (prefersReducedMotion.matches) {
      return;
    }

    const lenis = new Lenis({
      anchors: true,
      duration: 0.95,
      lerp: 0.08,
      prevent: shouldPreventSmoothScroll,
      smoothWheel: true,
      stopInertiaOnNavigate: true,
      syncTouch: false,
      touchMultiplier: 1,
      wheelMultiplier: 0.85,
    });
    lenisRef.current = lenis;

    let frameId: number | null = null;

    const raf = (time: number) => {
      lenis.raf(time);
      frameId = window.requestAnimationFrame(raf);
    };

    const syncMenuState = () => {
      if (document.querySelector(".public-menu-overlay")) {
        lenis.stop();
      } else {
        lenis.start();
        lenis.resize();
      }
    };

    const observer = new MutationObserver(syncMenuState);

    frameId = window.requestAnimationFrame(raf);
    observer.observe(document.body, { childList: true, subtree: true });
    syncMenuState();

    return () => {
      observer.disconnect();

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      lenisRef.current?.resize();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [pathname]);

  return null;
}
