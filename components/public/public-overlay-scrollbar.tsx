"use client";

import { useEffect, useRef } from "react";

type ScrollTarget = HTMLElement | Window;

const MIN_THUMB_HEIGHT = 44;
const SCROLLBAR_HIDE_DELAY_MS = 700;

function getScrollTarget(): ScrollTarget {
  return document.querySelector<HTMLElement>(".public-menu-overlay") ?? window;
}

function getScrollMetrics(target: ScrollTarget) {
  if (target instanceof Window) {
    const root = document.documentElement;

    return {
      scrollTop: window.scrollY,
      scrollHeight: root.scrollHeight,
      viewportHeight: window.innerHeight,
    };
  }

  return {
    scrollTop: target.scrollTop,
    scrollHeight: target.scrollHeight,
    viewportHeight: target.clientHeight,
  };
}

export function PublicOverlayScrollbar() {
  const rootRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const thumb = thumbRef.current;

    if (!root || !thumb) {
      return;
    }

    let frameId: number | null = null;
    let hideTimerId: number | null = null;
    let activeTarget: ScrollTarget | null = null;

    const update = () => {
      frameId = null;

      const target = getScrollTarget();
      const { scrollTop, scrollHeight, viewportHeight } = getScrollMetrics(target);
      const scrollable = scrollHeight - viewportHeight;

      root.dataset.active = scrollable > 1 ? "true" : "false";
      root.dataset.menu = target instanceof HTMLElement ? "true" : "false";

      if (scrollable <= 1) {
        return;
      }

      const thumbHeight = Math.max(
        MIN_THUMB_HEIGHT,
        Math.round((viewportHeight / scrollHeight) * viewportHeight),
      );
      const maxTop = viewportHeight - thumbHeight;
      const thumbTop = Math.round((scrollTop / scrollable) * maxTop);

      thumb.style.height = `${thumbHeight}px`;
      thumb.style.transform = `translate3d(0, ${thumbTop}px, 0)`;
    };

    const requestUpdate = () => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(update);
      }
    };

    const reveal = () => {
      root.dataset.visible = "true";
      requestUpdate();

      if (hideTimerId !== null) {
        window.clearTimeout(hideTimerId);
      }

      hideTimerId = window.setTimeout(() => {
        root.dataset.visible = "false";
        hideTimerId = null;
      }, SCROLLBAR_HIDE_DELAY_MS);
    };

    const bindTarget = () => {
      const nextTarget = getScrollTarget();

      if (nextTarget === activeTarget) {
        requestUpdate();
        return;
      }

      activeTarget?.removeEventListener("scroll", reveal);
      activeTarget = nextTarget;
      activeTarget.addEventListener("scroll", reveal, { passive: true });
      requestUpdate();
    };

    const observer = new MutationObserver(bindTarget);

    bindTarget();
    window.addEventListener("resize", requestUpdate);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      activeTarget?.removeEventListener("scroll", reveal);
      window.removeEventListener("resize", requestUpdate);

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      if (hideTimerId !== null) {
        window.clearTimeout(hideTimerId);
      }
    };
  }, []);

  return (
    <div ref={rootRef} className="public-overlay-scrollbar" aria-hidden="true">
      <div ref={thumbRef} className="public-overlay-scrollbar-thumb" />
    </div>
  );
}
