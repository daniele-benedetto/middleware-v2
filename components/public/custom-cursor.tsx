"use client";

import { useEffect } from "react";

const interactiveSelector = [
  "a[href]",
  "button:not(:disabled)",
  "[role='button']",
  "[data-cursor-hover]",
  "summary",
].join(",");

function canUseCustomCursor() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function CustomCursor() {
  useEffect(() => {
    const root = document.createElement("div");
    const ring = document.createElement("div");
    const dot = document.createElement("div");

    root.className = "custom-cursor";
    root.setAttribute("aria-hidden", "true");
    ring.className = "custom-cursor__ring";
    dot.className = "custom-cursor__dot";
    root.append(ring, dot);
    document.body.appendChild(root);

    if (!canUseCustomCursor()) {
      return () => {
        root.remove();
      };
    }

    const cursorRoot = root;
    const cursorDot = dot;
    const cursorRing = ring;

    let rafId = 0;
    let isVisible = false;
    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const follower = { x: pointer.x, y: pointer.y };

    function setVisible(value: boolean) {
      isVisible = value;
      cursorRoot.dataset.visible = value ? "true" : "false";
    }

    function setHover(target: EventTarget | null) {
      const element = target instanceof Element ? target : null;
      const interactive = element?.closest(interactiveSelector);
      const disabled = interactive?.matches("[aria-disabled='true'], [disabled]") ?? false;

      cursorRoot.dataset.hover = interactive && !disabled ? "true" : "false";
    }

    function animate() {
      follower.x += (pointer.x - follower.x) * 0.18;
      follower.y += (pointer.y - follower.y) * 0.18;

      cursorDot.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) translate(-50%, -50%)`;
      cursorRing.style.transform = `translate3d(${follower.x}px, ${follower.y}px, 0) translate(-50%, -50%)`;

      rafId = window.requestAnimationFrame(animate);
    }

    function onPointerMove(event: PointerEvent) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;

      if (!isVisible) {
        follower.x = pointer.x;
        follower.y = pointer.y;
        setVisible(true);
      }

      setHover(event.target);
    }

    function onPointerDown() {
      cursorRoot.dataset.pressed = "true";
    }

    function onPointerUp() {
      cursorRoot.dataset.pressed = "false";
    }

    function onPointerLeave() {
      setVisible(false);
      cursorRoot.dataset.hover = "false";
      cursorRoot.dataset.pressed = "false";
    }

    cursorRoot.dataset.visible = "false";
    cursorRoot.dataset.hover = "false";
    cursorRoot.dataset.pressed = "false";
    document.documentElement.classList.add("public-custom-cursor-active");
    rafId = window.requestAnimationFrame(animate);

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave, { passive: true });

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.documentElement.classList.remove("public-custom-cursor-active");
      cursorRoot.remove();
    };
  }, []);

  return null;
}
